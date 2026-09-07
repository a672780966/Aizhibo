import { describe, expect, it } from 'vitest';
import { openDatabase } from '@interactive-story/persistence';
import { createHostMemory } from './hostMemory.js';

describe('createHostMemory', () => {
  it('recalls a full viewer entry after remembering it', () => {
    const memory = createHostMemory(openDatabase(':memory:'));
    const entry = {
      platform: 'twitch',
      viewerId: 'viewer-1',
      nickname: 'viewer one',
      interactionCount: 1,
      knownRunningJokes: ['hello world'],
      hostAffinity: 5,
      notableEvents: ['said hi'],
    };
    memory.rememberViewer(entry);
    expect(memory.recallViewer('twitch', 'viewer-1')).toEqual(entry);
  });

  it('returns undefined for a viewer that was never remembered', () => {
    const memory = createHostMemory(openDatabase(':memory:'));
    expect(memory.recallViewer('twitch', 'nobody')).toBeUndefined();
  });

  it('lists a running joke after adding it', () => {
    const memory = createHostMemory(openDatabase(':memory:'));
    memory.addRunningJoke('twitch', 'joke-1', 'hello world');
    expect(memory.listRunningJokes('twitch')).toEqual([
      { id: 'joke-1', platform: 'twitch', text: 'hello world' },
    ]);
  });

  it('purge deletes expired records only for listed platforms', () => {
    const db = openDatabase(':memory:');
    const memory = createHostMemory(db);
    memory.rememberViewer({
      platform: 'twitch',
      viewerId: 'viewer-1',
      nickname: 'twitch viewer',
      interactionCount: 1,
      knownRunningJokes: [],
      hostAffinity: 5,
      notableEvents: [],
    });
    memory.rememberViewer({
      platform: 'youtube',
      viewerId: 'viewer-1',
      nickname: 'youtube viewer',
      interactionCount: 1,
      knownRunningJokes: [],
      hostAffinity: 5,
      notableEvents: [],
    });
    db.prepare(
      `UPDATE host_viewer_memory SET last_seen_at = '2000-01-01T00:00:00.000Z'
       WHERE platform IN ('twitch', 'youtube')`,
    ).run();
    memory.purge({ twitch: 1000 });
    expect(memory.recallViewer('twitch', 'viewer-1')).toBeUndefined();
    expect(memory.recallViewer('youtube', 'viewer-1')).toEqual({
      platform: 'youtube',
      viewerId: 'viewer-1',
      nickname: 'youtube viewer',
      interactionCount: 1,
      knownRunningJokes: [],
      hostAffinity: 5,
      notableEvents: [],
    });
  });

  it("purge honors each listed platform's own retention, even for an equally old record", () => {
    const db = openDatabase(':memory:');
    const memory = createHostMemory(db);
    memory.rememberViewer({
      platform: 'twitch',
      viewerId: 'viewer-1',
      nickname: 'twitch viewer',
      interactionCount: 1,
      knownRunningJokes: [],
      hostAffinity: 5,
      notableEvents: [],
    });
    memory.rememberViewer({
      platform: 'youtube',
      viewerId: 'viewer-1',
      nickname: 'youtube viewer',
      interactionCount: 1,
      knownRunningJokes: [],
      hostAffinity: 5,
      notableEvents: [],
    });
    db.prepare(
      `UPDATE host_viewer_memory SET last_seen_at = '2000-01-01T00:00:00.000Z'
       WHERE platform IN ('twitch', 'youtube')`,
    ).run();
    memory.purge({ twitch: 1000, youtube: 999999999999 });
    expect(memory.recallViewer('twitch', 'viewer-1')).toBeUndefined();
    expect(memory.recallViewer('youtube', 'viewer-1')).toEqual({
      platform: 'youtube',
      viewerId: 'viewer-1',
      nickname: 'youtube viewer',
      interactionCount: 1,
      knownRunningJokes: [],
      hostAffinity: 5,
      notableEvents: [],
    });
  });

  it('purge also removes expired running jokes for the listed platforms', () => {
    const db = openDatabase(':memory:');
    const memory = createHostMemory(db);
    memory.addRunningJoke('twitch', 'joke-1', 'stale joke');
    db.prepare(
      `UPDATE host_running_jokes SET created_at = '2000-01-01T00:00:00.000Z'
       WHERE platform = 'twitch'`,
    ).run();
    memory.purge({ twitch: 1000 });
    expect(memory.listRunningJokes('twitch')).toEqual([]);
  });

  it('reports OK from getHealth on a healthy database', () => {
    const memory = createHostMemory(openDatabase(':memory:'));
    expect(memory.getHealth().status).toBe('OK');
  });
});
