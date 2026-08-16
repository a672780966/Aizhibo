import { describe, expect, it } from 'vitest';
import { RuntimeEventSchema } from './event.js';

const validEvent = {
  id: 'evt-0001',
  sequence: 1,
  timestamp: '2026-08-16T12:00:00.000Z',
  type: 'SOMETHING.HAPPENED',
  payload: { note: 'the base envelope accepts any type string' },
  chapterId: 'ch-001',
  sessionId: 'ses-001',
  visibility: 'PUBLIC',
};

describe('RuntimeEvent', () => {
  it('parses a valid envelope with an arbitrary type string', () => {
    const parsed = RuntimeEventSchema.parse(validEvent);
    expect(parsed.type).toBe('SOMETHING.HAPPENED');
    expect(parsed.visibility).toBe('PUBLIC');
  });

  it('rejects a negative sequence', () => {
    expect(RuntimeEventSchema.safeParse({ ...validEvent, sequence: -1 }).success).toBe(false);
  });

  it('rejects a non-integer sequence', () => {
    expect(RuntimeEventSchema.safeParse({ ...validEvent, sequence: 1.5 }).success).toBe(false);
  });

  it('rejects an invalid timestamp format', () => {
    expect(
      RuntimeEventSchema.safeParse({ ...validEvent, timestamp: 'not-a-datetime' }).success,
    ).toBe(false);
  });

  it('rejects a missing visibility', () => {
    const { visibility, ...withoutVisibility } = validEvent;
    expect(withoutVisibility).not.toHaveProperty('visibility');
    expect(visibility).toBe('PUBLIC');
    expect(RuntimeEventSchema.safeParse(withoutVisibility).success).toBe(false);
  });

  it('rejects a visibility outside PUBLIC/HIDDEN', () => {
    expect(RuntimeEventSchema.safeParse({ ...validEvent, visibility: 'SECRET' }).success).toBe(
      false,
    );
  });
});
