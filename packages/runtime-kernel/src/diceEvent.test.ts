import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  DiceEventSchema,
  DicePublishedEventSchema,
  DiceRequestedEventSchema,
  DiceRolledEventSchema,
} from './diceEvent.js';

const base = {
  id: 'evt-0002',
  sequence: 1,
  timestamp: '2026-08-16T12:00:00.000Z',
  chapterId: 'ch-001',
  sessionId: 'ses-001',
};

const validRequested = {
  ...base,
  type: 'DICE.REQUESTED',
  visibility: 'PUBLIC',
  payload: { rollIndex: 0, diceType: 'd20', modifier: 2, actionId: 'act-001' },
} as const;

const validRollRecord = {
  seed: '0xdeadbeef01234567',
  rollIndex: 0,
  diceType: 'd20',
  rawValue: 15,
  modifier: 2,
  finalValue: 17,
} as const;

const validRolled = {
  ...base,
  type: 'DICE.ROLLED',
  visibility: 'HIDDEN',
  payload: validRollRecord,
} as const;

const validPublished = {
  ...base,
  type: 'DICE.PUBLISHED',
  visibility: 'PUBLIC',
  payload: validRollRecord,
} as const;

describe('DiceRequestedEvent', () => {
  it('parses a valid DICE.REQUESTED event', () => {
    const parsed = DiceRequestedEventSchema.parse(validRequested);
    expect(parsed.type).toBe('DICE.REQUESTED');
    expect(parsed.visibility).toBe('PUBLIC');
    expect(parsed.payload.actionId).toBe('act-001');
  });
});

describe('DiceRolledEvent', () => {
  it('parses a valid DICE.ROLLED event carrying all six roll fields', () => {
    const parsed = DiceRolledEventSchema.parse(validRolled);
    expect(parsed.type).toBe('DICE.ROLLED');
    expect(parsed.visibility).toBe('HIDDEN');
    expect(parsed.payload).toEqual(validRollRecord);
  });

  it('rejects DICE.ROLLED with a missing roll field', () => {
    const { rawValue, ...missingField } = validRolled.payload;
    expect(rawValue).toBe(15);
    expect(DiceRolledEventSchema.safeParse({ ...validRolled, payload: missingField }).success).toBe(
      false,
    );
  });

  it('rejects DICE.ROLLED with visibility PUBLIC at runtime', () => {
    const rolledAsPublic: unknown = { ...validRolled, visibility: 'PUBLIC' };
    expect(DiceEventSchema.safeParse(rolledAsPublic).success).toBe(false);
  });

  it('rejects DICE.ROLLED with visibility PUBLIC at the type level', () => {
    // @ts-expect-error DICE.ROLLED 的 visibility 在类型层面强制为 'HIDDEN'（CR-008）
    const bad: z.input<typeof DiceRolledEventSchema> = { ...validRolled, visibility: 'PUBLIC' };
    expect(bad).toBeDefined();
  });
});

describe('DicePublishedEvent', () => {
  it('parses a valid DICE.PUBLISHED event carrying all six roll fields', () => {
    const parsed = DicePublishedEventSchema.parse(validPublished);
    expect(parsed.type).toBe('DICE.PUBLISHED');
    expect(parsed.visibility).toBe('PUBLIC');
    expect(parsed.payload).toEqual(validRollRecord);
  });

  it('rejects DICE.PUBLISHED with a missing roll field', () => {
    const { seed, ...missingField } = validRolled.payload;
    expect(seed).toBe('0xdeadbeef01234567');
    expect(
      DicePublishedEventSchema.safeParse({ ...validPublished, payload: missingField }).success,
    ).toBe(false);
  });
});

describe('DiceEventSchema', () => {
  it('parses all three branches of the discriminated union', () => {
    expect(DiceEventSchema.parse(validRequested).type).toBe('DICE.REQUESTED');
    expect(DiceEventSchema.parse(validRolled).type).toBe('DICE.ROLLED');
    expect(DiceEventSchema.parse(validPublished).type).toBe('DICE.PUBLISHED');
  });

  it('rejects a type outside the three dice event types', () => {
    const unknownType: unknown = { ...validRequested, type: 'DICE.STARTED' };
    expect(DiceEventSchema.safeParse(unknownType).success).toBe(false);
  });
});
