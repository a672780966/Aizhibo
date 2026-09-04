---
msg_id: "0189"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-044
created_at: 2026-09-05
requires_response: true
---

# TASK_PACKAGE — DEV-044

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-044.md`

## 前置状态

DEV-043（Message Deduplication）已 `DONE`。本节点是 M4 第五个节点，
也是 `NormalizedChatMessage` 的第一个真实消费方（DEV-042 之后）。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-044.md`——**第 1/2 节务必先读**：
   `Vote` 必须本地镜像 `runtime-kernel` 的冻结形状，**绝不 import/依赖
   `@interactive-story/runtime-kernel`**；解析规则窄化为 trim+大写精确
   匹配 A/B/C/D，不做模糊匹配；不接入任何真实数据流或 runtime-kernel。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

只允许新建 `packages/platform-core/src/interactionAggregator.ts(.test.ts)`
+ `index.ts`（追加导出）。`packages/runtime-kernel/**` 一律不得触碰或
依赖；不得新增任何 npm 依赖；不得创建 `packages/ai-host`。

**提交边界（Constraint 8，延续自 DEV-041/042/043）**：T002 commit 之后
不要再提交 LEDGER 追加行或自己的 NODE_REPORT 消息文件。

## 节点状态

`ISSUED` → 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
