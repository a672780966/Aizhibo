import { describe, expect, it } from 'vitest';
import { openDatabase } from './db.js';
import {
  deleteExpiredHostViewerMemory,
  getHostViewerMemory,
  upsertHostViewerMemory,
} from './hostViewerMemory.js';

describe('hostViewerMemory', () => {
  it('reads back a note after upserting a new platform and viewer id', () => {
    const db = openDatabase(':memory:');
    upsertHostViewerMemory(db, {
      platform: 'twitch',
      viewerId: 'viewer-1',
      note: 'first note',
    });
    expect(getHostViewerMemory(db, 'twitch', 'viewer-1')).toEqual({
      platform: 'twitch',
      viewerId: 'viewer-1',
      note: 'first note',
    });
  });

  it('updates the note on a second upsert of the same platform and viewer id', () => {
    const db = openDatabase(':memory:');
    upsertHostViewerMemory(db, {
      platform: 'twitch',
      viewerId: 'viewer-1',
      note: 'first note',
    });
    upsertHostViewerMemory(db, {
      platform: 'twitch',
      viewerId: 'viewer-1',
      note: 'updated note',
    });
    expect(getHostViewerMemory(db, 'twitch', 'viewer-1')?.note).toBe('updated note');
  });

  it('returns undefined for an unknown platform and viewer id', () => {
    const db = openDatabase(':memory:');
    expect(getHostViewerMemory(db, 'twitch', 'nobody')).toBeUndefined();
  });

  it('deletes only records older than the cutoff, keeping newer ones', () => {
    const db = openDatabase(':memory:');
    upsertHostViewerMemory(db, {
      platform: 'twitch',
      viewerId: 'old-viewer',
      note: 'old',
    });
    upsertHostViewerMemory(db, {
      platform: 'twitch',
      viewerId: 'recent-viewer',
      note: 'recent',
    });
    db.prepare(
      `UPDATE host_viewer_memory SET last_seen_at = '2000-01-01T00:00:00.000Z'
       WHERE viewer_id = 'old-viewer'`,
    ).run();
    const recent = db
      .prepare(`SELECT last_seen_at FROM host_viewer_memory WHERE viewer_id = 'recent-viewer'`)
      .get() as { last_seen_at: string };
    deleteExpiredHostViewerMemory(db, 'twitch', recent.last_seen_at);
    expect(getHostViewerMemory(db, 'twitch', 'old-viewer')).toBeUndefined();
    expect(getHostViewerMemory(db, 'twitch', 'recent-viewer')?.note).toBe('recent');
  });

  it('deletes expired records only within the given platform', () => {
    const db = openDatabase(':memory:');
    upsertHostViewerMemory(db, {
      platform: 'twitch',
      viewerId: 'viewer-1',
      note: 'twitch note',
    });
    upsertHostViewerMemory(db, {
      platform: 'youtube',
      viewerId: 'viewer-1',
      note: 'youtube note',
    });
    db.prepare(
      `UPDATE host_viewer_memory SET last_seen_at = '2000-01-01T00:00:00.000Z'
       WHERE platform IN ('twitch', 'youtube')`,
    ).run();
    deleteExpiredHostViewerMemory(db, 'twitch', '2020-01-01T00:00:00.000Z');
    expect(getHostViewerMemory(db, 'twitch', 'viewer-1')).toBeUndefined();
    expect(getHostViewerMemory(db, 'youtube', 'viewer-1')?.note).toBe('youtube note');
  });
});
