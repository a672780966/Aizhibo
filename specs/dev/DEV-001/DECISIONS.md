# DEV-001 DECISIONS

记录 T001–T020 施工过程中的决策。无业务语义变更。

## D1 — zod 版本与关键 API 语义（T002/T005/T009）

- 选定 `zod@^4.4.3`（pnpm 解析的最新稳定版）。本包为其唯一运行时依赖（第 9 节第 9 条）。
- `z.record(keySchema, valueSchema)`：当 keySchema 为枚举/联合时，Zod v4 将其视为**键全集映射**
  （缺键即报错），与 TS `Record<ActionScale, string>` 的语义一致——`scaleSemantics` 因此
  要求全部五档键，测试按此构造。
- `z.record(z.string(), z.unknown())`（chapterVariables）与 `z.record(z.string(), z.union([...]))`
  键为 string 时仍为开放容器，符合 T004/T014 要求。

## D2 — 递归 Condition 的类型声明模式（T005）

通用约定要求 `type X = z.infer<typeof XSchema>`；但自递归 schema（`Condition` 的
`all`/`any`/`not` 内嵌自身）无法用 `z.infer` 推导——`z.ZodType<Condition>` 标注会与
`z.infer<typeof ConditionSchema>` 形成循环引用（TS2502/TS2456）。

采用 Zod 官方递归模式：先声明显式联合类型 `export type Condition = ...`，再以
`export const ConditionSchema: z.ZodType<Condition> = z.lazy(() => ...)` 标注。
schema 与类型仍同文件、同步维护，`z.lazy` 保证运行时校验与类型形状一致；
此为本约定在递归场景下的唯一例外，显式留档。

## D3 — ResultEntry 三分支互斥的实现（T009）

`ResultEntry` 无公共判别字段（三分支都以 `quality` 开头且后续字段各异），Zod 的
`discriminatedUnion` 无法直接使用。实现为：

1. 三个 `.strict()` 分支对象——`.strict()` 拒绝未知键，使「同时含 resultId 与 mapsTo」
   的对象在**每个分支**都因多余键被拒，达成等效互斥；
2. 外加 `.superRefine` 复核（防御层，记录意图）。

反例测试「resultId + mapsTo 并存」覆盖两条路径。

## D4 — A06 测试文件数量说明

Task Package A06 表述为「新增 17 个测试文件（T003–T019）」，但第 3 节 Writable Scope
逐文件列出的是 **18 个**测试文件（T008 同时产出 `action.test.ts` 与 `dice.test.ts`
两个文件，任务数 17 而文件数 18）。以 Writable Scope 清单为准，实际交付 18 个测试文件，
`pnpm test` 全量通过（20 文件 / 96 断言，含 shared 无回归）。AUDITOR 以文件清单核验。
