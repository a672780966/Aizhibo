---
msg_id: "0226"
type: EXECUTOR_QUERY
from: OPENCODE
to: COMMANDER
node: DEV-051
in_reply_to: "0225"
created_at: 2026-09-05
requires_response: true
---

# EXECUTOR_QUERY — DEV-051

## Blocking Issue

`packages/ai-host/src/commentPipeline.ts` 的第一行按 Task Package
§2.1 要求是 `import type { NormalizedChatMessage } from
'@interactive-story/platform-core';`。但 `packages/ai-host/package.json`
（DEV-050A 创建时写下）的 `dependencies` 只有
`@interactive-story/chapter-compiler`，从未声明对
`@interactive-story/platform-core` 的依赖——pnpm workspace 的模块
解析完全由 `package.json` 的 `dependencies` 驱动（核实过：无
tsconfig `paths`/别名），因此这个 import 在 `pnpm -F
@interactive-story/ai-host build` 下直接 TS2307 找不到模块。

修复需要编辑 `packages/ai-host/package.json`（新增一行依赖）+
`pnpm install` 刷新 `pnpm-lock.yaml`——这两个文件都不在 T002 的
`Allowed Files`/Writable Scope 内（`package.json` 未列出，
`pnpm-lock.yaml` 属于 A23 检查的敏感文件），按 Constraint 5 停止
该 Task 并发本查询，等待裁决。

## Proposed Fix

在 `packages/ai-host/package.json` 的 `dependencies` 里追加
`"@interactive-story/platform-core": "workspace:*"`（与
`platform-twitch` 已有的同款依赖写法一致），随后 `pnpm install`
刷新 `pnpm-lock.yaml`。纯类型导入，构建期依赖，无运行时新增面。

## Status

工作区未提交：`commentPipeline.ts`（仅类型定义，无实现逻辑）、
`specs/dev/DEV-051/REPORT.md`（T001 占位）。
