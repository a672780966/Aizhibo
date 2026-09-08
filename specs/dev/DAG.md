# DEV DAG — Revision 2

本文件由 Claude Commander 独占维护。OpenCode 禁止修改。

**权威来源**：Dev Spec V1.0 第 65 / 66 / 68 节。节点编号与名称一律沿用规范原文，**不重编号**。
**本修订**：应用 SPEC-AUDIT-001 的 CR-004 ~ CR-009（P1 架构）与 CR-013 ~ CR-016（P3 削减），均已获用户批准（2026-08-16）。

> 修订史
> - Rev 0：依据被截断规范反推的自编号 DAG — 作废
> - Rev 1：第 65/66/68 节官方 DAG 原样落盘
> - Rev 2（当前）：应用已批准的架构调整与削减项

---

## 状态图例

`TODO` 未开工 ｜ `IN_PROGRESS` 已下发 ｜ `READY_FOR_REVIEW` 待审计 ｜ `DONE` PASS 且接口冻结 ｜ `BLOCKED` 有未解除阻塞

**执行序（Exec）** 与**节点编号**分离。编号是规范身份，执行序是施工顺序。CR-004 与 CR-009 调整的是执行序，不是编号。

---

## 第一施工组：Story Machine（M1 — Story Machine Complete）

| Exec | Node | Name | Deps | Status |
|---|---|---|---|---|
| 1 | DEV-000 | Repository Foundation | — | DONE |
| 2 | DEV-001 | Chapter Schema | DEV-000 | DONE |
| 3 | DEV-008 | Runtime Event Model ⬆ | DEV-000, DEV-001 | DONE |
| 4 | DEV-002 | Chapter Compiler Core（PASS 1 + 2）✂ | DEV-001 | DONE |
| 5 | DEV-003 | Story Graph Analyzer（PASS 3 + 5）✂ | DEV-002 | DONE |
| 6 | DEV-002A | Hidden Information Validator（PASS 6）✚ | DEV-001, DEV-003 | DONE |
| 7 | DEV-004 | State Rule Engine | DEV-002 | DONE |
| 8 | DEV-005 | Dice Engine | DEV-002 | DONE |
| 9 | DEV-006 | Action Resolution Engine（PASS 4） | DEV-004, DEV-005 | DONE |
| 10 | DEV-033 | Narrative Composer ⬆ | DEV-006 | DONE |
| 11 | DEV-009 | XState Runtime Kernel | DEV-008, DEV-006, DEV-033 | DONE |
| 12 | DEV-007 | Chapter Simulator（PASS 8）⬇ | DEV-009 | DONE |
| 13 | DEV-010 | Persistence | DEV-009 | DONE |
| 14 | DEV-011 | Deterministic Replay | DEV-010 | DONE |
| 15 | DEV-012 | Runtime API | DEV-011 | DONE |

图例：⬆ 执行序上移 ｜ ⬇ 执行序下移 ｜ ✂ 职责重划 ｜ ✚ 新增节点

> 执行序修正（2026-08-16）：DEV-002A 原列 Exec 5，但其依赖 DEV-003 列 Exec 6，自相矛盾。已互换为 DEV-003 = 5、DEV-002A = 6。DEV-002A 依赖 DEV-003 的原因见 CR-006：ADDENDUM §A15 的时序性判定需要 PASS 3 可达性结果与 PASS 5 状态可达集合。

### M1 内因 CR-RESOLUTIONS-001 产生的职责变更

| 节点 | 变更 | 来源 |
|---|---|---|
| DEV-002A | Outputs 增加 `ForbiddenLexicon`（每场景禁言词表，随 Runtime Bundle 发布） | CR-010 |
| DEV-010 | 观众相关表（`viewer_states` / `host_viewer_memory` / `host_running_jokes`）必含 `platform` 列与 `created_at` / `last_seen_at`；保留策略为**按平台配置**而非硬编码。**不实现 purge job**（属 DEV-054 / DEV-081） | CR-017 |

### CR-017 执行澄清（DEV-010 起草时，2026-08-21）

`viewer_states` 的 shape 已由 Dev Spec 第 15 节完整定义，本节点如期建表。但
`host_viewer_memory`/`host_running_jokes` 目前**没有任何已定义的 shape**（AI Host 记忆模型是
DEV-054 的产物，M5 尚未开工）——在毫无 shape 依据的情况下建表纯属猜测列结构，属于"为假设中的未来
需求设计"。处置：**这两张表的建表本身延后到 DEV-054**，CR-017 的列约束（`platform` +
`created_at`/`last_seen_at`）作为**对 DEV-054 未来建表的强制约束**继续有效，不因延后而失效。
| DEV-012 | Outputs 增加：`PresentationCommand` 信封（含单调 `commandSeq`）、`PRESENTATION_RESYNC`、`RENDERER_HELLO`、`REQUEST_RESYNC`、`getPresentationState()` 投影函数（**必须派生，不得另存**） | CR-012 |

M1 结束时三个对外契约全部冻结：Runtime Event（DEV-008）、Public State 可见性分区（DEV-009）、Presentation Command（DEV-012）。

### DEV-001 已下发（2026-08-16）

`SPEC-ADDENDUM-001` 与 `SPEC-ADDENDUM-002`（后者补齐 `DangerState`/`HostPolicy`/`ResultDictionary` 三处缺失定义，并更正 WorldState 归属——见下）均已冻结。`TASK-PACKAGE-DEV-001` 已通过消息 `0011` 发出，节点转 `IN_PROGRESS`。

