---
msg_id: "0303"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-064
in_reply_to: "0302"
created_at: 2026-09-08
requires_response: true
---

# TASK_PACKAGE — DEV-064

M6（Operations）第五个节点：OBS Control。详见
`specs/tasks/TASK-PACKAGE-DEV-064.md`。

新建 `packages/platform-obs`：真实 OBS WebSocket v5 客户端（Hello/
Identify/Identified 握手 + 可选 SHA256 双重哈希鉴权 + Request/
RequestResponse 切场景请求），支持第 49 节六个封闭场景（`BOOT`/
`LIVE`/`RECONNECTING`/`MAINTENANCE`/`ERROR`/`ENDING`）。

USER 已就"OBS WebSocket 是具体外部协议、该建真实客户端还是接口+
noop"裁决：**建真实客户端**（同 DEV-040/041 先例），注入式
WebSocket 便于测试，凭据可选退化为 noop。明确**不实现任何重连
逻辑**，也**不实现任何"何时该切场景"的判断**——第 48-49 节把
OBS 定位为纯执行端，DAG.md 第 403 行把决策权划给未来 DEV-065
SAFETY region（CR-020）。生产代码零依赖，`ws`/`@types/ws` 只作
测试依赖起假 OBS server。

DEV-064 转 `IN_PROGRESS`。
