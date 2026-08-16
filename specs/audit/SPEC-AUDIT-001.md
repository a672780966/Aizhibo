# SPEC AUDIT 001 — Development Specification V1.0

Auditor: Claude Commander
Date: 2026-08-16
Scope: Dev Spec V1.0 全文（第 0–72 节）
Trigger: DEV-000 施工中，DEV-001 下发前的规范复核
Status: 待用户裁决

---

## 0. 审计方法

以第 72 节的最终工程定义为锚点反推：

> AI 在制作阶段创造一台故事机器；直播时，这台机器自己运行。

以及第 69 节 14 条上线 Gate 为验收锚点，逐节检查：

1. 规范是否足以支撑对应 DEV 节点施工
2. 是否存在两套机制做同一件事
3. DAG 顺序是否会导致返工或双实现
4. 是否存在会导致产品下线的风险缺口
5. 是否存在相对最终目标的过度设计

---

## 1. 结论摘要

| 等级 | 数量 | 说明 |
|---|---|---|
| **P0 阻塞** | 3 | 不解决则 DEV-001 无法完整施工 |
| **P1 架构** | 6 | 会使上线 Gate 失效或造成大规模返工 |
| **P2 风险** | 3 | 会导致产品被平台下线或不可恢复 |
| **P3 削减** | 5 | 相对最终目标的过度设计 |

**总体判断：规范的骨架是对的，问题集中在"详略极不均衡"。**

Runtime 侧（第 5–18 节）写得很扎实，Chapter Pack 侧（第 19–22 节）只写了三分之一。而 Chapter Pack 恰恰是第 71 节自己认定的第一号核心资产。

---

## 2. P0 — 阻塞级：Chapter Pack 规范空洞

### P0-1 第 19 节列出 14 个子目录 + 5 个根文件，正文只定义了其中 4 个

| Chapter Pack 条目 | 正文定义 | 状态 |
|---|---|---|
| `scenes/` | 第 20 节 `SceneNode` | ✅ 有结构 |
| `interactions/` | 第 21 节 `InteractionNode` + `Choice` | ✅ 有结构 |
| `results/` | 第 22 节 Result Dictionary + 六等级覆盖 | ✅ 有结构 |
| `narrative/` | 第 13 节句法块（PREFIX/SUPPORT/PRIMARY/URGENCY/TRANSITION） | ⚠️ 只有拼装顺序，无字段结构 |
| `actions/` | 第 9/10 节提及 `actionId`、Action Scale | ⚠️ 零散引用，无 Action 节点结构 |
| `dice/` | 第 8 节 Dice Engine（引擎行为，非章节配置） | ⚠️ 无章节级骰子配置结构 |
| `state-rules/` | 第 65 节 DEV-004 提及 Condition/Guard/Effect | ⚠️ 无结构 |
| `npc/` | 第 14 节 `NPCState` 被引用、第 24 节 PASS 2 检查 NPC→Character | ⚠️ 无结构 |
| `audio/` | 第 27–32 节写的是运行时音频系统 | ⚠️ 无章节级 audio manifest 结构 |
| `recovery/` | — | ❌ **零定义** |
| `boss/` | — | ❌ **零定义** |
| `endings/` | — | ❌ **零定义** |
| `visuals/` | — | ❌ **零定义** |
| `metadata/` | — | ❌ **零定义** |
| `manifest.json` | — | ❌ **零定义** |
| `host.public.json` | 第 24 节 PASS 6 检查它 | ❌ **无结构定义** |
| `story.graph.json` | 第 20 节 `next` / `guards` 隐含 | ⚠️ 无图级结构 |
| `initial.state.json` | 第 14 节 `WorldState` | ⚠️ 可推导 |
| `world.rules.json` | 第 10 节"人数边界由 Chapter / World Rules 定义" | ⚠️ 无结构 |

**影响**：DEV-001 Chapter Schema 的任务是"为整个 Chapter Pack 建 Zod / JSON Schema"。当前输入只够覆盖约 40%。