**归属更正**：DEV-000 Non-goals 曾写「WorldState 属 DEV-004」，有误。Dev Spec 第 65 节 DEV-001 交付物清单明确包含 World State。正确归属：`WorldState`/`NPCState`/`DangerState` 的**静态形状**属 DEV-001（`chapter-schema`）；对其求值/变更的**运行时逻辑**属 DEV-004（`rule-engine`，消费 DEV-001 类型，不重新定义）。`ViewerState` 不在 DEV-001 范围内（不在 Chapter Pack 目录结构内），其 schema 延后到实际需要它的节点（如 DEV-010）。详见 `SPEC-ADDENDUM-002.md §B1`。

`packages/chapter-schema` 是仓库第一个需要运行时依赖（`zod`）的包；`CR-019`（getHealth 自落地起）不适用于它——纯数据形状包无运行时服务。

### 已应用的修订说明

**CR-009 — DEV-008 前移至 Exec 3**
第 16 节要求"每个状态变化必须来源于 Event"，第 8 节要求骰子 seed/rollIndex/rawValue/finalValue 全部进 Event Log。若 Event Model 到编号顺序才实现，DEV-004/005/006 会各自发明事件格式后返工。编号不变，执行序前移。

**CR-006 — Compiler PASS 归属重划**

| PASS | 归属 | 变更 |
|---|---|---|
| PASS 1 Schema | DEV-002 | — |
| PASS 2 Reference（含资产**引用**完整性） | DEV-002 | 吸收原 PASS 7 前半段 |
| PASS 3 Graph | DEV-003 | 从 DEV-002 移出（原重复分配） |
| PASS 4 Rule Coverage | DEV-006 | 从 DEV-002 移至规则求值器所在节点 |
| PASS 5 State Reachability | DEV-003 | 原无归属；与 PASS 3 同源合并 |
| PASS 6 Hidden Information | **DEV-002A** | 原无归属；新增节点 |
| PASS 7 Asset（**文件存在性**） | DEV-075 | 资产由第七组生产，此前校验无意义 |
| PASS 8 Simulation | DEV-007 | — |

DEV-002A 依赖 DEV-003，因为 SPEC-ADDENDUM §A15 的时序性判定需要 PASS 3 的可达性结果与 PASS 5 的状态可达集合。它是 **G06（Host Hidden Information Leak = 0）的编译期执行点**，运行时对偶为 DEV-050。

### DEV-002A 已下发（2026-08-18）

起草时发现 `ADDENDUM-001 §A15` 判定 2（白名单）依赖"事实→flag"映射，但冻结的 `HostPublicSpec.SceneDisclosure` 从未定义这个映射——性质与 DEV-001 阶段发现的 `DangerState`/`HostPolicy`/`ResultDictionary` 缺口相同。处置：对 `packages/chapter-schema/src/hostPublic.ts` 做**唯一一次纯新增字段**扩展（`SceneDisclosure.knownFactDependencies?: Record<string, string[]>`），不改动任何既有字段，随 `TASK-PACKAGE-DEV-002A` 一并交付，不重新走用户逐项批准。

本节点的默认原则与 DEV-003 刻意相反：**不确定就拒绝**（DEV-003 是不确定就放行）。理由：DEV-003 判错方向是拦住合法内容，DEV-002A 判错方向是让 AI 说漏嘴——两者的错误代价不对称。

**CR-007 — DEV-033 Narrative Composer 上移至 M1**
第 71 节列其为六大核心资产之一；第 13 节明确不使用 LLM，与音频零依赖（TTS 是它的下游消费者，不是依赖）。更关键：不纳入仿真回路，DEV-007 的 100,000 局证明不了叙事覆盖（缺句法块、focus.priority 冲突、SUPPORT 缺失都只在 Composer 参与时暴露）。第三施工组只保留 TTS 相关节点。

**CR-004 — DEV-007 Chapter Simulator 下移至 DEV-009 之后，重定义为 headless driver**

原排序会导致 Simulator 自写一套故事推进循环、Kernel 再写一套 statechart 版本，使 **G02 仿真的不是真实 Runtime**。

DEV-007 的强制约束（须写入其 Task Package 的 Acceptance）：

- 复用 DEV-009 的同一个 Runtime statechart，**不得包含任何状态推进逻辑**
- 只替换 IO 边界：platform adapter → 虚拟观众生成器；audio → 空实现；presentation → 空实现；wall clock → 虚拟时钟
- 第 61 节的 Simulation / Replay / Fuzz 三类测试共用此驱动器，输入策略不同而已

**CR-008 — Runtime Snapshot 在 DEV-009 即完成 PUBLIC / HIDDEN 类型层分区**

Snapshot 结构在 DEV-009 定型，若不分区，到 M5 再切分需重构已冻结的 DEV-010/011/012。

- DEV-008 / DEV-009：Snapshot 每个字段在**类型层面**携带可见性分类
- DEV-050：退化为只实现投影函数 `getPublicState()` 与 PASS 6 的运行时对偶断言

G06 由此获得三道防线：编译期（DEV-002A）、类型层（DEV-009）、运行时（DEV-050）。

**CR-005 — Region 重建模**

三个 Region 原本各自镜像同一组故事相位（CHOICE / DICE / RESULT / TRANSITION 三处重复），每次推进需三向同步。DEV-009 施工时按下表落实：

| Region | 修订后状态集 | 职责 |
|---|---|---|
| STORY | 第 6 节原样（10 态） | **相位唯一权威** |
| PRESENTATION | `LOADING / READY / FAILOVER` | 仅资产加载完成度 + 演出层可用性 |
| AUDIO | `IDLE / PREPARING / PLAYING_STORY / PLAYING_HOST / DUCKED / ERROR` | **声道占用仲裁** |
| INTERACTION | 第 7 节原样（6 态） | — |
| HOST / PLATFORM / SAFETY | 第 5 节原样 | — |

