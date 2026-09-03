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
**DEV-036 状态：`IN_PROGRESS`**（`TASK_PACKAGE` 消息 `0158`，第 51 节完整
缓存 key 算法）。
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
| DEV-038 | Audio Ducking | |

**拼接听感验证要求**（CR-018）：DEV-030 / DEV-033 阶段必须做一次块拼接听感原型（十余条真实块试听），确认可接受后才在 DEV-074 投入全章节生成。不可接受时的退回方案：仅预生成 `PRIMARY` 块，其余走运行时 TTS。

---

## 第四施工组：Twitch（M4 — Twitch Complete）

前置：M2 + M3

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

## 第五施工组：AI Host（M5 — AI Host Complete）

前置：DEV-046

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
| DEV-065 | OBS Failover | Failover **决策权只在 SAFETY region**，OBS 与 PRESENTATION 均为执行端（CR-020） |
| DEV-066 | Crash Recovery | |
| DEV-067 | Emergency Stop | |
| DEV-060B | Console UI | **后置**（CR-013）— 排在本组末尾或 M8 |

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