**这不是可以靠 Agent 推断补齐的**。`recovery/`、`boss/`、`endings/` 三者是产品玩法的核心分支，猜错会污染整条 M1 施工链，而且它们的 schema 一旦冻结，DEV-002 Compiler、DEV-004 State Rule、DEV-006 Action Resolution、DEV-007 Simulator 全部锁死在错误结构上。

### P0-2 HP / Life / Recovery 的产品闭环缺失

第 15 节给每个 Viewer 定义了 `hp: 0|1|2|3`、`life: 0|1|2`、`alive: boolean`。

但全文没有任何一节说明：

- HP 在什么条件下扣减（第 9 节 `playerEffects` 只给了类型名）
- `alive = false` 之后观众还能不能投票
- Life 如何消耗、如何恢复
- `recovery/` 目录承担什么规则

第 10 节明确"人数不得直接转换为攻击力，人数只能进入 Action Scale"。这条约束把人数和战斗力解耦了，那么 HP 系统的产品意义是什么 —— 是给观众个体的"参与代价"，还是集体资源？规范没答。

**影响**：DEV-006 Action Resolution 的 `playerEffects` 无法实现。

### P0-3 `playerEffects` 的作用粒度歧义

第 9 节：

```typescript
type ResolveResult = {
  ...
  playerEffects: PlayerEffect[]
}
```

`ResolveInput` 只带 `participantCount: number`（不带参与者 ID 列表），说明规则求值是**按组**的。但 `playerEffects` 要落到具体 Viewer 上，就必须知道是谁。

两种读法：

- **A（批量）**：effect 作用于整个 ActionGroup，运行时按组批量套用到该组全体成员。
- **B（逐人）**：effect 携带 viewerId，逐人计算。

这个歧义在 10,000 观众规模下是数量级差异。第 61 节 Simulation Test 明确要测到 10,000 Viewer，每轮逐人计算 + 逐人持久化会直接击穿性能预算。

**建议采纳 A**：`PlayerEffect` 只描述"对本 ActionGroup 全体的作用"，运行时按组套用；只有明确的个体事件（例如被点名）才产生单人 effect。这同时保持了第 9 节 `ResolveInput` 不携带 ID 列表的纯粹性 —— 规则求值与观众身份彻底解耦，Replay 也更容易确定性。

---

## 3. P1 — 架构级：会使上线 Gate 失效

### P1-1 【最严重】Simulator 与 Runtime Kernel 会成为两套实现

第 65 节：

- DEV-007 Chapter Simulator：`load chapter → random choices → resolve → transition → repeat`，目标 100,000 局
- DEV-009 XState Runtime Kernel：建立 STORY / PRESENTATION / INTERACTION / AUDIO / HOST / PLATFORM / SAFETY

**DEV-007 排在 DEV-009 之前。** 这意味着 Simulator 必须自己写一套"推进故事"的循环，而两个月后 Kernel 又写一套 statechart 版本。

后果直接命中两个 Gate：

- **G02（100,000 次 Simulation PASS）** —— 仿真的是 Simulator 的循环，不是真实 Runtime。仿真通过不能证明 Runtime 通过。
- **G03（Replay 100% deterministic）** —— 如果 Replay 走 Kernel，Simulation 走 Simulator，两条路径的状态推进逻辑不一致时，G03 通过也说明不了 G02 的结论有效。

这是整个 DAG 里唯一一个**会让核心验收手段失去意义**的排序问题。

**建议**：

1. DEV-007 移到 DEV-009 之后。
2. Simulator 重新定义为 **headless driver**：复用同一个 Runtime Kernel statechart，只替换掉 IO 边界（platform adapter → 虚拟观众生成器；audio → 空实现；presentation → 空实现；timer → 虚拟时钟）。
3. Simulator 自身不得包含任何状态推进逻辑。这一条要写进 DEV-007 的 Acceptance。

顺带解决了第 61 节 Simulation / Replay / Fuzz 三类测试的共用驱动问题 —— 它们本质是同一个 headless driver 的三种输入策略。