其余 Region 通过读 `storyPhase` 派生，不再各自持有相位。当前播放的是 MASTER 还是 RESULT 属**数据**（正在播哪个 clip），不属状态。第 41 节"Story Audio > Host Audio"的抢占规则落在 AUDIO region 的声道仲裁上。

---

## 第二施工组：演出（M2 — Presentation Complete）**已全部完成（2026-08-23）**

前置：DEV-012（已满足，2026-08-21 M1 全部完成后 USER 选定 M2 优先于 M3 开工）

**DEV-020 状态：`DONE`（接口冻结，`verdict_ref: "0100"`）**。**DEV-021 状态：`DONE`
（接口冻结，`verdict_ref: "0104"`）**。**DEV-022 状态：`DONE`（接口冻结，
`verdict_ref: "0108"`）**。**DEV-023 状态：`DONE`（接口冻结，`verdict_ref: "0112"`）**。
**DEV-024 状态：`DONE`（接口冻结，`verdict_ref: "0116"`）**。**DEV-025 状态：`DONE`
（接口冻结，`verdict_ref: "0124"`）**。**DEV-026 状态：`DONE`（接口冻结，
`verdict_ref: "0128"`）**。**DEV-027 状态：`DONE`（接口冻结，`verdict_ref: "0132"`）**。
**DEV-028 状态：`DONE`（接口冻结，`verdict_ref: "0136"`）**。**M2 里程碑全部 9 个节点
`DONE`。**本组内节点状态以
`specs/comms/LEDGER.md`/`specs/PROJECT_INDEX.md` 为准，下表不逐节点维护 Status 列（与 M1
表格式不同，M1 收尾时才补的 Status 列是追溯性的）。

| Node | Name | 备注 |
|---|---|---|
| DEV-020 | Renderer Shell | 实现 `RENDERER_HELLO` 握手 + `commandSeq` 跳空检测（CR-012） |
| DEV-021 | Scene Renderer | |
| DEV-022 | Character Renderer | 站位为固定五档 slot（ADDENDUM §A9） |
| DEV-023 | Subtitle / Dialogue | |
| DEV-024 | Choice UI | |
| DEV-025 | Dice UI（INTRO / LOOP / RESOLVE） | |
| DEV-026 | Camera / Transition | 仅 preset 键映射，不做镜头 DSL |
| DEV-027 | BGM / SFX | |
| DEV-028 | Presentation Command Bus | 序号分配与分发；**RESYNC 幂等性测试**（CR-012）。信封契约已在 DEV-012 冻结 |

**首次连接与重连走同一条路径**（CR-012）。不为两者设计两套逻辑 —— 重连路径若只在崩溃时才走，永远得不到测试覆盖。

---

## 第三施工组：音频（M3 — Audio Complete）

前置：DEV-012。**DEV-033 已移出本组至 M1（CR-007）。**

**DEV-030 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息 `0141`，`verdict_ref: "0140"`）。
**DEV-031 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息 `0145`，
`verdict_ref: "0144"`；`resolveAudioSource` 首次接入 Runtime，接入点为 Result
叙事 `onResolve`/`onResultPlaying`）。
**DEV-032 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息 `0149`，
`verdict_ref: "0148"`；AUDIO region 六态骨架接上第一个真实触发源）。
**DEV-034 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息 `0153`，
`verdict_ref: "0152"`；`TtsProviderPort` 契约定义完成，不接入任何调用点）。
**DEV-035 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息 `0157`，
`verdict_ref: "0156"`；ElevenLabs `TtsProviderPort` 真实实现，密钥可选，
不接入 runtime-kernel）。
**DEV-036 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息 `0161`，
`verdict_ref: "0160"`；第 51 节完整缓存 key 算法，跨模型版本隔离已验证）。
**DEV-037 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息 `0165`，
`verdict_ref: "0164"`；`LOCKING` 首次接上真实延迟，Simulator/Replay/既有
测试均已验证零性能回归）。
**DEV-038 状态：`BLOCKED`（暂缓，非施工失败）**——2026-09-04 Commander 现实
核对：`audioRegion.ts`（DEV-009 冻结）里 `PLAYING_HOST` 状态只有
`AUDIO.STOP→IDLE` 一条转移，没有任何 `PLAYING_HOST→DUCKED` 边；`DUCKED` 只能
从 `PLAYING_STORY` 经 `AUDIO.DUCK` 到达。DEV-038 的产品描述（第 38 节
"Story 开始 → Host 自动压低/停止"）需要的真实触发信号是"当前是否有 Host 音频
在播"，但 `ai-host`/`platform-twitch` 两个包均**尚未创建**（`ls packages/`
验证），`PLAYING_HOST` 状态自 DEV-009 起从未被任何真实代码路径进入过（仅
DEV-032 `DECISIONS.md` D3 明确记录的测试用 `actor.send` 手动驱动）。在 Host
真实存在之前实现这条触发逻辑，等同于给一个结构上不可达的状态编写监听器——
这正是 DEV-032 D3 主动排除、留给"Host 真实存在之后"的那类工作，与本项目
"不写投机性/不可达代码"的一贯纪律冲突。**裁定：DEV-038 推迟到 M5（AI Host，
`ai-host` 包创建、Host 有真实音频信号）之后再排期，不在本轮（5 轮自动化）
内施工**。M3 其余 7 个节点（DEV-030/031/032/034/035/036/037）均已 `DONE`，
判定 M3 在"真实可施工范围"内已完成，M4（前置 M2+M3）具备下发条件。
本组内节点状态以 `specs/comms/LEDGER.md`/`specs/PROJECT_INDEX.md` 为准。

