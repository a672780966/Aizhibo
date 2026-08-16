import { describe, expect, it } from 'vitest';
import * as RuntimeKernel from '@interactive-story/runtime-kernel';
import type {
  DiceEvent,
  DicePublishedEvent,
  DiceRequestedEvent,
  DiceRolledEvent,
  RuntimeEvent,
} from '@interactive-story/runtime-kernel';

const validRollRecord = {
  seed: '0xdeadbeef01234567',
  rollIndex: 0,
  diceType: 'd20',
  rawValue: 15,
  modifier: 2,
  finalValue: 17,
};

const validRequested = {
  id: 'evt-0003',
  sequence: 1,
  timestamp: '2026-08-16T12:00:00.000Z',
  type: 'DICE.REQUESTED',
  visibility: 'PUBLIC',
  payload: { rollIndex: 0, diceType: 'd20', modifier: 2, actionId: 'act-001' },
  chapterId: 'ch-001',
  sessionId: 'ses-001',
};

const validRolled = {
  ...validRequested,
  type: 'DICE.ROLLED',
  visibility: 'HIDDEN',
  payload: validRollRecord,
};

const validPublished = {
  ...validRequested,
  type: 'DICE.PUBLISHED',
  visibility: 'PUBLIC',
  payload: validRollRecord,
};

describe('runtime-kernel barrel export', () => {
  it('exposes RuntimeEventSchema and DiceEventSchema', () => {
    expect(RuntimeKernel.RuntimeEventSchema).toBeDefined();
    expect(RuntimeKernel.DiceEventSchema).toBeDefined();
  });

  it('exposes the three concrete dice event schemas', () => {
    expect(RuntimeKernel.DiceRequestedEventSchema).toBeDefined();
    expect(RuntimeKernel.DiceRolledEventSchema).toBeDefined();
    expect(RuntimeKernel.DicePublishedEventSchema).toBeDefined();
  });

  it('exposes the payload schemas', () => {
    expect(RuntimeKernel.DiceRequestPayloadSchema).toBeDefined();
    expect(RuntimeKernel.DiceRollRecordPayloadSchema).toBeDefined();
  });

  it('exposes the derived types through the barrel', () => {
    const event: RuntimeEvent = RuntimeKernel.RuntimeEventSchema.parse(validRequested);
    const diceEvent: DiceEvent = RuntimeKernel.DiceEventSchema.parse(validRolled);
    const requested: DiceRequestedEvent =
      RuntimeKernel.DiceRequestedEventSchema.parse(validRequested);
    const rolled: DiceRolledEvent = RuntimeKernel.DiceRolledEventSchema.parse(validRolled);
    const published: DicePublishedEvent =
      RuntimeKernel.DicePublishedEventSchema.parse(validPublished);
    expect([event.type, diceEvent.type, requested.type, rolled.type, published.type]).toEqual([
      'DICE.REQUESTED',
      'DICE.ROLLED',
      'DICE.REQUESTED',
      'DICE.ROLLED',
      'DICE.PUBLISHED',
    ]);
  });
});