### P1-2 STORY / PRESENTATION / AUDIO 三个 Region 镜像同一组相位

| STORY（§6） | PRESENTATION（§33） | AUDIO（§32） |
|---|---|---|
| SCENE_ENTER | LOAD_SCENE | — |
| STORY_PLAYING | CINEMATIC | MASTER |
| INTERACTION_PENDING | CHOICE | CHOICE |
| RESOLUTION_PENDING | DICE | DICE |
| RESULT_PLAYING | RESULT | RESULT_PREPARING / RESULT |
| TRANSITION | TRANSITION | TRANSITION |

同一个"当前处于哪个故事相位"被记录了三次。这与 P-01 单一事实源直接抵触 —— 不是说违反了字面（都在同一个 Snapshot 里），而是违反了它的意图：**三份可以互相漂移的相位记录**，每次状态推进都要三向同步，任何一次遗漏都是难以复现的 bug，而且会在 168h Soak 里慢慢暴露。

同时第 35 节已经确立 Renderer 是纯命令驱动、不维护剧情。既然如此，Runtime 侧维护一个故事形状的 PRESENTATION region 就没有消费者。

**建议**：

- **STORY region 是相位的唯一权威**，其余 region 通过读 `storyPhase` 派生。
- **PRESENTATION region 压缩为 3 态**：`LOADING / READY / FAILOVER`。它真正的本地职责只有"资产加载完成度"和"演出层是否可用"。
- **AUDIO region 改为按"声道占用"建模**，而不是按故事相位：`IDLE / PREPARING / PLAYING_STORY / PLAYING_HOST / DUCKED / ERROR`。当前播的是 MASTER 还是 RESULT 是**数据**（正在播哪个 clip），不是状态。

这样第 41 节"Story Audio > Host Audio"的抢占规则就落在了一个自然的位置上 —— 声道仲裁只需要看 AUDIO region，不需要跨三个 region 推理。

### P1-3 Compiler 8 个 PASS 中有 3 个无 DEV 节点归属，1 个被重复分配

| PASS | 归属节点 | 状态 |
|---|---|---|
| PASS 1 Schema | DEV-002 | ✅ |
| PASS 2 Reference | DEV-002 | ✅ |
| PASS 3 Graph | DEV-002 **且** DEV-003 | ⚠️ **重复分配** |
| PASS 4 Rule Coverage | DEV-002 | ✅ |
| PASS 5 State Reachability | — | ❌ **无归属** |
| PASS 6 Hidden Information | — | ❌ **无归属** |
| PASS 7 Asset | — | ❌ **无归属** |
| PASS 8 Simulation | DEV-007 | ✅ |

**PASS 6 无归属是最要命的** —— 它是 **G06（Host Hidden Information Leak = 0）** 的编译期执行点。运行时那一半由 DEV-050 Public State Gateway 承担，编译期这一半目前没有任何人负责。而 P-03 明确写了"这是权限隔离，不是 Prompt 约束"，只靠运行时 Gateway 是守不住的：如果 `host.public.json` 在创作阶段就引用了 ending flag，Gateway 会忠实地把它公开出去。

**建议**：

- DEV-002 收缩为 PASS 1 + PASS 2
- DEV-003 扩展为 PASS 3 + PASS 5（都是图可达性分析，天然同源）
- **新增 DEV-002A — Hidden Information Validator（PASS 6）**，依赖 DEV-001，与 DEV-002 并列。这个节点应该早做，因为它反过来会约束 DEV-001 中 `host.public.json` 的 schema 设计。
- PASS 7 Asset 拆两段：**引用完整性**（章节内声明的 asset id 都有定义）并入 PASS 2；**文件存在性**（磁盘上真有这个 png/mp3）归入 DEV-075 Chapter Packager。资产文件由第七施工组生产，在此之前校验文件存在性没有意义。不需要新节点。

### P1-4 Narrative Composer 被放错了施工组

DEV-033 位于**第三施工组（音频）**。但：