| Node | Name | 备注 |
|---|---|---|
| DEV-030 | Audio Manifest | **定义全系统统一音频解析链**（CR-018）：`PREGENERATED → CACHE → RUNTIME_TTS → SUBTITLE_ONLY` |
| DEV-031 | Master Audio Player | |
| DEV-032 | Audio State Region | 按声道占用建模（CR-005） |
| ~~DEV-033~~ | ~~Narrative Composer~~ | **已移至 M1 Exec 10** |
| DEV-034 | TTS Provider Interface | |
| DEV-035 | Result TTS | **按兜底形态建造，非主路径**（CR-018）。HTTP Streaming（第 30 节） |
| DEV-036 | Audio Cache | Key 含 voiceModelVersion（第 51 节）。服务兜底 TTS 与 Host TTS |
| DEV-037 | Dice Buffer Controller | **重定位为节奏控制器 + 延迟安全阀**（CR-018）。常态按 `targetDiceMs` 走叙事节奏 |
| DEV-038 | Audio Ducking | **`BLOCKED`（暂缓）**，等待 M5 `ai-host` 包真实存在，见上方裁定说明 |

**拼接听感验证要求**（CR-018）：DEV-030 / DEV-033 阶段必须做一次块拼接听感原型（十余条真实块试听），确认可接受后才在 DEV-074 投入全章节生成。不可接受时的退回方案：仅预生成 `PRIMARY` 块，其余走运行时 TTS。

---

## 第四施工组：Twitch（M4 — Twitch Complete）

前置：M2 + M3（M3 真实可施工范围已完成，DEV-038 推迟至 M5 后，详见上方 M3
裁定；2026-09-04 Commander 判定 M4 具备下发条件，USER 已授权跨里程碑自动
推进，无需逐节点确认）。

**DEV-040 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息 `0169`，
`verdict_ref: "0168"`；`platform-twitch` 包首次创建，`TwitchAuthPort` 真实
refresh_token→access_token 实现，凭据可选退化为 noop）。
**DEV-041 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息 `0176`，
`verdict_ref: "0175"`；第一轮 `AUDIT_FAIL` → `DEV-041-FIX-01` → 第二轮
`AUDIT_PASS`；八态 XState 连接生命周期机器 + 真实 WebSocket/Helix 调用，
首次消费 DEV-040 的 `TwitchAuthPort`）。
**DEV-042 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息 `0180`，
`verdict_ref: "0179"`；首轮 `AUDIT_PASS`；新建 `platform-core` +
`NormalizedChatMessage`/`ChatHandler`，`chatMessageAdapter.ts` 转换 +
包装函数）。
**DEV-043 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息 `0188`，
`verdict_ref: "0187"`；第一轮 `AUDIT_FAIL` → `DEV-043-FIX-01` → 第二轮
`AUDIT_PASS`；有界内存去重包装 `TwitchChatNotification` 层
`onNotification`）。
**DEV-044 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息 `0192`，
`verdict_ref: "0191"`；首轮 `AUDIT_PASS`；A/B/C/D 投票解析，本地镜像
`Vote`）。
**DEV-045 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息 `0200`，
`verdict_ref: "0199"`；首轮 `AUDIT_FAIL`→`FIX-01`→第二轮 `AUDIT_PASS`；
`RECONNECTING` 真实重连，指数退避 1000ms×2 封顶 30000ms，不改既有
`WS_ERROR→ERROR`/`SUBSCRIBE_FAIL→ERROR` 语义）。
**DEV-046 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息 `0204`，
`verdict_ref: "0203"`；首轮 `AUDIT_PASS`；`sendChat.ts` 调用真实 Twitch
Send Chat Message API，未接入 `runtime-kernel`/`PlatformPort`，CR-010）。

**M4（Twitch Complete）里程碑全部 7 个节点（DEV-040~046）`DONE`。**

| Node | Name |
|---|---|
| DEV-040 | Twitch OAuth |
| DEV-041 | EventSub Client |
| DEV-042 | Chat Message Adapter |
| DEV-043 | Message Deduplication（EventSub 至少一次投递，必须做） |
| DEV-044 | Interaction Aggregator（A/B/C/D） |
| DEV-045 | Twitch Reconnect |
| DEV-046 | Twitch Send Chat |

**CR-017 已裁决（部分采纳）**：不删除第 43 节 `LivePlatformAdapter` 定义，但施加两条约束。

1. **窄化核心消费面**：Runtime 核心（DEV-009 ~ DEV-012）不得依赖任何平台特有类型。核心只认 `NormalizedChatMessage`（platform / viewerId / messageId / text / receivedAt）入站与 `sendChat` 出站。Twitch 的 structured fragments、badge、emote 等一律在 Adapter 内消化。
2. **标注单实现抽象**：`LivePlatformAdapter` v1 由 Twitch 单一实现推导，**未经第二实现验证**。DEV-080 首个异构平台落地时进行一次计划性修订 —— 该修订是预期事件，不是设计失败。

**DEV-046 附加约束**（CR-010）：不得暴露可被 Host 直接调用的出站接口。Host 发言必须经 DEV-050A Egress Gate。

---

## 第五施工组：AI Host（M5 — AI Host Complete）**已全部完成（2026-09-07）**

前置：DEV-046

