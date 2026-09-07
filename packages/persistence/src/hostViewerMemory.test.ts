import { describe, expect, it } from 'vitest';
import { openDatabase } from './db.js';
import {
  deleteExpiredHostViewerMemory,
  getHostViewerMemory,
  upsertHostViewerMemory,
} from './hostViewerMemory.js';

const fullEntry = {
  platform: 'twitch',
  viewerId: 'viewer-1',
  nickname: 'Bob',
  interactionCount: 1,
  knownRunningJokes: ['joke one', 'joke two'],
  hostAffinity: 5,
  notableEvents: ['event one', 'event two'],
};

describe('hostViewerMemory', () => {
  it('reads back a full entry after upserting a new platform and viewer id', () => {
    const db = openDatabase(':memory:');
    upsertHostViewerMemory(db, fullEntry);
    expect(getHostViewerMemory(db, 'twitch', 'viewer-1')).toEqual(fullEntry);
  });

  it('overwrites all fields except platform and viewer id on a second upsert', () => {
    const db = openDatabase(':memory:');
    upsertHostViewerMemory(db, fullEntry);
    const updatedEntry = {
      ...fullEntry,
      nickname: 'Alice',
      interactionCount: 2,
      knownRunningJokes: ['new joke'],
      hostAffinity: 9,
      notableEvents: ['new event'],
    };
    upsertHostViewerMemory(db, updatedEntry);
    expect(getHostViewerMemory(db, 'twitch', 'viewer-1')).toEqual(updatedEntry);
  });

  it('keeps created_at and refreshes last_seen_at on a second upsert', () => {
    const db = openDatabase(':memory:');
    upsertHostViewerMemory(db, fullEntry);
    const firstWrite = db
      .prepare(
        `SELECT created_at, last_seen_at FROM host_viewer_memory
         WHERE platform = ? AND viewer_id = ?`,
      )
      .get('twitch', 'viewer-1') as { created_at: string; last_seen_at: string };
    db.prepare(
      `UPDATE host_viewer_memory SET last_seen_at = '1999-01-01T00:00:00.000Z' WHERE platform = ? AND viewer_id = ?`,
    ).run('twitch', 'viewer-1');
    upsertHostViewerMemory(db, { ...fullEntry, interactionCount: 2 });
    const secondWrite = db
      .prepare(
        `SELECT created_at, last_seen_at FROM host_viewer_memory
         WHERE platform = ? AND viewer_id = ?`,
      )
      .get('twitch', 'viewer-1') as { created_at: string; last_seen_at: string };
    expect(secondWrite.created_at).toBe(firstWrite.created_at);
    expect(secondWrite.last_seen_at).not.toBe('1999-01-01T00:00:00.000Z');
  });

  it('leaves nickname undefined when upserting without one', () => {
    const db = openDatabase(':memory:');
    const entryWithoutNickname = {
      platform: fullEntry.platform,
      viewerId: fullEntry.viewerId,
      interactionCount: fullEntry.interactionCount,
      knownRunningJokes: fullEntry.knownRunningJokes,
      hostAffinity: fullEntry.hostAffinity,
      notableEvents: fullEntry.notableEvents,
    };
    upsertHostViewerMemory(db, entryWithoutNickname);
    expect(getHostViewerMemory(db, 'twitch', 'viewer-1')?.nickname).toBeUndefined();
  });

  it('returns undefined for an unknown platform and viewer id', () => {
    const db = openDatabase(':memory:');
    expect(getHostViewerMemory(db, 'twitch', 'nobody')).toBeUndefined();
  });

  it('deletes only records older than the cutoff, keeping newer ones', () => {
    const db = openDatabase(':memory:');
    upsertHostViewerMemory(db, { ...fullEntry, viewerId: 'old-viewer' });
    upsertHostViewerMemory(db, { ...fullEntry, viewerId: 'recent-viewer' });
    db.prepare(
      `UPDATE host_viewer_memory SET last_seen_at = '2000-01-01T00:00:00.000Z'
       WHERE viewer_id = 'old-viewer'`,
    ).run();
    const recent = db
      .prepare(`SELECT last_seen_at FROM host_viewer_memory WHERE viewer_id = 'recent-viewer'`)
      .get() as { last_seen_at: string };
    deleteExpiredHostViewerMemory(db, 'twitch', recent.last_seen_at);
    expect(getHostViewerMemory(db, 'twitch', 'old-viewer')).toBeUndefined();
    expect(getHostViewerMemory(db, 'twitch', 'recent-viewer')).toEqual({
      ...fullEntry,
      viewerId: 'recent-viewer',
    });
  });

  it('deletes expired records only within the given platform', () => {
    const db = openDatabase(':memory:');
    upsertHostViewerMemory(db, fullEntry);
    upsertHostViewerMemory(db, { ...fullEntry, platform: 'youtube' });
    db.prepare(
      `UPDATE host_viewer_memory SET last_seen_at = '2000-01-01T00:00:00.000Z'
       WHERE platform IN ('twitch', 'youtube')`,
    ).run();
    deleteExpiredHostViewerMemory(db, 'twitch', '2020-01-01T00:00:00.000Z');
    expect(getHostViewerMemory(db, 'twitch', 'viewer-1')).toBeUndefined();
    expect(getHostViewerMemory(db, 'youtube', 'viewer-1')).toEqual({
      ...fullEntry,
      platform: 'youtube',
    });
  });
});