- 第 71 节把 Narrative Composer 列为六大核心技术资产之一
- 第 13 节明确它**不使用语言模型**，输入是 ResultSet + Narrative Dictionary + Scene Tone + Priority
- 它与音频**零依赖** —— 它输出文本，TTS 是它的下游消费者，不是它的依赖

更关键的是：**没有 Composer，DEV-007 的 100,000 局仿真验证不了叙事覆盖**。仿真能证明"每个 interaction × action × quality 都有合法 result"（PASS 4），但证明不了"这些 ResultSet 组合都能拼出通顺的句子"。缺句法块、Priority 冲突、SUPPORT 段落缺失，这些只有在 Composer 参与仿真时才暴露。

**建议**：Narrative Composer 上移至 M1，执行顺序紧随 DEV-006 Action Resolution，并纳入 DEV-007 仿真回路。第三施工组只保留 TTS 相关节点。

### P1-5 Public / Hidden 分区确立得太晚

DEV-050 Public State Gateway 在**第五施工组**。但 Runtime Snapshot 的结构在 DEV-009 就定型了。

如果 Snapshot 在 M1 阶段没有为"可公开 / 不可公开"做分区标注，到 M5 再切分就是对整个内核数据结构的重构 —— 而那时 Persistence（DEV-010）、Replay（DEV-011）、Runtime API（DEV-012）都已经冻结在旧结构上。

**建议**：

- **可见性标注在 DEV-008 / DEV-009 就确立**：Runtime Snapshot 的每个字段在类型层面携带 `PUBLIC` / `HIDDEN` 分类（例如两个分离的子对象，或品牌类型约束）。
- DEV-050 退化为**只实现投影函数** `getPublicState()`，以及第 24 节 PASS 6 的运行时对偶断言。
- 这样 G06 就有了三道防线：编译期（PASS 6）、类型层（Snapshot 分区）、运行时（Gateway）。对一个"AI 助播绝不能剧透"的产品，三道防线是恰当的，不是过度。

### P1-6 DEV-008 Runtime Event Model 的编号位置会误导施工顺序

第 16 节确立"每个状态变化必须来源于 Event"。但 DEV-004（State Rule）、DEV-005（Dice）、DEV-006（Action Resolution）都排在 DEV-008 之前 —— 而第 8 节明确要求骰子的 seed / rollIndex / rawValue / finalValue **全部进入 Event Log**。

第 66 节的依赖图其实把 DEV-008 画成了独立起点，但**编号顺序会让 Agent 按 000→001→…→008 施工**。

**建议**：DEV-008 执行顺序前移至 DEV-001 之后、DEV-002 之前。编号保持不变（避免破坏规范引用），在 DAG 中显式标注执行序。

---

## 4. P2 — 产品级风险缺口

### P2-1 【会导致封号】AI Host 出站内容无安全过滤节点

第 40 节 Comment Intelligence 的流程里有 Safety 步骤 —— 但那是**入站**过滤（筛观众评论）。

**出站**没有任何节点：DEV-052 Host Persona、DEV-056 Host LLM Provider、DEV-057 Host TTS，全链路没有一个环节检查 Host 即将说出口的内容。

对一个 7×24 无人值守的直播产品，这是最现实的下线风险：观众有充足时间和动机去诱导 Host 说违规内容，而 Persona prompt 是防不住持续对抗的。第 47 节只提到 Bilibili 的**数据存储**合规，没有提内容合规。

**建议新增 DEV-057A — Host Output Safety Filter**，位于 LLM 输出与 TTS 之间，规则优先（关键词 / 正则 / 长度 / 重复度），拒绝时静默丢弃该条发言而非重试。这符合第 56 节 L1 的处理原则（Host 失败忽略，故事继续）。

### P2-2 【必然发生】零参与路径未定义

7×24 无人值守必然有 0 观众时段。此时：

- INTERACTION.OPEN 期间无任何投票
- LOCKED 产生空 `ActionGroup[]`
- Rule Engine 收到 `participantCount = 0`
- 第 10 节的 Action Scale 最小档是 SOLO，没有 ZERO

规范没有定义降级路径。而这个分支**每天都会走到**。

