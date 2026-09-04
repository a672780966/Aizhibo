# DEV-043 DECISIONS

本文件记录 DEV-043（Message Deduplication）的关键决策与理由。Task Package
第 6 节要求的四个要点逐一覆盖（D1–D4），另有 D5–D6 补充记录实现细节决策。

## D1 — 为何是有界内存去重，而非持久化存储

**决策**：不引入数据库/持久化，用进程内的 `Set` + FIFO 数组实现有界去重
（默认 `maxSize=1000`）。进程重启后去重窗口自然重置。

**理由**：
- Dev Spec 第 44 节描述的重复投递是 EventSub "至少一次投递"下**网络层短
  时间窗口内的重试**——同一 notification 的重复帧在秒级窗口内到达。窗口
  远小于进程生命周期，跨进程重启保留历史对去重毫无帮助（重启后新会话
  的重复帧也只与同一会话内的历史重复）。
- 去重是**性能/正确性优化而非持久化业务数据**：丢失窗口（重启后第一条
  重复帧不被拦截）最坏只是 handler 被多调用一次，不造成数据损坏。
- 引入持久化会带来存储依赖、清理策略、写放大等成本，与"零新增依赖 +
  零持久化"的节点约束冲突。`packages/persistence` 服务的是持久业务对象，
  不是瞬时网络去重窗口。

## D2 — 为何包装 `TwitchChatNotification` 层，而非 `ChatHandler`/`NormalizedChatMessage` 层

**决策**：`createDedupingOnNotification` 包装 DEV-041 的
`onNotification` 回调（`TwitchChatNotification` 层），不包装 DEV-042 的
`ChatHandler`/`NormalizedChatMessage`。

**理由**：
- Dev Spec 原文"相同通知可能重复"针对的是 EventSub **全部**订阅类型的
  `notification` 帧（本项目目前只订阅 `channel.chat.message`，但机制不
  应假设只有这一种）。去重依据的 `metadata.message_id` 是 EventSub
  envelope 层字段（DEV-041 已冻结保留为 `TwitchChatNotification.messageId`），
  与消息类型无关——它天然属于 notification 层。
- 包装 `ChatHandler` 层会把去重能力绑死在 chat 一种消息类型上，未来新增
  订阅类型（follow/subscribe/raid…）时每个类型都要重新做一次去重，违背
  去重的通用性。
- 两者可组合且顺序正确：先归一化（`createTwitchChatOnNotification`）再
  去重，还是先去重再归一化，对本节点等价；选择包装 notification 层使
  `TwitchChatNotification` 成为去重的**唯一**入参，未来任何订阅类型的新
  Adapter 都能直接复用 `createDedupingOnNotification`。

## D3 — `maxSize` 默认值 1000 的理由

**决策**：默认 `maxSize=1000`，可经 `MessageDeduplicatorConfig` 覆盖。

**理由**：
- 1000 是一个覆盖聊天场景的实用量级：一小时内高频聊天（数十条/分钟）
  的去重窗口约需几百条容量，1000 有充足余量；每条记录是一个 string
  引用 + 一个数组元素，约几十字节，1000 条内存成本远低于 1MB，可忽略。
- 同时它是有界的：避免无限增长导致内存泄漏（这是"有界"去重的核心）。
- 业务上无需用户调参；暴露 `maxSize` 仅为测试（小窗口验证淘汰边界）
  与极端场景（超高频）留出确定性接口，默认值按 Dev Spec 与 Task Package
  第 2.1 节取 1000。

## D4 — 重复 id 不重新插入（不"续命"）的确定性理由

**决策**：`seen(id)` 对已见过的 id 返回 `true`，**不**把它重新插入
FIFO 队列尾部。

**理由**：
- 若重复帧"续命"（每次重复都把它挪到队尾），一个被反复重投的 id 会在
  窗口内永远不被淘汰，挤占其他真实新消息的容量——去重窗口被单个
  顽固 id 污染，行为不可预期。
- "不续命"保证确定性：某 id 首次出现后，无论之后重复多少次，它的淘汰
  位置都固定为首次插入时的队首序号，窗口演进只由**首次见到**的 id
  序列决定。这让窗口行为可预测、可测试（Task Package 第 12 节 A09 即
  用"满窗重复 id 应最早被淘汰"验证此性质）。
- 语义上"最近见到"对去重无意义：一旦判重（返回 `true`），该 id 的去重
  使命已完成，后续是否被淘汰只影响"未来若再次出现是否会被当作新消息"
  ——由淘汰时间决定，不由重复次数决定。

## D5 — 数据结构：`Set` + FIFO 数组

`Set<string>` 提供 O(1) 判重，`order: string[]` 记录插入顺序；超容量时
`order.shift()` 取队首（最旧）并从 `Set` 删除。两个结构同步维护，查找
与淘汰均 O(1)。未引入任何 LRU/缓存第三方库（原生结构足够，节点约束
"零新增 npm 依赖"）。

## D6 — 默认 deduplicator 的归属

`createDedupingOnNotification(handler)` 不传 deduplicator 时内部新建
默认实例（`maxSize=1000`），使单个包装函数开箱即用；传入实例则可跨多个
notification 源共享同一去重窗口（同一 EventSub 连接的全部订阅共享一个
窗口即可覆盖"相同通知重复"）。
