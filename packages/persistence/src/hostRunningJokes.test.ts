import { describe, expect, it } from 'vitest';
import { openDatabase } from './db.js';
import {
  addHostRunningJoke,
  deleteExpiredHostRunningJokes,
  listHostRunningJokes,
} from './hostRunningJokes.js';

describe('hostRunningJokes', () => {
  it('reads back a joke after adding it for a platform', () => {
    const db = openDatabase(':memory:');
    addHostRunningJoke(db, {
      id: 'joke-1',
      platform: 'twitch',
      text: 'hello world',
    });
    expect(listHostRunningJokes(db, 'twitch')).toEqual([
      { id: 'joke-1', platform: 'twitch', text: 'hello world' },
    ]);
  });

  it('lists jokes for a platform ordered by created_at, not insertion order', () => {
    const db = openDatabase(':memory:');
    addHostRunningJoke(db, {
      id: 'joke-1',
      platform: 'twitch',
      text: 'first joke',
    });
    addHostRunningJoke(db, {
      id: 'joke-2',
      platform: 'twitch',
      text: 'second joke',
    });
    addHostRunningJoke(db, {
      id: 'joke-3',
      platform: 'twitch',
      text: 'third joke',
    });
    // Reverse created_at relative to insertion order: joke-1 was inserted first
    // but is made the newest, joke-3 was inserted last but is made the oldest.
    db.prepare(
      `UPDATE host_running_jokes SET created_at = '2000-01-03T00:00:00.000Z'
       WHERE id = 'joke-1'`,
    ).run();
    db.prepare(
      `UPDATE host_running_jokes SET created_at = '2000-01-02T00:00:00.000Z'
       WHERE id = 'joke-2'`,
    ).run();
    db.prepare(
      `UPDATE host_running_jokes SET created_at = '2000-01-01T00:00:00.000Z'
       WHERE id = 'joke-3'`,
    ).run();
    expect(listHostRunningJokes(db, 'twitch').map((entry) => entry.text)).toEqual([
      'third joke',
      'second joke',
      'first joke',
    ]);
  });

  it('returns only jokes for the requested platform', () => {
    const db = openDatabase(':memory:');
    addHostRunningJoke(db, {
      id: 'joke-1',
      platform: 'twitch',
      text: 'twitch joke',
    });
    addHostRunningJoke(db, {
      id: 'joke-2',
      platform: 'youtube',
      text: 'youtube joke',
    });
    const twitchJokes = listHostRunningJokes(db, 'twitch');
    expect(twitchJokes.map((entry) => entry.text)).toEqual(['twitch joke']);
    expect(twitchJokes.some((entry) => entry.text === 'youtube joke')).toBe(false);
  });

  it('deletes only records older than the cutoff, keeping newer ones', () => {
    const db = openDatabase(':memory:');
    addHostRunningJoke(db, {
      id: 'joke-1',
      platform: 'twitch',
      text: 'old joke',
    });
    addHostRunningJoke(db, {
      id: 'joke-2',
      platform: 'twitch',
      text: 'recent joke',
    });
    db.prepare(
      `UPDATE host_running_jokes SET created_at = '2000-01-01T00:00:00.000Z'
       WHERE id = 'joke-1'`,
    ).run();
    const recent = db
      .prepare(`SELECT created_at FROM host_running_jokes WHERE id = 'joke-2'`)
      .get() as { created_at: string };
    deleteExpiredHostRunningJokes(db, 'twitch', recent.created_at);
    expect(listHostRunningJokes(db, 'twitch').map((entry) => entry.text)).toEqual(['recent joke']);
  });

  it('deletes expired records only within the given platform', () => {
    const db = openDatabase(':memory:');
    addHostRunningJoke(db, {
      id: 'joke-1',
      platform: 'twitch',
      text: 'twitch joke',
    });
    addHostRunningJoke(db, {
      id: 'joke-2',
      platform: 'youtube',
      text: 'youtube joke',
    });
    db.prepare(
      `UPDATE host_running_jokes SET created_at = '2000-01-01T00:00:00.000Z'
       WHERE platform IN ('twitch', 'youtube')`,
    ).run();
    deleteExpiredHostRunningJokes(db, 'twitch', '2020-01-01T00:00:00.000Z');
    expect(listHostRunningJokes(db, 'twitch').map((entry) => entry.text)).toEqual([]);
    expect(listHostRunningJokes(db, 'youtube').map((entry) => entry.text)).toEqual([
      'youtube joke',
    ]);
  });
});
