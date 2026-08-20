import { describe, expect, it } from 'vitest';
import { openDatabase } from './db.js';
import { createSession, endSession, getSession } from './sessionStore.js';

describe('sessionStore', () => {
  it('creates, reads, and ends a session', () => {
    const db = openDatabase(':memory:');
    const created = createSession(db, {
      sessionId: 's-1',
      chapterId: 'chapter-1',
      seed: 'seed-1',
      startedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(created.status).toBe('ACTIVE');
    expect(getSession(db, 's-1')).toEqual(created);
    endSession(db, 's-1');
    expect(getSession(db, 's-1')?.status).toBe('ENDED');
    expect(getSession(db, 'missing')).toBeUndefined();
  });
});
