# DEV-054 DECISIONS

本文件记录 DEV-054（Viewer Memory）实现中的关键决策与理由。Task
Package 第 6 节要求的五个要点逐一覆盖（D1–D5）。

## D1 — 为何 `host_viewer_memory`/`host_running_jokes` 的建表本身延后到本节点才做

**决策**：两张表的建表动作放在本节点（DEV-054）执行，而非 DEV-010
起草时执行。

**理由**：这是 DEV-010 起草时（CR-017，`specs/dev/DAG.md` 第 52 行及
第 54-60 行"CR-017 执行澄清"）的明确裁定：当时 AI Host 记忆模型还
没有任何已定义的 shape——该记住观众的什么、梗记录该有哪些字段，全篇
没有定义。在毫无依据的情况下建表，纯属猜测列结构，会把猜测结果冻结
成 schema 规范。因此建表本身延后到本节点（M5 才开工），而列约束
（`platform` + `created_at`/`last_seen_at`）作为强制约束提前冻结，
本节点不可重新讨论（Task Package 第 2 节）。

## D2 — 为何 host-memory 包不能有自己的数据库连接或 schema

**决策**：`packages/host-memory` 不持有 DB 连接、不持有 schema、
不 import `node:sqlite`（0249 澄清后仅允许 `import type DatabaseSync`
做类型引用）、不调用 `openDatabase`/`initSchema`、不写任何
CREATE TABLE。

**理由**：这是仓库包结构 Rev 2（`specs/dev/DAG.md` 第 404-413 行）
里明确写的约束：host-memory 不得自持 DB 连接或 schema。schema 与
原始 CRUD 必须全部留在 `persistence` 包，host-memory 只是一层面向
Host 消费语义的转发外壳，数据库实例由外部调用方在 Runtime 组合层
打开后传入（`createHostMemory(db)`）。`node:sqlite` 类型引用（0249）
只做接口签名标注，运行时调用全部落在 persistence。

## D3 — 为何 `note`/`text` 用自由文本字段，不发明结构化的记忆/梗数据模型

**决策**：`host_viewer_memory.note` 与 `host_running_jokes.text` 均为
自由文本 `TEXT NOT NULL`，不发明"该记住观众的什么、梗记录该有哪些
字段"之类的结构化子字段/枚举/取值集合。

**理由**：Dev Spec 全篇没有定义该记住观众的什么、梗记录该有哪些
字段——没有记忆分类、没有结构化模板、没有取值枚举。在此之上发明
结构化字段等于发明一套规范，且一旦入库（interface 冻结、测试锁定）
就会对 Dev Spec 未定义内容形成约束。这与 DEV-052 的 `voiceDescription`
（自由文本复述职责而非固定短语列表）、DEV-053 的 `label`（自由文本
而非封闭枚举）是同一个"不发明未定义内容"的取舍精神：未定义的取值
空间一律不封闭，只保证"有值、可写、可读"，具体语义由规范的拥有者
（未来节点或 USER 配置）填充。

## D4 — 为何 `purge` 要求调用方显式传入每个平台的保留时长，不允许隐式默认值

**决策**：`purge(retentionMsByPlatform: Record<string, number>)` 的
保留时长必须**整个**由调用方按平台显式传入；未列出的 platform 不受
影响。方法内部没有任何隐式/全局默认保留时长。

**理由**：CR-017 明确要求保留策略必须按平台配置、不能硬编码。若本
节点自己发明一个全局默认保留时长，就是在没有依据的情况下硬编码规则
——把猜测的数值冻结成策略。因此选择让调用方必须显式决定每个平台
要不要清理、清理多久；未列入的 platform 本轮不清理，也由调用方显式
决定。方法只负责"按给定配置执行清理"这一机械动作。

## D5 — 为何 `purge` 是调用方主动调用的同步方法，而非后台定时任务

**决策**：`purge()` 是同步、显式调用的方法；不实现任何后台定时清理
任务、不引入定时器/调度循环。

**理由**：Runtime 生命周期与调度是运维里程碑（M6）的职责，不是本
节点的范围（Task Package Forbidden Scope 明确"实现后台定时清理任务"
被禁止）。本节点只负责把清理这个动作本身实现正确——给定保留时长，
同步删除过期数据——不负责决定什么时候触发它。何时调用、多久调用一
次由 M6 的调度层（未来的调用方）决定，本节点不越界替它做调度决策。

## D6 — T003 修正：为什么把 host_viewer_memory 的自由文本 note 字段替换成 Dev Spec 第 42 节定义的结构化字段

**决策**：`host_viewer_memory.note` 自由文本字段替换为 Dev Spec
第 42 节"Host Memory"定义的结构化字段——`viewerId`/`nickname`/
`interactionCount`/`lastSeen`/`knownRunningJokes`/`hostAffinity`/
`notableEvents`（`lastSeen` 对应既有 `last_seen_at` 列）——落为
`nickname`/`interaction_count`/`known_running_jokes`/`host_affinity`/
`notable_events` 等列（CR 0261，USER 已批准）。

**理由**：Dev Spec 第 42 节"Host Memory"用```text 代码块明确定义
了 viewerId/nickname/interactionCount/lastSeen/knownRunningJokes/
hostAffinity/notableEvents 这套结构化字段，并强调"长期只保存：
明确结构化事实"。这是一段没有"例如"字样的规范性
字段列表（对比 DEV_SPEC 中其他带有"例如："字样的示意性段落），
应视为权威 schema。原实现用单一自由文本
note 字段代替，是起草时检索遗漏——当时按"Viewer Memory"关键词检索，
没有搜到 Dev Spec 独立的**第 42 节"Host Memory"**章节标题（CR 0261
背景，TASK-PACKAGE 附录）。本决策收回 D3 中"note 自由文本"的
取舍：D3 的不发明原则仍然成立，但前提是 Dev Spec 确实没有定义
结构化模型；第 42 节的存在使该前提不成立，故按权威 schema 修正，
而不是继续自行定义或保留自由文本。

**不发明业务逻辑**：`upsertHostViewerMemory` 保持整行覆盖式写入
的机械语义不变（INSERT ... ON CONFLICT DO UPDATE SET 全部字段），
不发明自动递增/追加的业务逻辑——`interactionCount`/`hostAffinity`/
`knownRunningJokes`/`notableEvents` 具体怎么更新是未来 Host
Scheduler/LLM Provider 的业务逻辑，Dev Spec 未定义任何具体算法，
本层不发明；调用方自己读出旧值、算好新值、整体传入覆盖写入。
`created_at` 冲突时不覆盖、`last_seen_at` 每次写入刷新，同原逻辑。

**JSON 存储范式**：`known_running_jokes`/`notable_events` 两个数组
字段用 JSON 字符串存储，沿用项目里 `eventStore.ts`/
`snapshotStore.ts` 已有的 `JSON.stringify`/`JSON.parse` 范式，不引入
新依赖。`nickname` 允许为 NULL（不是每次互动都能拿到昵称）。

**影响面**：`host_running_jokes` 表和 `purge`/`getHealth` 完全不受
影响，维持原样不动。