**建议**：`InteractionNode` 增加 `noParticipationPolicy`，由章节作者定义，至少支持：

- `DEFAULT_CHOICE`（指定一个默认选项，按 SOLO scale 结算）
- `SKIP`（跳过互动，直接走 `nextScene`）
- `HOLD`（延长窗口，最多 N 次，之后回落到前两者）

并纳入 PASS 4 Coverage 检查 —— 每个 interaction 必须显式声明这个策略，不允许省略。这与第 22 节 Result Dictionary "不能省略，必须显式 mapsTo 或 unreachable" 是同一种设计纪律。

### P2-3 Renderer 重连缺少全量重同步命令

第 35 节：Renderer 不维护剧情，只接收 `PresentationCommand`。
G10：Renderer Crash 可以恢复。

这两条组合起来意味着：Renderer 重启后画面是**空的**，它不知道当前背景是什么、有哪些角色在场、什么表情。而增量命令流无法重建这个状态。

**建议**：DEV-028 Presentation Command Bus 必须包含一条 `PRESENTATION_RESYNC` 全量命令，Runtime 侧维护"当前演出状态"的完整快照（这本来就该在 Runtime Snapshot 里），Renderer 连接/重连时首先接收它。

---

## 5. P3 — 建议削减（相对最终目标的过度设计）

### P3-1 Operator Console 应先做 API，后做界面

第 52–53 节定义了完整 Overview 页面 + 11 个 Operator Action。对**单人运营**的系统，第一版的 Web Console 前端投入产出比很低 —— 结构化日志（第 58 节）已经覆盖了 Overview 的大部分信息需求。

**建议**：DEV-060 拆为 DEV-060A Operator API（11 个 action 的 HTTP 端点 + 鉴权 + `OPERATOR_OVERRIDE` 事件落库）与 DEV-060B Console UI。API 是最终架构的一部分（不是临时代码），优先做；UI 后置到 M6 末尾或 M8。

省下的工程量应转移到 Safety / Crash Recovery —— 那才是无人值守真正依赖的东西。

### P3-2 Host Avatar 不需要 Live2D / VRM

DEV-058 提到借鉴 AITuber OnAir 的 PNG / Live2D / VRM 思路。

但本产品是**互动绘本** —— 画面主体是绘本插画与角色立绘，Host 是画面角落的伴随者。引入 Live2D/VRM 会带来建模成本、运行时渲染开销，以及与绘本美术风格的冲突。这是 AITuber 范式的惯性引入，不是本产品的需求。

**建议**：Host Avatar 降级为静态 PNG + 说话时的口型/呼吸微动（与第 33 节角色微动画共用同一套机制），砍掉 Live2D / VRM。

### P3-3 产品指标（§60）不需要运行时组件

第 60 节 11 项产品指标（unique viewers / retention / choice distribution / minority-choice participation …）**全部可以从 Event Log 离线派生** —— 因为第 16 节已经要求每个状态变化都来源于 Event，每一票、每次结算都在日志里。

**建议**：明确写入规范 —— 产品指标一律离线计算，不建实时指标系统。工程指标（第 59 节）保留实时采集，因为它服务于 Watchdog 与告警。

### P3-4 取消 `state-engine` 与 `event-engine` 两个包

第 4 节列了 19 个包。其中：

- `event-engine` 的职责（Event Log 追加 / 读取 / 序列号）本质是存储 → 并入 `persistence`
- `state-engine` 与 `rule-engine` 边界模糊：DEV-004 State Rule Engine（Condition/Guard/Effect/Flag mutation）与 DEV-006 Action Resolution Engine 是同一个求值器的两个使用面 → 合并为 `rule-engine` 一个包，保留两个 DEV 节点

包数 19 → 17。少两个包意味着少两套 tsconfig、少两组循环依赖风险、少两处"这个类型该放哪"的争论。

### P3-5 不要提前抽象 `LivePlatformAdapter`

第 43 节的 `LivePlatformAdapter` 接口形状完全来自 Twitch。第 47 节自己承认 Bilibili 的数据处理规则不能照搬 Twitch 的 Viewer Memory 策略。

