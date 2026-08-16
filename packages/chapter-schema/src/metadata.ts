import { z } from 'zod';

// 本类型不参与任何 Compiler PASS 2–8 的引用/图/覆盖/可达性检查（ADDENDUM-001 §A16）：
// 纯创作期信息，运行时必须忽略。
export const ChapterMetadataSchema = z.object({
  synopsis: z.string().optional(),
  tags: z.array(z.string()).optional(),
  contentWarnings: z.array(z.string()).optional(),
  estimatedDurationMinutes: z.number().optional(),
  targetAudience: z.string().optional(),
  authoringNotes: z.string().optional(),
});
export type ChapterMetadata = z.infer<typeof ChapterMetadataSchema>;
