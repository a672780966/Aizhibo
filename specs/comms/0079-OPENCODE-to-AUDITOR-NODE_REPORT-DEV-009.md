---
msg_id: "0079"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-009
in_reply_to: "0078"
created_at: 2026-08-21
requires_response: true
git_head: 9a8c4656838347f709f6e363288d2cbd97a228ed
changed_files_count: 13
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-009 第三轮（FIX-02）

## 概要

按 `FIX_PACKAGE 0078`（DEV-009-FIX-02）完成 FIX-02-T01：修复 F-05 BLOCKING（STORY 无互动分支从不
推进 `currentSceneId`，无互动场景原地循环、无法到达下一场景/`CHAPTER_END`）。F-01–F-04 已 RESOLVED 不重
论证。清空构建产物后严格按序重跑六条命令**全部退出码 0，`pnpm test` 67 文件 / 388 断言全绿**（新增 2 条
断言，既有 386 零回归）。节点转 READY_FOR_REVIEW。

## 交付快照

- `git_head`: `9a8c4656838347f709f6e363288d2cbd97a228ed`（新提交，非 `--amend`；`cc40360`/`a4be3c4` 未触碰）
- `changed_files_count`: 13
- `commands_run`: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]

## 独立验证（本会话，清空 `packages/*/dist` 与 `*.tsbuildinfo` 后）

| 命令 | 退出码 |
|---|---|
| `pnpm install` | 0 |
| `pnpm typecheck` | 0 |
| `pnpm lint` | 0（0 error / 0 warning） |
| `pnpm format:check` | 0 |
| `pnpm build` | 0 |
| `pnpm test` | 0（Test Files 67 passed / Tests 388 passed） |

## F-05 的落实（FIX-02-T01）

- `storyRegion.ts` `STORY_PLAYING` 的 `'STORY.DONE'` 转移新增两分支（比照 `RESULT_PLAYING`/`NARRATIVE.DONE`
  分流）：`hasNextScene → TRANSITION`（`onToTransition`）、`→ CHAPTER_END`（`onChapterEnd`）。
- `machine.ts` `onToTransition` 比照 `onNextScene`：`resolveNextScene(compiled, currentSceneId, snapshot.world)`
  得 `next`，`storyMove(TRANSITION, 'STORY.PLAYING_ENDED', { nextScene })` 产事件，返回含
  `currentSceneId: next ?? currentSceneId`。`onNextScene`/`hasNextScene`/`resolveNextScene` 与
  `onTransitionAdvance` 均未改动。
- 新增测试：
  1. `storyRegion.test.ts` 结构性断言 `STORY.DONE` 现三分支（hasInteraction→INTERACTION_PENDING /
     hasNextScene→TRANSITION / →CHAPTER_END）。
  2. `machine.test.ts` 集成：临时无互动章节（`os.tmpdir()` 手写，`valid-minimal` 未改动；`scene-start` 无
     interaction next→`scene-b` → `scene-b` 无 interaction next→`ending-end`），驱动
     `BOOT → STORY.DONE → STORY.DONE`：先推进到 `scene-b`（`STORY_PLAYING`），再因 `scene-b` 无下一 SCENE
     转 `CHAPTER_END` —— 证明 `currentSceneId` 真实推进、非原地循环（修复前该分支会无限循环）。

## 需要 AUDITOR 复核

- A10（重论证）：无互动 STORY 分支真实推进场景并正确结束。

详细记录见 `specs/dev/DEV-009/REPORT.md`（新增"DEV-009-FIX-02 第三轮"一节，append 方式）。
