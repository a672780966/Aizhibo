import { z } from 'zod';
import { ConditionSchema } from './stateRules.js';
import { QualitySchema, ViewerScopeSchema, PlayerEffectSchema } from './result.js';

export const RecoveryTriggerSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('STATE'),
    condition: ConditionSchema,
  }),
  z.object({
    kind: z.literal('SCENE_ENTER'),
    nodeId: z.string(),
  }),
  z.object({
    kind: z.literal('RESULT_QUALITY'),
    actionId: z.string(),
    minQuality: QualitySchema,
  }),
]);
export type RecoveryTrigger = z.infer<typeof RecoveryTriggerSchema>;

export const RecoveryRuleSchema = z.object({
  id: z.string(),
  when: RecoveryTriggerSchema,
  scope: ViewerScopeSchema,
  effects: z.array(PlayerEffectSchema),
  oncePerChapter: z.boolean().optional(),
});
export type RecoveryRule = z.infer<typeof RecoveryRuleSchema>;
