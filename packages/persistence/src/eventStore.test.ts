import { describe, expect, it } from 'vitest';
import type { RuntimeEvent } from '@interactive-story/runtime-kernel';
import { openDatabase } from './db.js';
import { appendEvents, loadEvents } from './eventStore.js';

describe('eventStore', () => {
  it('round-trips events in sequence order', () => {
    const db = openDatabase(':memory:');
    const events: RuntimeEvent[] = [
      {
        id: 'ev-2',
        sequence: 2,
        timestamp: '2026-01-01T00:00:02.000Z',
        type: 'SECOND',
        payload: { nested: ['value'] },
        chapterId: 'ch-1',
        sessionId: 's-1',
        visibility: 'HIDDEN',
      },
      {
        id: 'ev-1',
        sequence: 1,
        timestamp: '2026-01-01T00:00:01.000Z',
        type: 'FIRST',
        payload: { ok: true },
        chapterId: 'ch-1',
        sessionId: 's-1',
        visibility: 'PUBLIC',
      },
    ];
    appendEvents(db, 's-1', events);
    expect(loadEvents(db, 's-1')).toEqual([events[1], events[0]]);
  });
});
