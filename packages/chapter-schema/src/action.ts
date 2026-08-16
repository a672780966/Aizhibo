import { z } from 'zod';
import { ScaleBandSchema, ScaleSchema } from './manifest.js';

export const ActionDefinitionSchema = z.object({
  id: z.string(),
  actionType: z.string(),
  scaleBands: z.array(ScaleBandSchema).optional(),
  scaleSemantics: z.record(ScaleSchema, z.string()).optional(),
  diceProfileId: z.string(),
  resultSetId: z.string(),
});
export type ActionDefinition = z.infer<typeof ActionDefinitionSchema>;
