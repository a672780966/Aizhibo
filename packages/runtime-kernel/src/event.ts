import { z } from 'zod';

export const VisibilitySchema = z.union([z.literal('PUBLIC'), z.literal('HIDDEN')]);
export type Visibility = z.infer<typeof VisibilitySchema>;

export const RuntimeEventSchema = z.object({
  id: z.string(),
  sequence: z.number().int().nonnegative(),
  timestamp: z.iso.datetime(),
  type: z.string(),
  payload: z.unknown(),
  chapterId: z.string(),
  sessionId: z.string(),
  visibility: VisibilitySchema,
});
export type RuntimeEvent = z.infer<typeof RuntimeEventSchema>;