**DEV-050 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息 `0212`，
`verdict_ref: "0211"`；首轮 `AUDIT_FAIL`→`FIX-01`→第二轮
`AUDIT_PASS`；`runtime-kernel` 自 M1 起首次授权修改，新增
`getPublicState()` 投影函数 + PASS 6 运行时对偶断言
`isFactSafeToDisclose`，仅追加不改动任何既有导出；实现过程中发现并
修复两个真实缺陷：`resolveWorldStateKey` 漏 `danger.*` 容器、
`getCurrentChoiceIds` 场景驱动导致 `currentChoices` 提前泄漏）。
**DEV-050A 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息
`0224`，`verdict_ref: "0223"`；首轮 `AUDIT_FAIL`→`FIX-01`→第二轮
`AUDIT_FAIL`（FIX-01 的回归测试本身无效）→`FIX-02`→第三轮
`AUDIT_PASS`；全仓库首次创建 `packages/ai-host`，五道确定性检查
C1-C5 短路判定 ALLOW/DROP，消费 DEV-002A 冻结的 `ForbiddenLexicon`；
修复了 C3 正则 `lastIndex` 副作用导致的检测绕过真实缺陷）。
**DEV-051 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息
`0238`，`verdict_ref: "0237"`；首轮 `AUDIT_FAIL`（A22 缺失，
Commander 收尾流程遗漏，非执行方缺陷）→`FIX-01`→第二轮
`AUDIT_FAIL`（A11 测试插入顺序与 receivedAt 混淆）→`FIX-02`→第三轮
`AUDIT_PASS`；`commentPipeline.ts` 归一化文本精确匹配聚类 + 容量
淘汰 + 只读 Priority 选择，零 LLM、零第三方依赖）。
**DEV-052 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息
`0242`，`verdict_ref: "0241"`；首轮 `AUDIT_PASS`；`hostPersona.ts`
静态 `HostPersona` + `getHostPersona()` 唯一默认值，`voiceDescription`
复述第 36 节职责列表，不发明性格形容词）。
**DEV-053 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息
`0246`，`verdict_ref: "0245"`；首轮 `AUDIT_PASS`；`hostMood.ts`
可变存储 `createHostMoodStore()`，`label` 自由文本，不发明情绪
枚举，不做自动推导）。
**DEV-054 状态：`DONE`，接口再次冻结**（`NODE_RULING: PASS`，消息
`0264`，`verdict_ref: "0263"`；原三轮 FAIL/FIX 后于 `a90e23d`
首次转 `DONE`；事后 `CHANGE_REQUEST`（消息 `0261`，USER 已批准）
重开——起草时检索遗漏 Dev Spec 第 42 节"Host Memory"定义的结构化
字段；T003 把 `host_viewer_memory` 从自由文本 `note` 修正为
`nickname`/`interactionCount`/`knownRunningJokes`/`hostAffinity`/
`notableEvents`，`host_running_jokes` 表与 `purge`/`getHealth`
不受影响，首轮 `AUDIT_PASS` 重新转 `DONE`）。
**DEV-055 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息
`0272`，`verdict_ref: "0271"`；首轮 `AUDIT_FAIL`（A08 测试覆盖
不足）→`FIX-01`→第二轮 `AUDIT_PASS`；`decideHostScheduling` 只
实现第 41 节唯一明确的"Story Audio > Host Audio"规则，其余五个
调度因子只保留类型签名，不发明组合逻辑）。
**DEV-056 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息
`0276`，`verdict_ref: "0275"`；首轮 `AUDIT_PASS`；`HostLLMProvider`
可替换接口 + `noopHostLLMProvider` 诚实占位，Dev Spec 只有一句
"只需一个可替换 Provider API"，不实现任何真实网络调用）。
**DEV-057 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息
`0280`，`verdict_ref: "0279"`；首轮 `AUDIT_PASS`；`HostTtsProvider`
流式合成接口（`AsyncIterable<Uint8Array>` 音频块，第 30 节"LLM
Streaming → WebSocket TTS"要求）+ `noopHostTtsProvider` 诚实占位，
不复用/修改 DEV-034 冻结的文件返回式 `TtsProviderPort`，不实现
任何真实网络调用，不重新打开 DEV-038）。

**DEV-058 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息
`0284`，`verdict_ref: "0283"`；首轮 `AUDIT_PASS`；M5 最后一个节点；
`HostAvatarState` 口型 `mouth: 'open'|'closed'` + 呼吸
`breathing: 'inhale'|'exhale'` 两个独立二元状态 +
`idleHostAvatarState` 静止默认值；CR-014 已把范围砍定为"静态 PNG
+ 口型/呼吸微动，无 Live2D/VRM"；Dev Spec/CR-014 均未定义任何具体
时间参数，USER 已裁决只定义状态形状，不实现驱动逻辑，不接入
renderer/Presentation 层；不重新打开 DEV-038）。

**M5（AI Host Complete）里程碑全部 10 个节点完成**：DEV-050、
DEV-050A、DEV-051、DEV-052、DEV-053、DEV-054、DEV-055、DEV-056、
DEV-057、DEV-058 均 `DONE`。

| Exec | Node | Name | 备注 |
|---|---|---|---|
| 1 | DEV-050 | Public State Gateway | **读向边界**。退化为投影函数（CR-008） |
| 2 | DEV-050A | Host Egress Gate ✚ | **写向边界**（CR-010）。依赖 DEV-050 + DEV-002A 词表产物 |
| 3 | DEV-051 | Comment Pipeline | 入站 Safety |
| 4 | DEV-052 | Host Persona | |
| 5 | DEV-053 | Host Mood | |
| 6 | DEV-054 | Viewer Memory | 不得自持 DB 连接，存储归 DEV-010。含按平台保留策略的清理任务 |
| 7 | DEV-055 | Host Scheduler | |
| 8 | DEV-056 | Host LLM Provider | |
| 9 | DEV-057 | Host TTS | 不得暴露绕过 Egress Gate 的出站接口（CR-010） |
| 10 | DEV-058 | Host Avatar | **静态 PNG + 口型/呼吸微动，无 Live2D / VRM**（CR-014） |

### DEV-050A — Host Egress Gate（CR-010）

**Egress Gate 先于所有 Host 功能节点施工** —— 出口先建好，才不会有人绕路。

`ai-host` 包**不得导出任何绕过 Gate 的发言函数**。Host 的唯一发声方式是调用 Gate。Gate 同时收束两个出口：

