import { z } from 'zod';
import { ConditionSchema } from './stateRules.js';

export const EndingNodeSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    when: z.union([ConditionSchema, z.null()]),
    priority: z.number(),
    isFallback: z.boolean(),
    visualSceneId: z.string(),
    narrationBlockIds: z.array(z.string()),
    masterAudioId: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine((e) => (e.isFallback && e.when === null) || (!e.isFallback && e.when !== null), {
    message: 'isFallback ending must have when === null, non-fallback must have a when',
  });
export type EndingNode = z.infer<typeof EndingNodeSchema>;
