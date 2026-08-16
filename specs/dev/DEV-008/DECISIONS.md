# DEV-008 DECISIONS

记录 T001–T006 施工过程中的决策。无业务语义变更。

## D1 — zod 版本与关键 API 语义（T002/T003/T004）

- 选定 `zod@^4.4.3`，与 `chapter-schema`（DEV-001 冻结）同一版本线（T002 第 2 条要求
  记录版本理由：与既有冻结包保持一致，pnpm 解析为 4.4.3，lockfile 复用已存在的
  `zod@4.4.3` 包条目，仅新增 workspace importer 段）。
- `z.string().datetime()` 在 zod v4.4.3 已被官方标记 `@deprecated`（JSDoc：
  `Use z.iso.datetime() instead`），且 zod v4 的 `.parse(data: unknown)` /
  `.safeParse(data: unknown)` 参数签名不再对输入做类型级约束。Task Package T003 第 4 条
  明确允许「等效 ISO-8601 校验，若 Zod 版本 API 不同须在 DECISIONS.md 说明替代方案」，
  故 `timestamp` 采用 `z.iso.datetime()`（同一 ISO-8601 校验内核，非宽松化）。
- `z.discriminatedUnion("type", [...])` 在 zod v4 经典 API 中仍可用，三个 Dice 分支以
  `z.literal` 判别。
- 基础信封 `visibility` 用 `z.union([z.literal('PUBLIC'), z.literal('HIDDEN')])`
  （具名 `VisibilitySchema`），与 A12 判定措辞（`z.literal("PUBLIC")`/`z.literal("HIDDEN")`
  而非宽松 `z.string()`）逐字对应；派生事件内以 `z.literal` 覆写为单值。

## D2 — 类型层 visibility 反例的验证方式（T004）

zod v4 中 `.parse(data: unknown)` 的参数位置不再提供输入类型约束，`@ts-expect-error`
无法挂在 parse 调用上。类型层断言改用显式输入类型注解：

```ts
// @ts-expect-error DICE.ROLLED 的 visibility 在类型层面强制为 'HIDDEN'（CR-008）
const bad: z.input<typeof DiceRolledEventSchema> = { ...validRolled, visibility: 'PUBLIC' };
```

注意 `@ts-expect-error` 只抑制**下一行**的报错，而多行对象字面量的类型错误会定位在
属性行而非声明行——因此该用例刻意写成单行对象字面量（`printWidth 100` 内），报错
恰好落在指令下一行。运行时反例另行构造（`as unknown` 宽化后走 `safeParse`），
两条路径（编译期 + 运行时）都覆盖「`ROLLED` 误设 `PUBLIC` 被拒」。

## D3 — 包名自引用导入的解析（T005）

`index.test.ts` 按 T005 要求以 `@interactive-story/runtime-kernel` 导入，而包
`package.json` 的 `types`/`exports` 指向 `dist`（尚未生成）。实测（删除
`packages/runtime-kernel/dist` 后重跑）：

- `pnpm typecheck`（`tsc -b --noEmit`）退出码 0——TS 5.9 构建模式对本包自引用
  导入的解析不依赖已落盘的 `dist/index.d.ts`，A02 无顺序依赖、干净检出可复跑；
- `pnpm test`（vitest）的运行时解析依赖 `dist/index.js`，故测试在 `pnpm build`
  之后执行（T006 既定顺序），实测 23 文件 / 115 断言通过。

## D4 — A06 测试文件与断言数

`runtime-kernel` 新增 3 个测试文件（`event.test.ts` 6 例 / `diceEvent.test.ts` 9 例 /
`index.test.ts` 4 例，合计 19 断言），`pnpm test` 全量 23 文件 / 115 断言通过
（`shared` 2 文件、`chapter-schema` 18 文件无回归）。

## D5 — 提交内容包含 Commander 下发动作的未提交改动

T006 第 4 步要求 `git add -A && git commit` 且 A21 要求提交时工作区干净。下发
DEV-008 时 Commander 在提交 `a5b0cd8` 之后新产生、未单独提交的治理改动（
`specs/PROJECT_INDEX.md`、`specs/dev/DAG.md` 的 DEV-008 状态记录、`specs/comms/
LEDGER.md` 消息 0019 行、`specs/tasks/TASK-PACKAGE-DEV-008.md`、消息文件
`0019-*`）随本次提交一并入库——与 DEV-001 先例一致（其 NODE_REPORT 消息 `0012`
已记录同类情况并获 AUDITOR 通过）。上述文件内容均为 Commander 写入，OPENCODE
未改动其中任何内容（会话开场快照已留档）。A23 的「未修改」以 OPENCODE 未触碰为准。