```
Host LLM 输出 → 【DEV-050A Egress Gate】 → DEV-057 Host TTS
                                        └→ DEV-046 Send Chat
```

检查链（全部确定性，无 LLM）：

| # | 检查 | 说明 |
|---|---|---|
| C1 | Permission | 第 39 节三档；MUTED 直接丢弃。权限判定只此一处 |
| C2 | **Hidden 词表** | 对 DEV-002A 输出的 `ForbiddenLexicon` 做规范化匹配 |
| C3 | 平台合规 | 关键词 / 正则 denylist，**按平台分文件的配置**，非代码 |
| C4 | 重复与刷屏 | 对 Recent Host Lines 环形缓冲去重 |
| C5 | 长度与频率 | 单条长度上限 + 单位时间条数上限 |

判定只有 `ALLOW | DROP`。**不改写、不重试** —— 改写需 LLM（新增延迟与失败模式），重试在被持续诱导时会成环。静默丢弃符合第 56 节 L1。

每次 DROP 必须产生事件 `HOST.UTTERANCE_DROPPED { rule, matchedTerm, phase }`，用于 G06 举证与「观众正在系统性诱导」的信号发现。

### G06 的四道防线

C2 解决了 Gateway 单独解决不了的问题：Gateway 保证 Host **读不到** Hidden State，但观众可以把剧透**喂给** Host，Host 复述出来 —— 泄露照样发生而 Gateway 完全无感。

| 防线 | 节点 | 作用面 |
|---|---|---|
| 编译期白名单穷举 | DEV-002A | 作者不得把 Hidden 写进 host.public |
| 类型层可见性分区 | DEV-009 | Host 代码路径拿不到 Hidden 字段 |
| 运行时读投影 | DEV-050 | 只暴露 Public State |
| 运行时写词表 | DEV-050A | Host 复述剧透也说不出去 |

---

## 第六施工组：运维（M6 — Operations Complete）

前置：M5

| Node | Name | 备注 |
|---|---|---|
| DEV-060A | Operator API | **优先**（CR-013 已批准）— 11 个 action 的端点 + 鉴权 + `OPERATOR_OVERRIDE` 落库 |
| DEV-061 | Health System | 采集聚合；`Health` 类型已在 DEV-000 冻结 |
| DEV-062 | Error Registry | |
| DEV-063 | Watchdog | |
| DEV-064 | OBS Control | |
| DEV-065 | OBS Failover | **`BLOCKED`（暂缓）**，等待 SAFETY region 真实存在，见下方裁定说明。Failover **决策权只在 SAFETY region**，OBS 与 PRESENTATION 均为执行端（CR-020） |
| DEV-066 | Crash Recovery | **`BLOCKED`（暂缓）**，等待真实生产入口进程存在，见下方裁定说明 |
| DEV-067 | Emergency Stop | **`BLOCKED`（暂缓）**，等待 SAFETY region 真实存在，见下方裁定说明 |
| DEV-060B | Console UI | **后置**（CR-013）— 排在本组末尾或 M8 |

**DEV-060A 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息
`0288`，`verdict_ref: "0287"`；首轮 `AUDIT_PASS`；M6 第一个/优先
节点；新建 `packages/operator-api` 包，实现第 53-54 节 11 个
Operator Action 的 HTTP 端点 + Bearer token 鉴权占位（未配置默认
拒绝）+ 无条件 `OPERATOR_OVERRIDE` 事件审计落库；`ai-host` 追加
`hostPermission.ts`；11 个 action 中只有 `Restore
LKG`/`Mute Host`/`Unmute Host` 三个真实生效，其余 8 个因
`runtime-kernel`（M1 起冻结）无对应 `RootEvent`，或 `SAFETY`/OBS
子系统不存在，诚实占位返回 `ok:false`，未发 CR，USER 2026-09-07
已裁决）。

**DEV-061 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息
`0294`，`verdict_ref: "0293"`；第一轮 `AUDIT_FAIL`（MAJOR-01 工作区
残留 Commander 自己的临时 dispatch 文件，非实现缺陷，直接自行
订正）→第二轮 `AUDIT_PASS`；新建 `packages/health-registry` 通用
聚合原语，`getAggregateHealth()` 用"最差状态优先"规则聚合
`Health`（第 57 节，DEV-000 冻结）；不硬编码接入仓库里已有 6 个
真实 `getHealth` 来源，不新建 HTTP 端点）。

**DEV-062 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息
`0298`，`verdict_ref: "0297"`；首轮 `AUDIT_PASS`，0 发现；新建
`packages/error-registry`：`ErrorLevel`（第 56 节封闭四值
`L1`–`L4`）+ `record`/`list` 记录原语；只记录不处理，`category`
自由文本不做自动推断，纯内存零依赖）。

**DEV-063 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息
`0302`，`verdict_ref: "0301"`；首轮 `AUDIT_PASS`，0 发现；新建
`packages/watchdog`：第 56 节 L3 封闭三值 `WatchdogTrigger`（
`RENDERER_CRASH`/`TWITCH_DISCONNECT`/`RUNTIME_PROCESS_RESTART`）+
`decideWatchdogAction` 三分支纯函数；`TWITCH_DISCONNECT` 已由
DEV-045 自动重连处理返回 `ALREADY_HANDLED`，另两个诚实返回
`NOT_YET_WIRED`；零依赖）。

