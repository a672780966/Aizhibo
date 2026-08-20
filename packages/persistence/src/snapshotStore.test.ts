import { describe, expect, it } from 'vitest';
import { openDatabase } from './db.js';
import { loadLatestSnapshot, saveSnapshot } from './snapshotStore.js';

describe('snapshotStore', () => {
  it('loads the latest persisted snapshot by sequence', () => {
    const db = openDatabase(':memory:');
    saveSnapshot(db, 's-1', 1, { phase: 'BOOT' }, 'ch-1');
    saveSnapshot(db, 's-1', 3, { phase: 'END' }, 'ch-1');
    saveSnapshot(db, 's-1', 2, { phase: 'MIDDLE' }, 'ch-1');
    expect(loadLatestSnapshot(db, 's-1')).toMatchObject({
      sessionId: 's-1',
      sequence: 3,
      persisted: { phase: 'END' },
      chapterId: 'ch-1',
    });
    expect(loadLatestSnapshot(db, 'missing')).toBeUndefined();
  });
});
