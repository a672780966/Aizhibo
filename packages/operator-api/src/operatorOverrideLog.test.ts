import { describe, expect, it } from 'vitest';
import { loadEvents, openDatabase } from '@interactive-story/persistence';
import { appendOperatorOverrideEvent } from './operatorOverrideLog.js';

function setup() {
  const db = openDatabase(':memory:');
  return { db };
}

describe('appendOperatorOverrideEvent', () => {
  it('writes sequence 1, type OPERATOR_OVERRIDE, visibility HIDDEN, and the given payload on a fresh session', () => {
    const { db } = setup();
    const event = appendOperatorOverrideEvent(db, {
      sessionId: 's-1',
      chapterId: 'ch-1',
      action: 'MUTE_HOST',
      detail: 'host permission set to MUTED',
    });
    expect(event.sequence).toBe(1);
    expect(event.type).toBe('OPERATOR_OVERRIDE');
    expect(event.visibility).toBe('HIDDEN');
    expect(event.id).toBe('op-1');
    expect(event.sessionId).toBe('s-1');
    expect(event.chapterId).toBe('ch-1');
    expect(event.payload).toEqual({
      action: 'MUTE_HOST',
      detail: 'host permission set to MUTED',
    });
  });

  it('produces strictly increasing, non-duplicated sequence numbers across calls on the same session', () => {
    const { db } = setup();
    const first = appendOperatorOverrideEvent(db, {
      sessionId: 's-1',
      chapterId: 'ch-1',
      action: 'MUTE_HOST',
      detail: 'first',
    });
    const second = appendOperatorOverrideEvent(db, {
      sessionId: 's-1',
      chapterId: 'ch-1',
      action: 'UNMUTE_HOST',
      detail: 'second',
    });
    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(second.sequence).toBeGreaterThan(first.sequence);
  });

  it('persists both events, readable back in order via loadEvents', () => {
    const { db } = setup();
    appendOperatorOverrideEvent(db, {
      sessionId: 's-1',
      chapterId: 'ch-1',
      action: 'MUTE_HOST',
      detail: 'first',
    });
    appendOperatorOverrideEvent(db, {
      sessionId: 's-1',
      chapterId: 'ch-1',
      action: 'RESTORE_LKG',
      detail: 'second',
    });
    const events = loadEvents(db, 's-1');
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.sequence)).toEqual([1, 2]);
    expect(events.map((e) => e.id)).toEqual(['op-1', 'op-2']);
    expect(events.map((e) => e.type)).toEqual(['OPERATOR_OVERRIDE', 'OPERATOR_OVERRIDE']);
    expect(events[0]?.payload).toEqual({ action: 'MUTE_HOST', detail: 'first' });
    expect(events[1]?.payload).toEqual({ action: 'RESTORE_LKG', detail: 'second' });
  });
});
