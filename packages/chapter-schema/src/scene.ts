import { z } from 'zod';
import { SceneGuardSchema } from './stateRules.js';

export const HostPolicySchema = z.enum(['ALLOWED', 'LIMITED', 'MUTED']);
export type HostPolicy = z.infer<typeof HostPolicySchema>;

export const CharacterPlacementSchema = z.object({
  characterId: z.string(),
  slot: z.enum(['LEFT', 'CENTER_LEFT', 'CENTER', 'CENTER_RIGHT', 'RIGHT']),
  expression: z.string().optional(),
  visible: z.boolean(),
});
export type CharacterPlacement = z.infer<typeof CharacterPlacementSchema>;

export const SceneNodeSchema = z.object({
  id: z.string(),
  visualSceneId: z.string(),
  narration: z.array(z.string()).optional(),
  characters: z.array(CharacterPlacementSchema),
  bgm: z.string().optional(),
  ambience: z.array(z.string()).optional(),
  interactionId: z.string().optional(),
  next: z.string().optional(),
  guards: z.array(SceneGuardSchema).optional(),
  hostPolicy: HostPolicySchema,
});
export type SceneNode = z.infer<typeof SceneNodeSchema>;
