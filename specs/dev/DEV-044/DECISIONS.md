# DEV-044 DECISIONS

本文件记录 DEV-044（Interaction Aggregator A/B/C/D）的关键决策与理由。
Task Package 第 6 节要求的要点逐一覆盖（D1–D3），另有 D4–D5 补充记录
实现细节决策。

## D1 — 为何本地镜像 `Vote`，而不 import/依赖 `runtime-kernel`

**决策**：在 `platform-core` 内本地镜像一个与 `runtime-kernel` 冻结的
`Vote{viewerId, choiceId}` 结构相同的接口，**不** `import
@interactive-story/runtime-kernel`，也**不**修改
`packages/runtime-kernel/**`。

**理由**：
- **依赖方向**：`platform-core` 是中立层，被包括 `runtime-kernel` 在内的
  下游消费。若 `platform-core` import `runtime-kernel`，依赖方向倒转，
  形成环（`runtime-kernel` → `platform-core` → `runtime-kernel`），破坏
  分层。
- 这与 DEV-035/037/040 对 `Health`/`Clock` 的处理方式一致：跨层复用的
  形状在消费方本地镜像，依赖只沿"中立层 → 无依赖"方向延伸。
- 镜像形状与 `PlatformPort.onVote` 完全同构，未来编排节点接入
  `runtime-kernel` 时按结构赋值即可（结构类型系统下无成本）。
- 顺带满足 A13（`runtime-kernel/**` 未被修改、未被 import/依赖）。

## D2 — 解析规则窄化为精确单字母匹配（trim+大写）的理由

**决策**：`ingest` 仅当 `message.text.trim().toUpperCase()` 精确等于
`'A'`/`'B'`/`'C'`/`'D'` 之一时合成 `Vote`；其余输入（`'hello'`、
`'AB'`、空串、`'A B'`、带表情/标点等）一律静默忽略。

**理由**：
- Dev Spec 只定义了观众输入形态为 A/B/C/D 单选（第 50 行"观众
  A/B/C/D"），并未要求任何更复杂的解析——模糊匹配/NLP 属于过度设计
  （Task Package 明确列入 Forbidden：不做模糊匹配解析）。
- 精确匹配保证**确定性**：任何输入在任意时刻解析结果唯一，行为可
  预测、可测试（Task Package 第 11 节测试清单与第 12 节 A07/A08 全部
  按精确语义断言）。
- trim+大写是唯一允许的归一化：吸收大小写与前后空白（观众手输差异），
  但**不**吸收内部空白/中缀内容——`'A B'` 是"AB"的候选不是"A"的候选，
  宁可漏判也不误判（误判会污染投票语义）。
- 零新增依赖：纯字符串比较，不需要任何解析库（Constraint 4）。

## D3 — 为何不做去重 / 频率限制

**决策**：`ingest` 不做消息去重，不做多次投票限制/频率限制。

**理由**：
- **去重**：DEV-043 已在更上游的 notification 层（Twitch EventSub
  `message_id` 维度）完成有界去重，`ingest` 假设收到的
  `NormalizedChatMessage` 已是去重后的。再在聚合层做一次是重复劳动，
  且跨层语义重叠会造成行为不确定（两层窗口不一致时结果依赖时序）。
- **多次投票限制/频率限制**：Dev Spec 未要求；同一直播场景下"一人能否
  反复投票、投票频率上限"是产品语义决策，需在编排层与规则引擎层定义
  （依赖 session/观众状态），不是纯解析原语该管的事。本节点交付的是
  无状态解析器，把这些策略留给未来节点，避免在错误层级冻结产品规则。
- 若未来需要，应在 `InteractionAggregator` 之外的编排层加状态（本接口
  保持无状态纯函数式契约）。

## D4 — `onVote` 单一注册、覆盖式语义

**决策**：`onVote(handler)` 只保存一个 handler，二次调用覆盖第一次。

**理由**：
- 与 `runtime-kernel` 冻结的 `PlatformPort.onVote` 签名/语义一致
  （`noopPlatformPort` 同样是单一 handler 风格）——本接口设计目标就是
  未来编排节点可把聚合器 handler 直接接到 `onVote`，语义必须对齐。
- 覆盖式在架构上是"唯一活跃投票处理者"模型：同一时刻只有一个下游
  关心投票事件，覆盖即表达"换接收方"而非"累积订阅"。累积订阅会引入
  退订/生命周期管理负担，与冻结语义不符。
- 未注册 handler 时 `ingest` 静默忽略、不抛异常（A09）：投票事件无人
  消费是合法中间态（如编排尚未接线），不应以异常惩罚。

## D5 — handler 调用在 `ingest` 内同步完成，不投递到异步队列

**决策**：`ingest` 命中有效投票时同步调用 handler，不引入队列/微任务
缓冲。

**理由**：本节点交付的是可独立测试的聚合器原语，同步调用保证
`ingest` 返回后副作用已发生（确定性、易测试，A07/A10/A11 断言无需等
异步）。真实数据流的节流/背压属于未来编排节点接入层的工作
（Task Package：不接入真实数据流），届时由接入方决定缓冲策略，原语
保持同步最简单。