**DEV-064 状态：`DONE`，接口冻结**（`NODE_RULING: PASS`，消息
`0306`，`verdict_ref: "0305"`；第一轮 `AUDIT_FAIL`（MAJOR-01：审计
员认定 LEDGER"当前待处理"表格的原地更新超出协议 §2.3 仅追加范围；
Commander 复核协议原文后判定该表格是现状索引而非 §2.3 保护的
历史行日志，接受观察但不采纳阻塞结论，与此前 M6 全部节点的既有
维护方式一致）；新建 `packages/platform-obs`：真实 OBS WebSocket
v5 客户端（Hello/Identify/Identified 握手 + 官方双重 SHA256 鉴权
+ Request/RequestResponse 切场景），支持第 49 节六个封闭场景；
不实现任何重连逻辑，也不实现任何"何时该切场景"的判断（决策权
留给未来 DEV-065 SAFETY region，CR-020）；生产代码零依赖）。

**DEV-065 状态：`BLOCKED`（暂缓，非施工失败）**——2026-09-08
Commander 现实核对：CR-020 把 Failover 的**决策权**明确划给
SAFETY region，OBS/PRESENTATION 均只是执行端；DEV-064 已经把
"执行"这一半（真实 OBS WebSocket v5 客户端 `switchScene`）建好。
但 SAFETY region 本身自 DEV-009（M1）起一直是
`packages/runtime-kernel/src/placeholderRegions.ts` 里的
`idlePlaceholder('SAFETY')`（单一 `IDLE` 占位态），第 55 节定义的
`HEALTHY/DEGRADED/RECOVERING/FAILOVER/EMERGENCY_STOP` 五态状态图
零代码对应；Dev Spec 全文也没有给出任何具体的状态迁移规则（例如
"连续几次 L3 故障才从 HEALTHY 进入 FAILOVER"）。M6 的 DAG 里没有
单独列一个"SAFETY Region"节点，这个真实状态机实现工作隐含分散在
DEV-065/066/067 之中，但目前没有一个已获批的规则来源可以抄录——
现在实现等同于给一个结构上仍不可达的状态发明迁移条件，与本项目
"不写投机性/不可达代码"的一贯纪律冲突，也是 DEV-060A 起就反复
确认、刻意搁置的同一类现实约束（"没有真实生产入口进程/决策方可
供装配"）。**裁定：DEV-065 转 `BLOCKED`（暂缓，非施工失败），
推迟到 SAFETY region 真实状态机存在（未来某个尚未编号的节点，或
DEV-066/067 施工时一并建立）之后再排期，不在本轮下发**。USER
2026-09-08 已就此裁决：标为 BLOCKED，不发明新逻辑。本节点未发
`TASK_PACKAGE`，无 LEDGER 消息记录（同 DEV-038 先例，纯 Commander
现实核对裁决，不进入执行/审计流程）。

**DEV-066 状态：`BLOCKED`（暂缓，非施工失败）**——2026-09-08
Commander 现实核对（USER 已指示逐个核对 066/067，不直接推定）：
`G09`/`G10`（第 69 节最终上线 Gate）要求"Runtime Crash 可以恢复"
"Renderer Crash 可以恢复"，但实际的"从持久化恢复"这一机制早已
真实存在——`persistence`（DEV-010）的 `loadLatestSnapshot`/
`restoreSession`，以及 DEV-060A Operator API 的 `RESTORE_LKG`
action，已经把"给定一个 sessionId，从最新快照重建 `RuntimeActor`
并报告成功/失败"这条能力完整建好并测试过。DEV-066"Crash
Recovery"真正缺的不是恢复逻辑，而是**触发恢复的宿主本身**——
仓库里没有任何长期运行的生产入口进程（同 DEV-060A/061/064 反复
确认的现实约束），也就没有"进程崩溃后自动重启并调用恢复逻辑"这
件事可以真实发生的地方；`decideWatchdogAction('RUNTIME_PROCESS_
RESTART')`（DEV-063）已经诚实说明"no production process exists
yet that could be restarted"。在这样的宿主之前实现任何"自动崩溃
恢复"编排，等同于给一个不存在的进程写生命周期钩子。**裁定：
DEV-066 转 `BLOCKED`（暂缓，非施工失败），推迟到真实生产入口
进程存在之后再排期**。本节点未发 `TASK_PACKAGE`，无 LEDGER
消息记录（同 DEV-038/065 先例）。

**DEV-067 状态：`BLOCKED`（暂缓，非施工失败）**——2026-09-08
Commander 现实核对：`Emergency Stop` 同时是（a）第 53 节 11 个
Operator Action 之一——已在 DEV-060A 里诚实标为 `NOT_YET_WIRED`
（"SAFETY region not yet built beyond placeholder"），（b）第 55
节 SAFETY region 五态之一（`EMERGENCY_STOP`），该状态机自
DEV-009 起仍是单态占位，无任何真实迁移路径可以进入这个状态。
即便退一步只做"给定已经触发的 Emergency Stop，应该执行哪些具体
动作"这一层（不涉及"什么时候该触发"的决策），也需要组合调用
已经真实存在但彼此独立、从未被任何节点接线在一起的执行原语
（`operator-api` 的 `MUTE_HOST`、`platform-obs` 的
`switchScene`、`platform-twitch` 的 `EventSubClient.disconnect()`
等）——这类跨包编排目前没有任何真实调用方触发，提前把它们接起来
属于"没有真实生产入口进程可供装配"这同一类现实约束，也会破坏
本轮 M6 每个节点刻意保持的零/最小跨包耦合纪律。**裁定：DEV-067
转 `BLOCKED`（暂缓，非施工失败），推迟到 SAFETY region 真实存在
且有真实调用方之后再排期**。本节点未发 `TASK_PACKAGE`，无
LEDGER 消息记录（同 DEV-038/065 先例）。

**CR-015 已批准**：第 60 节 11 项产品指标全部从 Event Log 离线派生，**不建实时指标系统**。第 59 节工程指标保留实时采集（服务于 DEV-063 Watchdog）。因此本组不新增指标节点。

---

## 第七施工组：内容生产工具（M7 — Content Factory Complete）

前置：M6

