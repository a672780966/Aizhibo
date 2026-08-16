# DEV-008 REPORT

## Status

READY_FOR_REVIEW

## Implemented

T001–T006 全部完成。实际完成内容：

- `packages/runtime-kernel`：纯类型定义包，`dependencies` 恰为 `{ zod: ^4.4.3 }`（DECISIONS D1，与 chapter-schema 同版本线）。根 `tsconfig.json` references 追加本包；`tsconfig.base.json` 未改动。
- `src/event.ts`：`RuntimeEventSchema` 统一信封，字段与 Dev Spec 第 16 节逐字对照一致（`id`/`sequence`/`timestamp`/`type`/`payload`/`chapterId`/`sessionId`），另含 **CR-008 授权增补**的 `visibility` 字段（`z.union([z.literal('PUBLIC'), z.literal('HIDDEN')])`，必填，具名 `VisibilitySchema`）——此为本节点对规范原文的唯一增补，非篡改（Task Package A10 要求如实标注）。`sequence` 用 `z.number().int().nonnegative()`；`timestamp` 用 `z.iso.datetime()`（zod v4 中 `z.string().datetime()` 已 deprecated，替代方案见 DECISIONS D1）。
- `src/diceEvent.ts`：`DiceRequestPayloadSchema`（`rollIndex`/`diceType`/`modifier`/`actionId`）与 `DiceRollRecordPayloadSchema`（第 8 节六字段 `seed`/`rollIndex`/`diceType`/`rawValue`/`modifier`/`finalValue`）；经 `RuntimeEventSchema.extend()` 派生三个具体事件 schema——`DiceRequestedEventSchema`（`type: "DICE.REQUESTED"`、`visibility: "PUBLIC"`、REQUEST 载荷）、`DiceRolledEventSchema`（`type: "DICE.ROLLED"`、**`visibility: "HIDDEN"`**、六字段载荷）、`DicePublishedEventSchema`（`type: "DICE.PUBLISHED"`、`visibility: "PUBLIC"`、六字段载荷）；`z.discriminatedUnion("type", [...])` 聚合为 `DiceEventSchema`。
- `src/index.ts`：桶导出，re-export `event.ts` 与 `diceEvent.ts` 全部具名导出（schema + 类型），无默认导出、无重命名、无任何生成/分发/持久化函数。
- 3 个测试文件：`event.test.ts`（1 正例 + 5 反例，覆盖 sequence 负数/非整数、timestamp 非法格式、缺失 visibility、越界 visibility）、`diceEvent.test.ts`（三个事件类型各 1 正例 + 反例：`type` 越界、`ROLLED`/`PUBLISHED` 缺六字段任一、`ROLLED` 误设 `PUBLIC` 的运行时与类型层双路径拒绝）、`index.test.ts`（以 `@interactive-story/runtime-kernel` 包名导入的桶导出 smoke test，schema 与推导类型均可访问）。
- 节点文档：`specs/dev/DEV-008/` 下 INDEX / REQUIREMENTS / ACCEPTANCE / REPORT / DECISIONS。
- 零行为逻辑、零文件 IO、零跨包引用、零品牌类型：包内无 `emit`/`dispatch`/`publish`/`append`/`replay`/`rollDice`/`generateSeed` 函数，无 `fs` 导入，无 `xstate`/数据库依赖，未导入 `Brand`/`@interactive-story/shared`/`@interactive-story/chapter-schema`，全部 id 字段为 `z.string()`。

## Changed Files

新增：

```
packages/runtime-kernel/package.json
packages/runtime-kernel/tsconfig.json
packages/runtime-kernel/src/index.ts
packages/runtime-kernel/src/index.test.ts
packages/runtime-kernel/src/event.ts
packages/runtime-kernel/src/event.test.ts
packages/runtime-kernel/src/diceEvent.ts
packages/runtime-kernel/src/diceEvent.test.ts
specs/dev/DEV-008/INDEX.md
specs/dev/DEV-008/REQUIREMENTS.md
specs/dev/DEV-008/ACCEPTANCE.md
specs/dev/DEV-008/REPORT.md
specs/dev/DEV-008/DECISIONS.md
```

修改：

```
tsconfig.json                    （references 追加 packages/runtime-kernel）
pnpm-lock.yaml                   （runtime-kernel importer 段，zod 复用既有 4.4.3 条目）
```

