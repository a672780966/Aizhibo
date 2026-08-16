import { z } from 'zod';

export const SceneDisclosureSchema = z.object({
  locationLabel: z.string(),
  knownFactIds: z.array(z.string()),
  tensionKey: z.string(),
});
export type SceneDisclosure = z.infer<typeof SceneDisclosureSchema>;

export const HostPublicSpecSchema = z.object({
  flagVisibility: z.record(z.string(), z.enum(['PUBLIC', 'HIDDEN'])),
  sceneDisclosures: z.record(z.string(), SceneDisclosureSchema),
  tensionLabels: z.record(z.string(), z.string()),
  forbiddenTopics: z.array(z.string()).optional(),
});
export type HostPublicSpec = z.infer<typeof HostPublicSpecSchema>;
