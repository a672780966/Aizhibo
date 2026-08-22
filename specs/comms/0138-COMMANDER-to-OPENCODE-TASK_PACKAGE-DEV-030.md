---
msg_id: "0138"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-030
created_at: 2026-08-23
requires_response: true
---

# TASK_PACKAGE — DEV-030

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-030.md`

## 前置状态

M2 全部 9 个节点已 `DONE`。本节点是 M3（Audio Complete）第一个节点，只依赖已冻结
的 DEV-012，不依赖 M2 任何节点。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-030.md`——**第 1/2 节务必先读**：本节点首次创建
   `packages/audio-engine`，只定义 CR-018 的四级音频解析决策链（纯函数 + 可注入
   Port），**不接入任何真实 TTS/缓存/预生成**（DEV-034/035/036/074 都还没建）。
   全部默认 Port 返回"不可用"，任何请求都会 fallthrough 到 `SUBTITLE_ONLY`——这是
   如实反映现状的正确行为。BGM/SFX/AMBIENCE 已由 DEV-027 完整处理，不在本节点
   范围内（本节点只服务 SPEECH/叙事旁白）。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

不把决策函数接入 `runtime-kernel` 任何 action——本节点只定义，接入是未来某个 M3
节点的职责。不做拼接听感原型验证（需要真实 TTS 输出，现在没有）。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库；`INDEX.md` 的 `Status:` 表头请主动改到位。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
