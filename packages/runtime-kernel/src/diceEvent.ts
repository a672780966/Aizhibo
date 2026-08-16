import { z } from 'zod';
import { RuntimeEventSchema } from './event.js';

export const DiceRequestPayloadSchema = z.object({
  rollIndex: z.number().int().nonnegative(),
  diceType: z.string(),
  modifier: z.number(),
  actionId: z.string(),
});
export type DiceRequestPayload = z.infer<typeof DiceRequestPayloadSchema>;

export const DiceRollRecordPayloadSchema = z.object({
  seed: z.string(),
  rollIndex: z.number().int().nonnegative(),
  diceType: z.string(),
  rawValue: z.number(),
  modifier: z.number(),
  finalValue: z.number(),
});
export type DiceRollRecordPayload = z.infer<typeof DiceRollRecordPayloadSchema>;

export const DiceRequestedEventSchema = RuntimeEventSchema.extend({
  type: z.literal('DICE.REQUESTED'),
  visibility: z.literal('PUBLIC'),
  payload: DiceRequestPayloadSchema,
});
export type DiceRequestedEvent = z.infer<typeof DiceRequestedEventSchema>;

export const DiceRolledEventSchema = RuntimeEventSchema.extend({
  type: z.literal('DICE.ROLLED'),
  visibility: z.literal('HIDDEN'),
  payload: DiceRollRecordPayloadSchema,
});
export type DiceRolledEvent = z.infer<typeof DiceRolledEventSchema>;

export const DicePublishedEventSchema = RuntimeEventSchema.extend({
  type: z.literal('DICE.PUBLISHED'),
  visibility: z.literal('PUBLIC'),
  payload: DiceRollRecordPayloadSchema,
});
export type DicePublishedEvent = z.infer<typeof DicePublishedEventSchema>;

export const DiceEventSchema = z.discriminatedUnion('type', [
  DiceRequestedEventSchema,
  DiceRolledEventSchema,
  DicePublishedEventSchema,
]);
export type DiceEvent = z.infer<typeof DiceEventSchema>;
