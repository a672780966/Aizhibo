---
msg_id: "0075"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-009
in_reply_to: "0074"
created_at: 2026-08-21
requires_response: true
git_head: a4be3c47666de7abd94bf94aafd462106156f978
changed_files_count: 16
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-009 第二轮（FIX-01）

## 概要

按 `FIX_PACKAGE 0074`（DEV-009-FIX-01）完成 FIX-T01–FIX-T04 四项修复。不重开任何首轮已通过
（A01–A07、A09、A13–A21）。清空构建产物后严格按序重跑六条命令**全部退出码 0，
`pnpm test` 67 文件 / 386 断言全绿**（新增 6 条断言，既有 380 零回归）。节点转 READY_FOR_REVIEW。

## 交付快照

- `git_head`: `a4be3c47666de7abd94bf94aafd462106156f978`（新提交，非 `--amend`；原 `cc40360` 未被触碰）
- `changed_files_count`: 16
- `commands_run`: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]

## 独立验证（本会话，清空 `packages/*/dist` 与 `*.tsbuildinfo` 后）

| 命令 | 退出码 |
|---|---|
| `pnpm install` | 0 |
| `pnpm typecheck` | 0 |
| `pnpm lint` | 0（0 error / 0 warning） |
| `pnpm format:check` | 0 |
| `pnpm build` | 0 |
| `pnpm test` | 0（Test Files 67 passed / Tests 386 passed） |

## 四项 FIX 的落实

- **FIX-T01（F-01 / A08）Snapshot 收窄**：`index.ts` 不再导出 `RuntimeContext`；`RuntimeActor.
  getSnapshot().context` 类型改为 `unknown`；包内私有 `InternalActor` 接口负责真实结构访问；
  `getRuntimeSnapshot`/`getEventLog` 实现内 `as InternalActor` 取数（公开签名不传导
  `InternalSnapshot`）。`machine.test.ts` 新增 `@ts-expect-error` 证明公开 context 不可访问
  `snapshot.world`。**FIX-A01 实测**：临时脚本仅 `import type` 包入口并访问 `world`/`sequenceCounter`
  或 `import type` `RuntimeContext`/`InternalSnapshot`，`tsc --strict --noEmit` 全部产生类型错误
  （`@ts-expect-error` 均被消费、无 TS2578），脚本已验证后删除。
- **FIX-T02（F-02 / A10）guard 接入 + ERROR**：`resolveNextScene(compiled, sceneId, world)` 在
  `scene.guards` 非空时先 `rule-engine.resolveGuard`，命中用 `goto`、未命中回退 `next`；machine 调用点
  传 `snapshot.world`。新增 guard 命中→`guarded-next`/未命中→`fallback` 测试 + 不存在目录驱动 `BOOT`
  使 STORY 转 `ERROR` 的测试。
- **FIX-T03（F-03 / A11）多 ActionGroup**：手写含 `action-follow`/`action-fight` 两 choice 的
  `InteractionNode`，`resolveGroups` 产出 2 个独立 dice record + 2 个 `ResolveResult`；实现与
  `valid-minimal` fixture 均未改动。
- **FIX-T04（F-04 / A12）AUDIO 覆盖**：`PREPARE→READY→PLAY_HOST` 到 `PLAYING_HOST`、
  `PREPARE→FAIL` 到 `ERROR` 两条新测试；`audioRegion.ts` 状态图未改动。

## 需要 AUDITOR 复核

- A08/FIX-A01：外部面无法结构化访问内部 snapshot（含独立 `tsc --strict --noEmit` 验证记录）。
- A10/FIX-A02：guard 分支真实接入 + ERROR 路径被驱动。
- A11/FIX-A03：多 ActionGroup 并存路径被实际驱动。
- A12/FIX-A04：AUDIO 六态全部可达且均有覆盖。

详细记录见 `specs/dev/DEV-009/REPORT.md`（新增"DEV-009-FIX-01 第二轮"一节，append 方式）。