从 1 个实现推导 3 平台抽象，是典型的过早抽象。

**建议**：DEV-040 组只冻结"Twitch 的形状"，明确标注该接口将在 DEV-080 首个异构平台落地时进行一次**有计划的修订**。同时不要提前创建 `platform-youtube` / `platform-bilibili` 两个空包。

---

## 6. 一项建议新增的优化（会显著降低运行时复杂度）

### 编译期 TTS 预生成，让 Dice Buffer 从常态变为兜底

当前设计（第 29 / 31 节）：Result 文本在运行时生成 → 查 Audio Cache → MISS 则现场 TTS → 用骰子动画（3.5s / 6s / 12s）遮掩延迟。

但把几条已有规范放在一起看：

- 第 13 节：Narrative Composer **完全确定性**，不使用 LLM
- 第 24 节 PASS 8：Compiler 已经要跑 **100,000 局仿真**
- 第 72 节：**同一个章节可以无限次运行**

那么 100,000 局仿真天然会枚举出这个章节**实际可达的、高频出现的** Result 文本集合。这份集合可以在编译期直接批量生成音频、随 Chapter Bundle 一起发布。

收益：

- 绝大多数轮次 Audio Cache 直接 HIT，Dice Buffer 退化为罕见兜底而非常态机制
- 骰子动画时长可以按叙事节奏设计，而不是被 TTS 延迟绑架
- **G08（TTS failure 不影响 Story）** 的达成难度大幅下降 —— 主链路根本不依赖在线 TTS
- 第 28 节 MASTER 与第 29 节 COMPILED 的界线自然消失

对应的模型简化：第 27 节的三分类 MASTER / COMPILED / SOUND 可以收敛为两类 —— **SPEECH**（已有音频资产，来源可以是离线制作、编译期生成或运行时缓存）与 **SOUND**（BGM / SFX / Ambience）。"谁生产的"是内容管线的关注点，运行时只需要知道"有没有可播的文件"。

这条建议不新增运行时组件，只是把工作从运行时挪到编译期 —— 与第 72 节"制作阶段创造机器，直播时机器自己运行"的核心思想完全一致。

---

## 7. 明确背书：不建议改动的部分

为防止审计引发不必要的重构，以下设计经复核**判定为正确，不应改动**：

1. **P-01 ~ P-04 四条工程原则** —— 尤其 P-04（故事 Runtime 不依赖 LLM）是整个产品可靠性的地基。
2. **第 8 节 Seeded PRNG + ROLLED / PUBLISHED 时间分离** —— 后台结算与视觉呈现解耦是正确的，且是 Replay 确定性的前提。
3. **第 10 节 人数 → Action Scale，禁止转攻击力** —— 这是本产品与"礼物互动游戏"的分界线，是产品身份本身。
4. **第 11 节 Result Merge 禁止生成多条时间线** —— 单一世界线是绘本叙事成立的前提。
5. **第 22 节 六等级必须显式覆盖（mapsTo 或 unreachable）** —— 这个"不许省略"的设计纪律非常好，建议推广到本审计 P2-2 提出的 `noParticipationPolicy`。
6. **第 51 节 Audio Cache Key 包含 voiceModelVersion** —— 换声音后的错误复用是个真实陷阱，规范已经预见到了。
7. **第 54 节 Operator 不得篡改 Dice / Result / Event Log，必须产生 OPERATOR_OVERRIDE** —— 审计完整性的正确做法。
8. **第 57 节 每个模块必须提供 Health** —— 已在 DEV-000 落地为 `packages/shared` 的冻结契约。建议补一条：**每个模块自落地起就实现 `getHealth()`，不等到 DEV-061**，否则 M6 要回头改所有模块。
9. **第 70 节 禁止重新引入清单** —— 应长期保留并在每个 Task Package 中重申。
10. **第 26 节 Compile–Repair Loop** —— AI 产出必须过编译器才能进资产生产，这是内容规模化的正确闸门。

---

