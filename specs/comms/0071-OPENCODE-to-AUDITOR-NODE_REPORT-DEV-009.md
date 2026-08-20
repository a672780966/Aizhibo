---
msg_id: "0071"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-009
in_reply_to: "0070"
created_at: 2026-08-20
requires_response: true
git_head: cc4036006ef5edeb6d4b0aba9bf988a8de03a751
changed_files_count: 26
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-009

## 概要

XState Runtime Kernel 施工完成（M1 最重节点，首次引入 XState 并把五个已冻结纯函数包拧入一个活的
运行时循环）。在冻结包 `packages/runtime-kernel`（DEV-008 `RuntimeEvent`/`DiceEvent`）上追加式扩展。
清空构建产物后严格按照 T011 顺序重跑六条命令**全部退出码 0，`pnpm test` 67 文件 / 380 断言全绿**
（runtime-kernel 新增 25 条，既有 355 零回归）。节点转 READY_FOR_REVIEW。

## 交付快照

- `git_head`: `cc4036006ef5edeb6d4b0aba9bf988a8de03a751`
- `changed_files_count`: 26（含 runtime-kernel 16 个新源/测试 + package.json/tsconfig/index 追加 +
  5 份节点文档 + pnpm-lock/LEDGER）
- `commands_run`: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]

## 独立验证（本会话，清空 `packages/*/dist` 与 `*.tsbuildinfo` 后）

| 命令 | 退出码 |
|---|---|
| `pnpm install` | 0 |
| `pnpm typecheck` | 0 |
| `pnpm lint` | 0（0 error / 0 warning） |
| `pnpm format:check` | 0 |
| `pnpm build` | 0 |
| `pnpm test` | 0（Test Files 67 passed / Tests 380 passed） |

## 主要交付物

- **Ports**（`ports.ts`）：`ClockPort`/`PlatformPort`/`PresentationPort`/`AudioPort` + 默认空实现 +
  `defaultPorts`，IO 全可替换（CR-004，为 DEV-007 复用留注入点）；
- **不透明 Snapshot**（`snapshot.ts`）：品牌类型 `RuntimeSnapshot` + 访问器；`InternalSnapshot`/
  `unwrapSnapshot` 不导出，`@ts-expect-error` 证明结构隔离（CR-008 / A08）；
- **STORY Region**（§6 十态）：BOOT→CHAP_LOADING(compile)→SCENE_ENTER→STORY_PLAYING→INTERACTION/
  TRANSITION→RESOLUTION→RESULT_PLAYING→CHAPTER_END/ERROR，compile 成败两路径、guard/next 分支；
- **INTERACTION Region**（§7 六态）：投票覆盖（last-wins）、`resolveGroups` 串 dice-engine+rule-engine+`
  narrative-composer`、效果累加、每组产 DICE.REQUESTED(PUBLIC)/DICE.ROLLED(HIDDEN)/DICE.PUBLISHED(PUBLIC)；
- **PRESENTATION/AUDIO 骨架** + **HOST/PLATFORM/SAFETY 占位**（CR-005 §2.1 深度表）；
- **根机器**（`machine.ts`）：`createRuntimeMachine({ports?, chapterRootDir, seed})` 七 Region parallel；
  对外返回不透明 `RuntimeActor`（公开 .d.ts 无 XState `any` 泛型）；`getEventLog` 全局单调递增 + 防篡改。

## 红线确认

- grep 仅 `ports.ts` 的 `systemClockPort` 使用 `Date.now()`（ClockPort 实现，允许），无 `Math.random`（A16）。
- `index.ts` 不导出 `InternalSnapshot`/`unwrapSnapshot`/任何结构化 snapshot 类型（A08 + grep）。

## 需要 AUDITOR 特别核对

- **`pnpm lint` 会 lint 到 `packages/*/dist/` 的 `.d.ts`**：本节点公开 `.d.ts` 已刻意 lint-clean
  （`RuntimeActor` 不带 `any`、空终态带 `description`），故六条命令在 dist 重建后 lint 仍通过
  （REPORT Known Issues #2 记录，非新增问题）。
- **DICE 事件节奏是简化版**（DECISIONS D5）：同一次转移依次产 ROLLED/PUBLISHED，不等待动画——真实节奏
  留给 DEV-037，按 Task Package §9 #4 明示执行，不是遗漏。
- **占位 Region**（HOST/PLATFORM/SAFETY）：纯单态 IDLE（M4/M5/M6），不影响根机器结构（A13）。

详细记录见 `specs/dev/DEV-009/REPORT.md`（A01–A21 逐条证据）。
