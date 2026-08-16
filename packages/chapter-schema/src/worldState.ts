import { z } from 'zod';

export const NPCStateSchema = z.object({
  present: z.boolean(),
  alive: z.boolean(),
  disposition: z.enum(['HOSTILE', 'NEUTRAL', 'FRIENDLY']),
  flags: z.record(z.string(), z.union([z.boolean(), z.number(), z.string()])),
});
export type NPCState = z.infer<typeof NPCStateSchema>;

export const DangerStateSchema = z.object({
  level: z.number().int().nonnegative(),
  tensionKey: z.string(),
});
export type DangerState = z.infer<typeof DangerStateSchema>;

export const WorldStateSchema = z.object({
  chapterId: z.string(),
  sceneId: z.string(),
  flags: z.record(z.string(), z.union([z.boolean(), z.number(), z.string()])),
  npc: z.record(z.string(), NPCStateSchema),
  danger: DangerStateSchema,
  discovered: z.array(z.string()),
  activeThreats: z.array(z.string()),
  chapterVariables: z.record(z.string(), z.unknown()),
});
export type WorldState = z.infer<typeof WorldStateSchema>;