随 `git add -A` 一并入库的 **Commander 下发动作未提交改动**（内容为 Commander 写入，OPENCODE 未触碰，见 DECISIONS D5）：

```
specs/PROJECT_INDEX.md           （DEV-008 → ISSUED/IN_PROGRESS 状态记录）
specs/dev/DAG.md                 （DEV-008 行 TODO → IN_PROGRESS）
specs/comms/LEDGER.md            （消息 0019 行 + 待处理表）
specs/tasks/TASK-PACKAGE-DEV-008.md
specs/comms/0019-COMMANDER-to-OPENCODE-TASK_PACKAGE-DEV-008.md
```

构建产物 `packages/runtime-kernel/dist/` 与 `node_modules/` 为 gitignored 产物。

## Tests Executed

| 命令 | 结果 | 关键输出 |
|---|---|---|
| pnpm install | PASS | `Already up to date` / `Done in 441ms using pnpm v11.5.3`，退出码 0 |
| pnpm typecheck | PASS | 无错误输出，退出码 0（三包均通过；并在删除 `runtime-kernel/dist` 后复跑仍通过，见 DECISIONS D3） |
| pnpm lint | PASS | 无错误无警告输出，退出码 0（0 error / 0 warning） |
| pnpm format:check | PASS | `All matched files use Prettier code style!`，退出码 0（仅对 Writable Scope 文件执行 prettier --write，规避 .claude 越权，DEV-000 F-02 教训） |
| pnpm build | PASS | 无错误输出，退出码 0；`packages/runtime-kernel/dist/index.d.ts` 存在（Test-Path = True） |
| pnpm test | PASS | `Test Files 23 passed (23)` / `Tests 115 passed (115)`，退出码 0（shared 2 文件 + chapter-schema 18 文件无回归 + runtime-kernel 3 文件） |

## Acceptance Results

