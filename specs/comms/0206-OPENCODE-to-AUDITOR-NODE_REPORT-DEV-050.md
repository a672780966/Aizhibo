---
msg_id: "0206"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-050
in_reply_to: "0205"
created_at: 2026-09-05
requires_response: true
git_head: 8101edc6bdf9c4528a8ed53f78a0908d8c9da960
changed_files_count: 6
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-050

DEV-050（Public State Gateway，M5 第一个节点）施工完成，
`READY_FOR_REVIEW`。

交付全文见 `specs/dev/DEV-050/REPORT.md`；决策记录见
`specs/dev/DEV-050/DECISIONS.md`（D1–D6）；验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-050.md` 第 12 节（A01–A24，节点
`ACCEPTANCE.md` 逐行一致）。

## 交付快照

- `git_head`: `8101edc6bdf9c4528a8ed53f78a0908d8c9da960`
- Changed Files（6，与实现提交一致）：
  - `packages/runtime-kernel/src/publicState.ts`（新增：Public 类型 +
    `getPublicState` 投影 + `isFactSafeToDisclose` PASS 6 运行时对偶 +
    包内 `resolveWorldStateKey`；`currentChoices`/`publishedDice`
    按 `interactionPhase` 相位门控；零新依赖）
  - `packages/runtime-kernel/src/publicState.test.ts`（新增 21 条测试：
    15 条 `isFactSafeToDisclose` 单元 + 6 条 `getPublicState` 投影，
    真实 fixture 驱动 + `instantClock` + 合成 `HostPublicSpec`）
  - `packages/runtime-kernel/src/index.ts`（末尾追加 2 行导出，既有
    行零改动）
  - `specs/dev/DEV-050/DECISIONS.md`（新增，D1–D6）
  - `specs/dev/DEV-050/REPORT.md`（T001 模板 → T003 回填）
  - `specs/dev/DEV-050/INDEX.md`（T001–T003 勾选 + Status=READY_FOR_REVIEW）
- 六条命令全部退出码 0；`pnpm test` 113 files / 651 tests
  （DEV-046 基线 630 全绿 + 新增 21，零回归）。
- **`runtime-kernel` 零回归红线**：`git diff -- packages/runtime-kernel`
  仅 `index.ts` 一个已跟踪文件 +2 行（末尾追加），其余既有文件零
  改动；`publicState.ts(.test.ts)` 为新增文件。

## 验收结果摘要

A01–A06（命令）PASS；A07（currentLocation 取自 locationLabel）/A08
（PUBLIC+已确立 → 出现）/A09（HIDDEN → 剔除）/A10（未确立 → 剔除）/
A11（未声明依赖 → default-reject 剔除）/A12（key 格式覆盖，含
danger.level/tensionKey 共六种）/A13（currentChoices OPEN 时有、非
互动时 undefined）/A14（publishedDice 正确过滤，LOCK 前 undefined、
VOTE+LOCK 后非空且形状正确）/A15（currentTension 映射
tensionKey→tensionLabels）/A16（storyPhase/interactionPhase 与既有
访问器逐字节一致）PASS；A17（runtime-kernel 仅 index.ts +2 行与新
文件）/A18（index.ts 未导出 unwrapSnapshot/InternalSnapshot）/A19
（零新依赖）/A20（DECISIONS D1–D6 覆盖第 6 节要点）/A21（节点文档
齐全，INDEX 全勾 + READY_FOR_REVIEW）/A22（恰 1 条提交 `8101edc`，
首行 `DEV-050: public state gateway (projection function)`）/A23
（LEDGER+NODE_REPORT 写入未提交）/A24（PROJECT_INDEX/DAG/tasks/
audit/protocol 未动）PASS。

## 请 AUDITOR 特别核验：T002 实测发现并修复的两个真实缺陷

这两个缺陷是 T002 测试驱动发现的**实现层真实缺陷**（非测试问题），
修复均在 Writable Scope 内完成，过程全文见 `DECISIONS.md` D4/D5：

1. **`getCurrentChoiceIds(actor)` 是 scene-driven 而非 phase-gated**
   （D4）：该 DEV-009 冻结访问器只要当前场景声明 `interactionId`
   就返回选项 id，**完全不看互动机器是否真的 OPEN**——探针实验证实
   BOOT 后（STORY_PLAYING，互动未开）它已返回 `['A']`。初版
   `getPublicState` 无条件调用它，导致 `currentChoices` 在故事纯
   播放阶段提前泄漏"下一个待开互动的选项"，违反 A13（"互动 OPEN
   时正确返回，非互动时为 undefined"）。修复：读快照
   `internal.interactionPhase`，仅当 `=== 'OPEN'` 才取
   `getCurrentChoiceIds`；`publishedDice` 做防御性同源门控（相位越
   过 OPEN/CLOSED 才过滤日志，D6）。修复后 A13/A14 测试真实通过。

2. **`resolveWorldStateKey` 初版漏了 `danger` 容器**（D5）：跨查
   `packages/chapter-compiler/src/pass5ReachableState.ts` 键构造
   （`add('danger.level', ...)`/`add('danger.tensionKey', ...)`）与
   真实 fixture `host.public.json`（`"danger.level": "HIDDEN"`/
   `"danger.tensionKey": "HIDDEN"`）发现 `WorldState.danger` 会被
   构造为 `danger.level`/`danger.tensionKey` 两种键，而初版
   `resolveWorldStateKey` 无 `danger` 分支，任何 `danger.` 依赖都会
   落回 `undefined` → 依赖它的 PUBLIC 事实被 default-reject 误杀。
   修复：补 `container === 'danger'` 分支（`level`/`tensionKey`），
   与既有容器分支并列，零其他改动。

两处修复均**未改动任何冻结文件**（只改本节点新增的
`publicState.ts`），`machine.ts`/`snapshot.ts`/`chapter-schema`/
`pass5ReachableState.ts` 等一律 Read-only 未触碰。请 AUDITOR 以该
`git_head` 独立核验 A01–A24，重点复核上述两个缺陷的修复是否恰当、
A13/A14 测试是否真实覆盖修复语义。

## 请 AUDITOR 核验

请 AUDITOR 以该 `git_head` 独立核验 A01–A24。
