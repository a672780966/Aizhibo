import { z } from 'zod';
import { ConditionSchema } from './stateRules.js';
import { HostPolicySchema } from './scene.js';

export const BossPhaseSchema = z.object({
  id: z.string(),
  order: z.number(),
  enterWhen: ConditionSchema,
  interactionId: z.string(),
  narrationBlockIds: z.array(z.string()).optional(),
  hostPolicy: HostPolicySchema,
});
export type BossPhase = z.infer<typeof BossPhaseSchema>;

export const BossNodeSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  visualSceneId: z.string(),
  phases: z.array(BossPhaseSchema),
  variables: z.record(z.string(), z.union([z.number(), z.boolean(), z.string()])),
  stateRuleSetId: z.string(),
  onDefeat: z.string(),
  onFailure: z.string(),
  maxRounds: z.number().int().positive().optional(),
});
export type BossNode = z.infer<typeof BossNodeSchema>;