| # | 结果 | 证据 |
|---|---|---|
| A01 | PASS | `pnpm install` 退出码 0（见 Tests Executed） |
| A02 | PASS | `pnpm typecheck` 退出码 0，三包（shared + chapter-schema + runtime-kernel）均通过；另在无 dist 状态复跑通过（D3） |
| A03 | PASS | `pnpm lint` 退出码 0，0 error / 0 warning |
| A04 | PASS | `pnpm format:check` 退出码 0 |
| A05 | PASS | `pnpm build` 退出码 0；`packages/runtime-kernel/dist/index.d.ts` 存在（Test-Path = True） |
| A06 | PASS | `pnpm test` 退出码 0：23 文件 / 115 断言（shared 2 + chapter-schema 18 无回归；runtime-kernel 新增 3 个测试文件全部通过，D4） |
| A07 | PASS | 根 `package.json` 无 `dependencies`（Get-Content 检查为空）；`packages/runtime-kernel/package.json` 的 `dependencies` 恰为 `{ zod: "^4.4.3" }` |
| A08 | PASS | `packages/*` 恰为 `shared`、`chapter-schema`、`runtime-kernel` 三个包（Get-ChildItem 检查） |
| A09 | PASS | `apps/`、`chapters/`、`assets/`、`scripts/`、`tools/` 均不存在（Test-Path = False ×5） |
| A10 | PASS | `RuntimeEventSchema` 七字段与第 16 节逐字对照一致（`event.ts` L7–L13：id/sequence/timestamp/type/payload/chapterId/sessionId），另含 `visibility`（L14）——CR-008 授权增补，已在本报告与 DECISIONS 如实标注，非篡改 |
| A11 | PASS | 反例测试覆盖：`sequence: -1` 与 `sequence: 1.5` 被拒、`timestamp: 'not-a-datetime'` 被拒（event.test.ts） |
| A12 | PASS | `visibility` 必填（缺失即 safeParse 拒绝，测试覆盖）；`VisibilitySchema = z.union([z.literal('PUBLIC'), z.literal('HIDDEN')])` 而非宽松 `z.string()`；派生事件内为 `z.literal` 覆写 |
| A13 | PASS | `DiceEventSchema = z.discriminatedUnion('type', [REQUESTED, ROLLED, PUBLISHED])`（diceEvent.ts L43）；`type: 'DICE.STARTED'` 越界反例被拒绝（测试覆盖） |
| A14 | PASS | `DiceRollRecordPayloadSchema` 含第 8 节六字段（seed/rollIndex/diceType/rawValue/modifier/finalValue，diceEvent.ts L11–L19）；`ROLLED` 缺 `rawValue`、`PUBLISHED` 缺 `seed` 反例均被拒（测试覆盖） |
| A15 | PASS | `ROLLED.visibility` 字面量 `'HIDDEN'`、`REQUESTED`/`PUBLISHED` 为 `'PUBLIC'`；误设 `PUBLIC` 的运行时反例（`safeParse` 拒绝）与类型层反例（`@ts-expect-error` + `z.input` 注解）双路径覆盖（D2） |
| A16 | PASS | grep：包内无 `emit`/`dispatch`/`publish`/`append`/`replay`/`rollDice`/`generateSeed` 函数名（匹配为空；`publish` 仅在 `DICE.PUBLISHED` 字面量字符串中出现，非函数） |
| A17 | PASS | grep：包内无 `fs`/`node:fs` 导入（匹配为空）；依赖检查：`dependencies` 仅 `zod`，无 `xstate`/数据库驱动 |
| A18 | PASS | grep：包内无 `Brand`/`@interactive-story/shared`/`@interactive-story/chapter-schema`（匹配为空）；全部 id 字段（id/chapterId/sessionId/actionId）为 `z.string()` |
| A19 | PASS | `index.ts` 桶导出；`index.test.ts` 以 `import * as RuntimeKernel from '@interactive-story/runtime-kernel'` 访问 `RuntimeEventSchema`/`DiceEventSchema`/三个具体事件 schema 及 `RuntimeEvent`/`DiceEvent`/`DiceRequestedEvent`/`DiceRolledEvent`/`DicePublishedEvent` 推导类型，全部通过 |
| A20 | PASS | `specs/dev/DEV-008/` 含 INDEX / REQUIREMENTS / ACCEPTANCE / REPORT 四份（另含 DECISIONS）；INDEX.md 含原句 `OpenCode 禁止自行推进下一 DEV Node.`；T001–T006 全部勾选，Status: READY_FOR_REVIEW |
| A21 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-008: runtime event model`；提交后 `git status --porcelain`（不计 LEDGER 追加与新消息文件）为空；`git show <sha>:specs/dev/DEV-008/INDEX.md` 为终态（T001–T006 全勾选） |
| A22 | PASS | LEDGER 含一条 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-008` 记录；消息文件存在；信封 `git_head` 与提交 sha 一致 |
| A23 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/shared/**`、`packages/chapter-schema/**`、`specs/dev/DEV-000/**`、`specs/dev/DEV-001/**`、`.claude/**`、`tsconfig.base.json`、`eslint.config.js`、`.prettierrc.json`、`vitest.config.ts` 均未被 OPENCODE 修改（会话开场 git status 快照留档：上述路径中 PROJECT_INDEX/DAG/LEDGER/tasks/0019 消息的改动与新增均为 Commander 下发动作本身，随 `git add -A` 入库但内容非本节点所写，D5） |

## Scope Deviations

NONE

## Known Issues

1. 无功能性问题。唯一需 AUDITOR 知悉的入账差异：本节点提交包含 Commander 下发 DEV-008 时未单独提交的治理文件改动（PROJECT_INDEX / DAG / LEDGER / TASK-PACKAGE / 0019 消息，DECISIONS D5）——与 DEV-001 先例（消息 `0012`）相同的处理方式，内容非 OPENCODE 写入。

## Blockers

NONE

## Future Considerations

- `RuntimeEventSchema` 信封可直接被 `DEV-004`/`DEV-005`/`DEV-006`/`DEV-009`/`DEV-033` 以 `.extend()` 派生各自领域事件（`STORY.*`/`INTERACTION.*`/`RESULT.*`/`SCENE.*` 等由各拥有节点定义，本节点未代拟）。
- `DEV-009` 将在同一 `packages/runtime-kernel` 内补充 statechart / actor 代码，届时 `getHealth()`（CR-019）义务随真实运行时服务生效（Task Package Constraints 6）。
- `DiceRollRecordPayloadSchema` 的六字段形状是 `DEV-005` 写事件、`DEV-010` 落 Event Log 的共同契约；`DICE.ROLLED` 的 `HIDDEN` 可见性由类型层强制，`DEV-050` 投影函数可直接依赖该字段做分区。
