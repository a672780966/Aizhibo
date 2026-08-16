import { z } from 'zod';
import { NPCStateSchema } from './worldState.js';

export const NPCDefinitionSchema = z.object({
  id: z.string(),
  characterAssetId: z.string(),
  displayName: z.string(),
  initialState: NPCStateSchema,
});
export type NPCDefinition = z.infer<typeof NPCDefinitionSchema>;
