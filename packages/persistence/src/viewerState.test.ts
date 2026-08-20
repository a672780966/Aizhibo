import { describe, expect, it } from 'vitest';
import { openDatabase } from './db.js';
import { getViewerState, upsertViewerState, type ViewerState } from './viewerState.js';

describe('viewerState', () => {
  it('upserts by platform and viewer id without changing created_at', () => {
    const db = openDatabase(':memory:');
    const first: ViewerState = {
      platform: 'twitch',
      viewerId: 'viewer-1',
      hp: 3,
      life: 2,
      alive: true,
      participationCount: 1,
      joinedChapterAt: 10,
    };
    upsertViewerState(db, first);
    const createdAt = String(
      (
        db
          .prepare('SELECT created_at FROM viewer_states WHERE platform = ? AND viewer_id = ?')
          .get('twitch', 'viewer-1') as { created_at: string }
      ).created_at,
    );
    upsertViewerState(db, { ...first, hp: 1, lastChoice: 'A', participationCount: 2 });
    const row = db
      .prepare(
        'SELECT created_at, last_seen_at FROM viewer_states WHERE platform = ? AND viewer_id = ?',
      )
      .get('twitch', 'viewer-1') as { created_at: string; last_seen_at: string };
    expect(row.created_at).toBe(createdAt);
    expect(row.last_seen_at).toBeTruthy();
    expect(getViewerState(db, 'twitch', 'viewer-1')).toEqual({
      ...first,
      hp: 1,
      lastChoice: 'A',
      participationCount: 2,
    });
  });
});