## 8. 变更请求清单

| CR | 等级 | 内容 | 影响节点 |
|---|---|---|---|
| CR-001 | P0 | 补齐 `recovery/` `boss/` `endings/` `visuals/` `metadata/` `manifest.json` `host.public.json` 的结构定义 | DEV-001 及全部下游 |
| CR-002 | P0 | 定义 HP / Life / alive 的产品规则与 recovery 机制 | DEV-001, DEV-006 |
| CR-003 | P0 | 明确 `playerEffects` 为 ActionGroup 批量语义 | DEV-001, DEV-006 |
| CR-004 | P1 | DEV-007 移至 DEV-009 之后，重定义为复用 Kernel 的 headless driver | DEV-007, DEV-009 |
| CR-005 | P1 | PRESENTATION region 压缩为 LOADING/READY/FAILOVER；AUDIO region 改为声道占用建模 | DEV-009, DEV-020, DEV-032 |
| CR-006 | P1 | DEV-002 = PASS1+2；DEV-003 = PASS3+5；新增 DEV-002A = PASS6；PASS7 拆入 PASS2 与 DEV-075 | DEV-002, DEV-003, DEV-075 |
| CR-007 | P1 | Narrative Composer 上移至 M1，纳入仿真回路 | DEV-033 → M1 |
| CR-008 | P1 | Runtime Snapshot 在 DEV-009 即完成 PUBLIC/HIDDEN 类型层分区 | DEV-008, DEV-009, DEV-050 |
| CR-009 | P1 | DEV-008 执行顺序前移至 DEV-001 之后 | DAG 执行序 |
| CR-010 | P2 | 新增 DEV-057A Host Output Safety Filter | 第五施工组 |
| CR-011 | P2 | `InteractionNode` 增加 `noParticipationPolicy`，纳入 PASS 4 强制覆盖 | DEV-001, DEV-002 |
| CR-012 | P2 | DEV-028 增加 `PRESENTATION_RESYNC` 全量重同步命令 | DEV-028 |
| CR-013 | P3 | DEV-060 拆为 Operator API（优先）与 Console UI（后置） | DEV-060 |
| CR-014 | P3 | Host Avatar 砍掉 Live2D / VRM，保留静态 PNG + 微动 | DEV-058 |
| CR-015 | P3 | 产品指标全部离线派生，不建实时指标系统 | 无新增节点 |
| CR-016 | P3 | 取消 `state-engine` 与 `event-engine` 包，包数 19→17 | 第 4 节 |
| CR-017 | P3 | `LivePlatformAdapter` 只冻结 Twitch 形状，标注 DEV-080 计划性修订；不提前建空包 | DEV-040, DEV-080 |
| CR-018 | 优化 | 编译期 TTS 预生成（由 PASS 8 仿真驱动）；音频三分类收敛为 SPEECH / SOUND | DEV-030, DEV-035, DEV-036, DEV-075 |
| CR-019 | 补充 | 每个模块自落地起实现 `getHealth()`，不等到 DEV-061 | 全部节点 |
| CR-020 | 补充 | 明确 Failover 决策权只在 SAFETY region，PRESENTATION.FAILOVER 与 OBS 切场均为执行端 | DEV-055 组, DEV-065 |

---

## 9. 对 DEV-000 的影响

**无。** DEV-000 是仓库与工具链基线，不受任何 CR 影响，可继续施工。

CR-016（取消两个包）与 CR-019（getHealth）本来就与 DEV-000 的"不提前建包 + Health 进 shared"决策一致 —— 审计反过来验证了这两个决定。

---

## 10. 建议的处理顺序

1. **CR-001 / 002 / 003 必须在 DEV-001 下发前解决**，否则 Chapter Schema 只能覆盖一半，后续要开 FIX Package 回头补，而 schema 的下游冻结面太宽，返工代价最高。
2. CR-004 ~ 009 在 DEV-002 下发前确认即可，但越早越好 —— 它们改的是 DAG 结构而非代码。
3. CR-010 ~ 020 可在对应施工组开始前逐一确认。
