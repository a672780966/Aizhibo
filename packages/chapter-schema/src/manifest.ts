import { z } from 'zod';

export const ScaleSchema = z.enum(['SOLO', 'SMALL', 'MEDIUM', 'LARGE', 'MASS']);
export type ActionScale = z.infer<typeof ScaleSchema>;

export const ScaleBandSchema = z.object({
  scale: ScaleSchema,
  minParticipants: z.number(),
  maxParticipants: z.number().nullable(),
});
export type ScaleBand = z.infer<typeof ScaleBandSchema>;

export const DefaultChoicePolicySchema = z.object({
  kind: z.literal('DEFAULT_CHOICE'),
  choiceId: z.enum(['A', 'B', 'C', 'D']),
});
export type DefaultChoicePolicy = z.infer<typeof DefaultChoicePolicySchema>;

export const SkipPolicySchema = z.object({
  kind: z.literal('SKIP'),
});
export type SkipPolicy = z.infer<typeof SkipPolicySchema>;

export const HoldPolicySchema = z.object({
  kind: z.literal('HOLD'),
  extendMs: z.number(),
  maxExtensions: z.number(),
  thenFallback: z.union([DefaultChoicePolicySchema, SkipPolicySchema]),
});
export type HoldPolicy = z.infer<typeof HoldPolicySchema>;

export const NoParticipationPolicySchema = z.union([
  DefaultChoicePolicySchema,
  SkipPolicySchema,
  HoldPolicySchema,
]);
export type NoParticipationPolicy = z.infer<typeof NoParticipationPolicySchema>;

export const ChapterManifestSchema = z.object({
  schemaVersion: z.string(),
  chapterId: z.string(),
  chapterVersion: z.string(),
  title: z.string(),
  entryNodeId: z.string(),
  language: z.string(),
  authoring: z.object({
    generatedBy: z.string().optional(),
    auditedBy: z.string().optional(),
    createdAt: z.string(),
  }),
});
export type ChapterManifest = z.infer<typeof ChapterManifestSchema>;

export const StoryGraphNodeSchema = z.object({
  id: z.string(),
  kind: z.enum(['SCENE', 'BOSS', 'ENDING']),
  file: z.string(),
});
export type StoryGraphNode = z.infer<typeof StoryGraphNodeSchema>;

export const StoryGraphSchema = z.object({
  nodes: z.array(StoryGraphNodeSchema),
});
export type StoryGraph = z.infer<typeof StoryGraphSchema>;

export const WorldRulesSchema = z.object({
  viewerDefaults: z.object({
    hp: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    life: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  }),
  downedPolicy: z.enum(['AUTO_SPEND_LIFE', 'REQUIRE_RECOVERY']),
  defaultScaleBands: z.array(ScaleBandSchema),
  defaultDiceProfileId: z.string(),
  interactionDefaults: z.object({
    openDurationMs: z.number(),
    noParticipationPolicy: NoParticipationPolicySchema,
  }),
  diceBuffer: z
    .object({
      minDiceMs: z.number(),
      targetDiceMs: z.number(),
      maxDiceMs: z.number(),
    })
    .refine((b) => b.minDiceMs <= b.targetDiceMs && b.targetDiceMs <= b.maxDiceMs, {
      message: 'diceBuffer must satisfy minDiceMs <= targetDiceMs <= maxDiceMs',
    }),
});
export type WorldRules = z.infer<typeof WorldRulesSchema>;