| Node | Name | 备注 |
|---|---|---|
| DEV-070 | Chapter Authoring Schema Prompt | |
| DEV-071 | AI Chapter Generator | |
| DEV-072 | AI Compiler Repair Loop | |
| DEV-073 | Asset Requirement Generator | 受益于固定五档 slot |
| DEV-074 | Audio Production Queue | **批量生成 `PREGENERATED` 块音频**（CR-018）：遍历全部可达 `NarrativeBlock`，随 Bundle 发布 |
| DEV-075 | Chapter Packager | 含 PASS 7 资产文件存在性校验（CR-006），**覆盖「每个可达 NarrativeBlock 有音频文件」**（CR-018） |

**CR-018 无排序问题**：M3（音频）在 M7（内容工厂）之前，因此 M3 ~ M6 期间只有 `RUNTIME_TTS` 路径 —— 这正是 DEV-035 的用途。M7 之后它退居兜底。前提是 DEV-030 就把解析链定义好，DEV-035 从一开始按兜底形态建造。

**DEV-070 状态：`DONE`**（`verdict_ref: "0309"`，
`ruling_ref: "0310"`，2026-09-08）——M7 第一个节点，也是本项目第一个
交付物类型与 M1–M6 全部节点不同的节点：产出物是 prompt 文本（指导
AI 模型按 `chapter-schema` 逐模块写作 Chapter 内容），不是确定性
类型/决策代码，因此无法用类型检查判定"正确性"；测试改为机械关键字
覆盖检查（Stage 标题、模块关键字、Quality 取值、slot 取值），
verbatim 一致性由 Commander 人工核对（脚本逐字节比对 12170 字符
一致）。prompt 正文已由 Commander 逐一核对 `chapter-schema` 全部 19
个组件的真实字段撰写，执行方逐字照抄，不改写、不省略字段（USER
已裁决要求完整、逐模块覆盖）。不真实调用任何 AI/LLM API（留给
DEV-071），不实现 Compiler/AI Repair Loop 逻辑（既有 DEV-002/未来
DEV-072 职责）。审计提出 1 MAJOR（`pnpm-lock.yaml` 未列入 Writable
Scope 却被修改），Commander 裁定 PASS 且不采纳阻塞结论——同一模式
已连续出现于 DEV-060A/061/062/063/064 五个节点均未被判定违规，且
该改动是新增包被授权后 pnpm 工具链的强制副作用（`--frozen-lockfile`
本身要求 lockfile 与新 package.json 同步），"整改移除"在技术上
不可行；Commander 已承诺从 DEV-071 起在新增包类节点的 Task Package
Writable Scope 中显式列出 `pnpm-lock.yaml`，消除该歧义。M7 下一
节点：DEV-071（AI Chapter Generator）。

---

## 第八施工组：平台扩展（POST-M8）

| Node | Name |
|---|---|
| DEV-080 | YouTube Adapter |
| DEV-081 | Bilibili Adapter |
| DEV-082 | Interaction Gateway |
| DEV-083 | Twitch Extension |

---

## 包结构（Rev 2）

第 4 节列 19 个包。**CR-016 已批准，削减为 17 个**：

- ❌ `event-engine` → 并入 `persistence`（Event Log 本质是存储）
- ❌ `state-engine` → 并入 `rule-engine`（DEV-004 与 DEV-006 是同一求值器的两个使用面）

保留 17 包：`chapter-schema` `chapter-compiler` `runtime-kernel` `rule-engine` `dice-engine` `interaction-engine` `narrative-composer` `audio-engine` `platform-core` `platform-twitch` `platform-youtube` `platform-bilibili` `ai-host` `host-memory` `obs-control` `persistence` `shared`

**包按节点逐步创建，禁止提前建空包。** `platform-youtube` / `platform-bilibili` 在 DEV-080 / DEV-081 前不创建。`host-memory` 不得自持 DB 连接或 schema。

---

## 跨节点持续约束

1. **CR-019 已记录**：每个模块**自落地起**就实现 `getHealth(): Health`，不等到 DEV-061。否则 M6 需回头改所有模块。`Health` 类型已在 DEV-000 的 `packages/shared` 冻结。
2. **CR-020 已记录**：Failover 决策权只在 SAFETY region；PRESENTATION.FAILOVER 与 OBS 切场均为执行端。
3. 同一时刻只允许一个节点 IN_PROGRESS。一个 DEV 节点 = 一个 Task Package。
4. 节点 PASS 后接口冻结；下游只能提 Change Request / FIX Package。
5. 第 67 节多 Worker 并行暂不启用（单 Executor）。启用由 Commander 决定。
6. 第 70 节禁止清单在所有节点持续生效，默认拒绝。
7. OpenCode 禁止自行推进下一 DEV Node。

---

## 未决 CR

无。

CR-010 / CR-012 / CR-017 / CR-018 已于 2026-08-16 裁决，详见 `specs/audit/CR-RESOLUTIONS-001.md`。

| CR | 裁决 | 落点 |
|---|---|---|
| CR-010 | 采纳 | 新增 DEV-050A；DEV-002A 增加 `ForbiddenLexicon` 产物 |
| CR-011 | 采纳，已冻结于 ADDENDUM §A17（D19） | DEV-001, DEV-006 |
| CR-012 | 采纳，契约上移至 DEV-012 | DEV-012 / DEV-020 / DEV-028 |
| CR-017 | 部分采纳（窄化核心消费面 + 合规变量前置） | DEV-010 / DEV-040 组 |
| CR-018 | 采纳但机制修正为**块级**预生成 | DEV-030 / 035 / 037 / 074 / 075 |

**20 条 CR 全部结案。规范层无待批项。**

`specs/audit/SPEC-ADDENDUM-001.md` 已冻结，与 Dev Spec V1.0 具同等约束力。
