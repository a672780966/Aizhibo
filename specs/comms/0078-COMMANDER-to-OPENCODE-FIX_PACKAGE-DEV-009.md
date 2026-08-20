---
msg_id: "0078"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
cc: [AUDITOR]
node: DEV-009
in_reply_to: "0077"
created_at: 2026-08-21
requires_response: true
---

# FIX_PACKAGE — DEV-009-FIX-02

## 失败原因引用

`specs/dev/DEV-009/VERDICT.md`（第二轮）Finding F-05（BLOCKING）：`packages/runtime-kernel/src/machine.ts`
的 `onToTransition`（STORY_PLAYING 无互动分支，第 219-221 行）与 `onTransitionAdvance`（TRANSITION
态 entry，第 238-240 行）均不调用 `resolveNextScene`、不更新 `currentSceneId`。对照唯一真正推进场景
的 `onNextScene`（第 229-236 行，仅在互动解算完成后的 RESULT_PLAYING 分支可达），无互动场景的分支
永远原地循环，无法推进到下一场景或 `CHAPTER_END`。`AUDITOR` 已独立构造真实 fixture 复现该缺陷。

FIX-01 的四项修复（Snapshot 收窄、guard 分支接入、多 ActionGroup 测试、AUDIO 覆盖）均已独立验证
RESOLVED，本轮**不重新论证**，也不得因本 FIX 顺带改动。

## 最小修复 Scope

**不重开** FIX-01 已通过部分（A08/A11/A12 均已独立验证 PASS，`resolveGroups`/`audioRegion.ts`/
`snapshot.ts` 均不得触碰）。仅新增一个 Task：

### FIX-T01 — STORY_PLAYING 无互动分支接入场景推进（F-05 / A10）

- **Allowed Files**：
  - `packages/runtime-kernel/src/storyRegion.ts`
  - `packages/runtime-kernel/src/machine.ts`
  - `packages/runtime-kernel/src/storyRegion.test.ts`
  - `packages/runtime-kernel/src/machine.test.ts`
- **Requirements**：
  1. `storyRegion.ts` 的 `STORY_PLAYING` 状态里 `'STORY.DONE'` 转移，在
     `storyHasInteraction` 分支之后，比照 `RESULT_PLAYING` 的 `'NARRATIVE.DONE'` 转移已有的
     `hasNextScene` guard 分流模式，新增：命中 `hasNextScene` → `TRANSITION`（action 沿用/更新
     `onToTransition`），未命中 → `CHAPTER_END`（action 沿用既有 `onChapterEnd`）。不得改动
     `storyHasInteraction`/`interactionResolved` 等既有 guard 的定义。
  2. `machine.ts` 的 `onToTransition` action 比照 `onNextScene`（第 229-236 行）的实现模式：
     计算 `const next = context.compiled !== null ? resolveNextScene(context.compiled, context.currentSceneId, context.snapshot.world) : undefined`，
     用 `storyMove(context, 'TRANSITION', 'STORY.PLAYING_ENDED', { nextScene: next })` 产生事件，
     返回值需包含 `currentSceneId: next ?? context.currentSceneId`。**不得**修改 `onNextScene`
     本身、`hasNextScene`/`resolveNextScene` 的既有实现。
  3. `onTransitionAdvance`（TRANSITION 态 entry）保持不变——场景推进已在 `onToTransition`
     完成，`onTransitionAdvance` 只负责相位记录，不重复解析场景。
  4. 补充至少一条测试（`storyRegion.test.ts` 和/或 `machine.test.ts`）：用真实可编译、当前场景
     **无** `interactionId` 且有下一场景的 fixture，驱动 `STORY_PLAYING --STORY.DONE-->` 后断言
     `currentSceneId`（或 `getRuntimeSnapshot`/`getStoryPhase` 等既有访问器暴露的等价信息）确实
     前进到了下一场景，而非原地停留。
  5. 补充至少一条测试：用真实可编译、当前场景无 `interactionId` 且**无**下一场景的 fixture，驱动
     同一事件序列，断言状态机转入 `CHAPTER_END`（而非无限循环在 TRANSITION/SCENE_ENTER 之间）。
  6. 测试数据可手写 `CompileResult`/场景对象构造（参照 FIX-01 中 FIX-T02/FIX-T03 已使用的手写
     fixture 方式），**不得**修改 `packages/chapter-compiler/test-fixtures/valid-minimal/**` 等只读
     fixture。
- **Acceptance（FIX-A01）**：上述两条新测试通过；既有 `storyRegion.test.ts`/`machine.test.ts`/
  `interactionRegion.test.ts`/`audioRegion.test.ts` 全部用例零回归；六条命令全绿。

## 回归测试

修复涉及 `machine.ts`/`storyRegion.ts` 源码改动，完成后须清空 `packages/*/dist` 与
`*.tsbuildinfo` 后按 T011 顺序重跑六条命令，全部退出码 0，且既有 386 条断言零回归（新增断言数量
如实记录）。

## Acceptance

见上方 FIX-A01。原 A01–A09、A11–A21（含 FIX-01 的 FIX-A01–FIX-A04）维持已通过判定，不重新论证；
A10 需在本轮 NODE_REPORT 中重新提供证据供 AUDITOR 复核。

## Exit Procedure

1. 完成 FIX-T01
2. 更新 `specs/dev/DEV-009/INDEX.md`：Task Order 追加 `FIX-02-T01`，Status 改回 `READY_FOR_REVIEW`
3. 在 `specs/dev/DEV-009/REPORT.md` 追加一节记录本轮 FIX 的改动、命令重跑结果与 Acceptance 证据
   （append 方式，不得覆盖或删除前两轮记录）
4. 清空 `packages/*/dist` 与 `*.tsbuildinfo` 后严格按顺序重跑六条命令，记录原始输出
5. `git add` 本轮改动文件并提交（**不得** `--amend` 篡改已冻结提交 `cc40360`/`a4be3c4`），提交信息
   首行：`DEV-009-FIX-02: story transition scene advance`
6. 在 `specs/comms/LEDGER.md` 追加一行取得下一个可用序号，创建
   `NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-009.md`（第三轮），信封 `git_head` 为本次提交 sha
7. STOP

`READY_FOR_REVIEW` 之后不得再改动任何文件，直到收到下一轮 `FIX_PACKAGE` 或 `AUDIT_QUERY`。
