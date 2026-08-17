import { z } from 'zod';

export const SceneDisclosureSchema = z.object({
  locationLabel: z.string(),
  knownFactIds: z.array(z.string()),
  tensionKey: z.string(),
  // 事实 → 依赖 flag 列表（"<container>.<field>" 格式，与 PASS5 ReachableStateModel 键格式一致）。
  // ADDENDUM-001 §A15 判定 2/3（白名单/时序性）需要"一个事实依赖哪些 flag"这一映射，
  // 冻结规范未定义，本字段补齐（DEV-002A 任务包第 1 节记录的规范空白处置）。
  knownFactDependencies: z.record(z.string(), z.array(z.string())).optional(),
});
export type SceneDisclosure = z.infer<typeof SceneDisclosureSchema>;

export const HostPublicSpecSchema = z.object({
  flagVisibility: z.record(z.string(), z.enum(['PUBLIC', 'HIDDEN'])),
  sceneDisclosures: z.record(z.string(), SceneDisclosureSchema),
  tensionLabels: z.record(z.string(), z.string()),
  forbiddenTopics: z.array(z.string()).optional(),
});
export type HostPublicSpec = z.infer<typeof HostPublicSpecSchema>;
