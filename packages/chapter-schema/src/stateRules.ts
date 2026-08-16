import { z } from 'zod';

export const StatePathSchema = z.object({
  container: z.enum(['flags', 'npc', 'danger', 'discovered', 'activeThreats', 'chapterVariables']),
  key: z.string(),
  field: z.string().optional(),
});
export type StatePath = z.infer<typeof StatePathSchema>;

const primitiveValue = z.union([z.boolean(), z.number(), z.string()]);

type CompareCondition =
  | {
      path: StatePath;
      op: 'EQ' | 'NEQ' | 'GT' | 'GTE' | 'LT' | 'LTE';
      value: boolean | number | string;
    }
  | { path: StatePath; op: 'IN'; value: (boolean | number | string)[] }
  | { path: StatePath; op: 'EXISTS' };

export type Condition =
  CompareCondition | { all: Condition[] } | { any: Condition[] } | { not: Condition };

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.discriminatedUnion('op', [
      z.object({
        path: StatePathSchema,
        op: z.enum(['EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE']),
        value: primitiveValue,
      }),
      z.object({
        path: StatePathSchema,
        op: z.literal('IN'),
        value: z.array(primitiveValue),
      }),
      z.object({
        path: StatePathSchema,
        op: z.literal('EXISTS'),
      }),
    ]),
    z.object({ all: z.array(ConditionSchema) }),
    z.object({ any: z.array(ConditionSchema) }),
    z.object({ not: ConditionSchema }),
  ]),
);

export const StateEffectSchema = z.object({
  path: StatePathSchema,
  op: z.enum(['SET', 'INC', 'DEC', 'PUSH', 'REMOVE']),
  value: primitiveValue.optional(),
});
export type StateEffect = z.infer<typeof StateEffectSchema>;

export const StateRuleSchema = z.object({
  id: z.string(),
  when: ConditionSchema,
  effects: z.array(StateEffectSchema),
  once: z.boolean().optional(),
});
export type StateRule = z.infer<typeof StateRuleSchema>;

export const StateRuleSetSchema = z.object({
  id: z.string(),
  rules: z.array(StateRuleSchema),
});
export type StateRuleSet = z.infer<typeof StateRuleSetSchema>;

export const SceneGuardSchema = z.object({
  when: ConditionSchema,
  goto: z.string(),
  priority: z.number(),
});
export type SceneGuard = z.infer<typeof SceneGuardSchema>;
