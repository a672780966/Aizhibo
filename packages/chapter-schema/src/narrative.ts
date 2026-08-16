import { z } from 'zod';
import { ConditionSchema } from './stateRules.js';

export const NarrativeBlockSchema = z.object({
  id: z.string(),
  slot: z.enum(['PREFIX', 'SUPPORT', 'PRIMARY', 'URGENCY', 'TRANSITION']),
  text: z.string(),
  tone: z.string().optional(),
  when: ConditionSchema.optional(),
});
export type NarrativeBlock = z.infer<typeof NarrativeBlockSchema>;

export const ResultNarrativeSchema = z.object({
  id: z.string(),
  primaryBlockId: z.string(),
  supportBlockIds: z.array(z.string()).optional(),
  urgencyBlockId: z.string().optional(),
  transitionBlockId: z.string().optional(),
  prefixBlockId: z.string().optional(),
  focus: z.object({
    priority: z.number(),
    category: z.string(),
    urgency: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH']),
  }),
});
export type ResultNarrative = z.infer<typeof ResultNarrativeSchema>;
