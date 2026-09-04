# DEV-042 DECISIONS

本文件记录 DEV-042（Chat Message Adapter）施工中的关键决策。权威依据为
`specs/tasks/TASK-PACKAGE-DEV-042.md`（Task Package）、`specs/baseline/
DEV_SPEC_V1.0.md` 第 43 节、`specs/dev/DAG.md`（CR-017，第 242 行）。

## D1 — 为何新建 `platform-core`，而不是把类型直接放进 `platform-twitch`

`NormalizedChatMessage` 是 DAG.md CR-017 裁决的"Runtime 核心唯一认识的
入站类型"，是**跨平台契约**：未来 DEV-080/081 的 YouTube/Bilibili Adapter
都要产出同一个形状。若把类型定义在 `platform-twitch` 内，后续平台包就
被迫依赖一个单一平台包（或重复定义类型造成漂移）。独立纯类型包
`platform-core`（同 `chapter-schema` 的定位，零依赖、零运行时逻辑）让
所有平台 Adapter 平等地消费同一契约，与 Task Package 第 2.1 节/第 6 节
要求一致。

## D2 — 为何 `platform-core` 只定义 `NormalizedChatMessage`/`ChatHandler`，不定义 `LivePlatformAdapter`

Task Package 第 2.1 节明确：`LivePlatformAdapter`
（`connect/disconnect/onChat/sendChat/getHealth`）**不定义**——完整 Adapter
还缺 DEV-046 的 `sendChat`，需要多节点合作才能拼出。在无消费方时提前定义
接口是投机性抽象（YAGNI），且会把未冻结的形状过早固化。本节点只产出
入站契约（`NormalizedChatMessage`/`ChatHandler`），Adapter 组装留给真正
消费它的节点（DEV-046 之后）。

## D3 — 为何不碰 `Vote`/`PlatformPort`/`runtime-kernel`

`packages/runtime-kernel/src/ports.ts`（DEV-009/012 冻结）已存在
`PlatformPort.onVote(handler: (vote: Vote) => void)` 与
`Vote { viewerId; choiceId }`。`Vote` 是**已被解读出的投票意图**（哪个
观众投了哪个选项），不是原始聊天消息；把聊天文本解析成 A/B/C/D 投票并
调用 `PlatformPort.onVote` 是 DEV-044（Interaction Aggregator）的职责。
`NormalizedChatMessage` 是 Adapter 层产物，`Vote` 是 Aggregator 层产物，
中间还差一层（DEV-044）。本节点在 `platform-twitch` 侧产出
`NormalizedChatMessage` 即止，不触碰 `runtime-kernel`/`PlatformPort`/
`Vote` 任何调用点。

## D4 — `messageId` 为何复用 DEV-041 保留的 EventSub envelope `message_id`，而不重新发明

DEV-041（`eventSubClient.ts` 冻结）已在 `TwitchChatNotification.messageId`
中保留了 EventSub envelope 的 `metadata.message_id`，注释明确"供 DEV-043
去重使用"。本节点转换时直接透传该字段
（`messageId: notification.messageId`），使 DEV-043 去重可以按同一个 key
工作——去重逻辑只需消费 `NormalizedChatMessage.messageId`，无需知道
Twitch EventSub 内部细节。若在此重新生成/发明一个 id，会破坏与
DEV-043 的衔接，且引入平台特有的 id 语义到平台无关契约中。

## D5 — 诚实失败：返回 `undefined` 而非抛异常

`normalizeTwitchChatMessage` 对订阅类型不匹配、`event` 非对象、
`chatter_user_id` 缺失/非字符串、`message.text` 缺失/非字符串均返回
`undefined`（Task Package 第 2.2 节）。理由：一个 WebSocket 通知流里出现
不认识的订阅类型/畸形 payload 是**正常现象**而非程序错误，静默忽略
（`createTwitchChatOnNotification` 只在非 `undefined` 时调 handler）比
抛异常更符合事件流语义；同时不猜测、不填充默认值，诚实表达"这条通知
不适用/无法解读"。

## D6 — 转换函数做成纯函数 + 外部包装，不改冻结的 `eventSubClient.ts`

转换逻辑收敛在纯函数 `normalizeTwitchChatMessage`（输入
`TwitchChatNotification`，输出 `NormalizedChatMessage | undefined`），
`createTwitchChatOnNotification(handler)` 只是返回一个与
`EventSubClientConfig.onNotification` 形状完全兼容的包装函数，可直接传给
`createEventSubClient({ ...config, onNotification: ... })`。DEV-041 的
`onNotification` 签名本身足够，无需修改冻结代码（Constraint 2）。

## D7 — 校验用 `typeof`，零新增第三方依赖

本节点的校验只是几个字段的 `typeof` 检查，不需要 zod（Constraint 5：
不新增任何第三方 npm 依赖）。`platform-core` 是零依赖纯类型包；
`platform-twitch` 仅追加 workspace 内部依赖
`@interactive-story/platform-core: workspace:*`（非第三方）。
