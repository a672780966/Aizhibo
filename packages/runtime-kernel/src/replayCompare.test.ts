import { describe, expect, it } from 'vitest';
import type { RuntimeEvent } from './event.js';
import { compareEventLogs } from './replayCompare.js';

function event(payload: unknown, sequence: number): RuntimeEvent {
  return {
    id: `ev-${sequence}`,
    sequence,
    timestamp: '2026-01-01T00:00:00.000Z',
    type: 'TEST',
    payload,
    chapterId: 'ch-1',
    sessionId: 's-1',
    visibility: 'PUBLIC',
  };
}

describe('compareEventLogs', () => {
  it('ignores id and timestamp but detects deep payload divergence', () => {
    const first = event({ nested: [1, 2] }, 1);
    const expected = [first];
    const actual: RuntimeEvent[] = [
      { ...first, id: 'different', timestamp: '2027-01-01T00:00:00.000Z' },
    ];
    expect(compareEventLogs(expected, actual)).toEqual([]);

    const changed: RuntimeEvent[] = [{ ...actual[0]!, payload: { nested: [1, 3] } }];
    expect(compareEventLogs(expected, changed)).toEqual([
      {
        index: 0,
        field: 'payload',
        expected: { nested: [1, 2] },
        actual: { nested: [1, 3] },
      },
    ]);
  });

  it('reports length divergence', () => {
    expect(compareEventLogs([event({}, 1)], [])).toEqual([
      { index: 0, field: 'type', expected: event({}, 1), actual: '<missing>' },
    ]);
  });
});
