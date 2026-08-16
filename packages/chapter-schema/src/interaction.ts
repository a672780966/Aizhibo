import { z } from 'zod';
import { NoParticipationPolicySchema } from './manifest.js';
import { ConditionSchema } from './stateRules.js';

export const ChoiceSchema = z.object({
  id: z.enum(['A', 'B', 'C', 'D']),
  label: z.string(),
  actionType: z.string(),
  ruleId: z.string(),
  visibleIf: z.array(ConditionSchema).optional(),
});
export type Choice = z.infer<typeof ChoiceSchema>;

export const InteractionNodeSchema = z.object({
  id: z.string(),
  promptAudioId: z.string().optional(),
  openDurationMs: z.number(),
  choices: z.array(ChoiceSchema),
  diceMode: z.literal('PER_ACTION_GROUP'),
  resultPolicy: z.string(),
  nextScene: z.string(),
  noParticipationPolicy: NoParticipationPolicySchema,
});
export type InteractionNode = z.infer<typeof InteractionNodeSchema>;
