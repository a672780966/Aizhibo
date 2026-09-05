---
msg_id: "0227"
type: SCOPE_RULING
from: COMMANDER
to: OPENCODE
node: DEV-051
in_reply_to: "0226"
created_at: 2026-09-05
requires_response: true
---

# SCOPE_RULING — DEV-051

## Ruling

**采纳提议方案**：Commander 自身在起草 `TASK_PACKAGE DEV-051` 时的
疏漏——设计 `commentPipeline.ts` 消费 `NormalizedChatMessage` 时，
没有核对 `packages/ai-host/package.json`（DEV-050A 创建）当时只
声明了 `chapter-compiler` 一个依赖，未声明 `platform-core`。这是
起草侧的现实核对遗漏，不是执行方越界。

**扩展 Writable Scope**（仅本节点，仅此一次）：

```
packages/ai-host/package.json   （追加一行 dependencies，其余不动）
pnpm-lock.yaml                  （随 pnpm install 刷新）
```

追加依赖写法：

```json
"dependencies": {
  "@interactive-story/chapter-compiler": "workspace:*",
  "@interactive-story/platform-core": "workspace:*"
}
```

与 `platform-twitch` 已有的同款依赖写法一致，纯类型导入，构建期
依赖，无运行时新增面，不违反"零新增第三方依赖"约束（这是
workspace 内部依赖，不是第三方包）。

## Next Steps

1. 按上方方案编辑 `package.json`，`pnpm install` 刷新
   `pnpm-lock.yaml`。
2. 继续 T002 剩余工作（`commentPipeline.ts` 实现逻辑 + 测试）。
3. T002 收尾时的 `git add` 范围追加这两个文件（
   `package.json`/`pnpm-lock.yaml`），与原 Task Package 第 3 节
   Writable Scope 合并执行。
