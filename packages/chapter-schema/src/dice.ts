import { z } from 'zod';
import { QualitySchema } from './result.js';
import { ConditionSchema } from './stateRules.js';

export const QualityThresholdSchema = z
  .object({
    quality: QualitySchema,
    min: z.number(),
    max: z.number(),
  })
  .refine((t) => t.min <= t.max, {
    message: 'QualityThreshold must satisfy min <= max',
  });
export type QualityThreshold = z.infer<typeof QualityThresholdSchema>;

export const DiceModifierSchema = z.object({
  when: ConditionSchema,
  amount: z.number(),
  reason: z.string(),
});
export type DiceModifier = z.infer<typeof DiceModifierSchema>;

export const DiceProfileSchema = z.object({
  id: z.string(),
  diceType: z.string(),
  qualityThresholds: z.array(QualityThresholdSchema),
  modifiers: z.array(DiceModifierSchema).optional(),
});
export type DiceProfile = z.infer<typeof DiceProfileSchema>;
