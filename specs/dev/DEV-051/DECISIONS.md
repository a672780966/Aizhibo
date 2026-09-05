# DEV-051 DECISIONS

本文件记录 DEV-051（Comment Pipeline）实现中的关键决策与理由。Task
Package 第 6 节要求的五个要点逐一覆盖（D1–D5）。

## D1 — 为何不用 AITuber OnAir 的 comment-intelligence npm 包，而是自行实现

**决策**：不引入 `comment-intelligence` 包，在本仓库内自行实现流水线；
设计上借用该包的"cluster → priority → select"理念，但不直接使用其
包或代码。

**理由**：
- 本仓库从未引入未经审查的第三方业务逻辑依赖。`comment-intelligence`
  尚未经过本仓库的安全审查、许可证审查与 API 稳定性审查，不满足新增
  依赖的门槛（Forbidden Scope 明确"新增第三方 npm 依赖（含 AITuber
  OnAir 的 comment-intelligence 包）"）。
- 节点需求（Safety / 聚类 / 优先级 / 只读 select）本身只需几十行确定性
  逻辑，引入外部包带来的供应链与维护成本远超收益。
- 结论：借鉴其设计理念（该理念亦见于 Dev Spec 第 40 节描述），以本仓库
  零依赖的既有类型（`NormalizedChatMessage`）为边界自行实现。

## D2 — 为何 Topic Cluster 简化为归一化文本精确匹配聚类，而非真正的语义聚类

**决策**：聚类键 = `normalize(text)` = `text.trim().toLowerCase()`，对
归一化后的字符串做精确匹配；不引入 embedding/向量相似度做语义聚类。

**理由**：
- 真正的语义聚类需要 embedding/向量模型，超出本节点 rules-first、
  零 LLM 依赖的范围（Forbidden Scope：不做语义聚类、零 LLM）。
- 归一化文本精确匹配已能合并同一条评论在大小写、首尾空白上的差异
  变体（如 `Hello There` 与 `  hello there  ` 聚为同一簇）——这正是
  chat 评论中最常见、无需模型即可确定的重复来源。
- 归一化键同时是确定性的、可测试的（A09 逐字验证）；语义聚类结果
  不可预测，无法做确定性验收。

## D3 — 为何 Priority 只用簇大小（count）与最近收到时间（latest.receivedAt）两个确定性维度

**决策**：`selectCandidate()` 按 `count` 降序，`count` 并列时按
`latest.receivedAt` 降序。不做模糊匹配、情感分析、关键词权重。

**理由**：
- Dev Spec 未定义任何具体的优先级权重公式——不发明规则（与 DEV-050
  "Dev Spec 未定义就不发明"的取舍先例一致）。模糊匹配/情感分析/关键词
  权重既无规范依据，也超出零 LLM 的范围。
- 簇大小代表该话题的热度：被越多观众以归一化相同文本表达的话题越值得
  被选中，是最简单且确定性的热度信号。
- 时间戳仅作为并列时的次要排序键，保证同热度下"最近的簇"胜出，使排序
  在相等情况下仍有确定结果（A11 验证并列行为）。

## D4 — maxLength（缺省 500）/ maxPending（缺省 100）默认值的选择理由

**决策**：`maxLength` 缺省 500（字符），`maxPending` 缺省 100（簇）。
两值均可经 `config` 覆盖。

**理由**：
- `maxLength = 500`：与聊天消息平台的常见长度上限量级一致（各平台单条
  chat 消息上限普遍在数百字符量级），超过该量级的输入在本场景几乎可以
  断定是垃圾/异常内容，而非正常观众评论。
- `maxPending = 100`：参考 DEV-043 消息去重环形缓冲区（`maxSize=1000`）
  的同类有界容量设计先例——有界窗口避免状态无限增长；本节点的"簇"粒度
  天然远小于"条"，取 100 已足够容纳一轮话题的活跃簇集合。A16 以缺省值
  验证（500/100 符合文档）。

## D5 — 为何 selectCandidate() 设计为只读查询，而非"取出即清空"

**决策**：`selectCandidate()` 只读返回当前最高优先级候选（无候选返回
`undefined`），不清除任何状态；清空操作显式交给独立的 `clear()`。

**理由**：
- 允许调用方（未来的 Host Scheduler 等）反复查询当前最高优先级候选而
  不产生副作用——查询与消费解耦，调用方可自行决定"选中后何时才算真正
  处理完、需要清空"。
- 清空是副作用明确的独立操作，显式命名（`clear()`）比隐式
  "取出即清空"的职责边界更清晰，避免"只是看一眼"却意外消费掉候选的
  隐式行为。
- 便于测试验证：A13 断言连续调用（不 ingest/clear）结果一致，直接证明
  只读不清空；A15 单独验证 `clear()` 后重新 ingest 正常。
