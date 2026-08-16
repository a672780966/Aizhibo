# CR RESOLUTIONS 001

Resolved by: Claude Commander
Date: 2026-08-16
Scope: CR-010、CR-012、CR-017、CR-018
Authorization: USER 指示「解决 CR」（2026-08-16）

| CR | 裁决 | 是否改动已冻结规范语义 |
|---|---|---|
| CR-010 | **采纳**，设计见 §1 | 是（新增运行时组件 + DEV-002A 增加产物） |
| CR-012 | **采纳**，契约位置调整见 §2 | 否（补齐 §35 未定义的重连路径） |
| CR-017 | **部分采纳**，改为窄化核心消费面 + 合规变量前置，见 §3 | 否（不删 §43 接口） |
| CR-018 | **采纳但机制修正**，见 §4 | 是（§27 音频分类与 §29 生成时机） |

---

## 1. CR-010 — Host 出站安全过滤

### 1.1 裁决

采纳。新增节点 **DEV-050A — Host Egress Gate**。

**编号从原提案的 DEV-057A 改为 DEV-050A。** 理由：它与 DEV-050 Public State Gateway 是同一道安全边界的两半 ——

- DEV-050 管**读**：Host 读不到 Hidden State
- DEV-050A 管**写**：Host 说不出 Hidden 内容

放在 DEV-057 之后会让人误以为它只是 TTS 的前置滤网，而它实际管辖的出口不止一个。

### 1.2 关键发现：出口不只一个

第 46 节 DEV-046 Twitch Send Chat 也是 Host 的出站路径。Host 既能说话也能打字。

因此 Egress Gate 必须是**唯一出口收束点**，而不是 TTS 的前置步骤：

```
Host LLM 输出
     ↓
【DEV-050A Host Egress Gate】  ← 唯一出口
     ├──→ DEV-057 Host TTS
     └──→ DEV-046 Send Chat
```

架构约束：`ai-host` 包**不得导出任何绕过 Gate 的发言函数**。Host 的唯一发声方式是调用 Gate。这一条要写进 DEV-050A 的 Acceptance，并在 DEV-046 / DEV-057 的 Acceptance 中反向验证（这两个节点不得暴露可被 Host 直接调用的出站接口）。

### 1.3 检查链（全部确定性，无 LLM）

按顺序执行，任一条不通过即 `DROP`：

**C1 — Permission 检查**
第 39 节三档 `ALLOWED / LIMITED / MUTED`。MUTED 时直接丢弃。把它折进 Gate 是为了保证只有一处判定权限，避免 Scheduler 和 TTS 各自判一次。

**C2 — Hidden 词表检查（本 CR 的核心价值）**

这一条解决了 Public State Gateway 单独解决不了的问题：

> Gateway 保证 Host **读不到** Hidden State。但观众可以把剧透**喂给** Host，Host 复述出来 —— 泄露照样发生，而 Gateway 完全无感。

做法：Compiler 在 PASS 6（DEV-002A）已经算出每个场景的可公开集合。**把它的补集作为运行时禁言词表输出到 Runtime Bundle**：

```typescript
type ForbiddenLexicon = {
  // 场景 id → 在该场景尚不得出现的表层字串
  bySceneId: Record<string, string[]>
  // 全章节始终禁止（结局名、Boss 秘密名等）
  always: string[]
}
```

Gate 对候选发言做规范化匹配（去空白、统一大小写、去标点、可选同形字折叠）后检查命中。

于是 **G06（Host Hidden Information Leak = 0）获得读写双向防线**：

| 防线 | 节点 | 作用面 |
|---|---|---|
| 编译期白名单穷举 | DEV-002A | 作者不得把 Hidden 写进 host.public |
| 类型层可见性分区 | DEV-009 | Host 代码路径拿不到 Hidden 字段 |
| 运行时读投影 | DEV-050 | 只暴露 Public State |
| **运行时写词表** | **DEV-050A** | **Host 复述剧透也说不出去** |

**C3 — 平台合规规则**
关键词 / 正则 denylist，**数据驱动、按平台分文件**。第 47 节明确 Bilibili 的规则与 Twitch 不同，因此规则集必须是配置而非代码。

**C4 — 重复与刷屏防护**
对第 41 节已有的 Recent Host Lines 环形缓冲做相似度去重。理由不是安全，是观感 —— Host 卡在循环里复述同一句话，在直播上看起来就是坏了。

**C5 — 长度与频率上限**
单条长度上限 + 单位时间条数上限。

### 1.4 只允许 DROP，不允许改写

Gate 的判定只有 `ALLOW | DROP`。

**不做改写、不做重试。** 改写需要 LLM，会引入新的延迟与失败模式；重试会在被持续诱导时形成循环。静默丢弃符合第 56 节 L1 的处理原则（Host 失败忽略，故事继续）。

每次 DROP 必须产生事件：

```
HOST.UTTERANCE_DROPPED { rule: "C2", matchedTerm: "...", phase: "..." }
```

理由有两个：一是审计（G06 需要可量化证据，"泄露 0 次"必须有据可查）；二是这些事件是发现"观众正在系统性诱导"的唯一信号。

### 1.5 对 M1 的涟漪

**DEV-002A 的 Outputs 增加一项**：`ForbiddenLexicon`，随 Runtime Bundle 发布。

这是本 CR 唯一波及 M1 的地方，但它是必须的 —— 词表只能由编译期算，运行时无从推导。

### 1.6 DAG 位置

| 项 | 值 |
|---|---|
| 节点 | DEV-050A — Host Egress Gate |
| 施工组 | 第五组（AI Host） |
| 执行序 | 紧随 DEV-050，**先于** DEV-051 ~ DEV-058 |
| 依赖 | DEV-050、DEV-002A（词表产物） |

先于所有 Host 功能节点，因为它们全都必须通过 Gate 出站 —— 出口先建好，才不会有人绕路。

---

## 2. CR-012 — Renderer 全量重同步

### 2.1 裁决

采纳。但**契约位置从 DEV-028 上移到 DEV-012 Runtime API**。

### 2.2 为什么上移

第 61 节 Contract Test 明确把 `Presentation Command` 列为契约测试对象。契约应当在第一个消费者出现**之前**冻结。

第 65 节 DEV-012 Runtime API 的职责就是"给 Renderer / Operator / Platform 提供内部接口"，且它是 M1 的最后一个节点 —— 正好在第二施工组开工之前。

若把命令信封留到 DEV-028（第二组最后一个节点）才定，DEV-020 ~ DEV-027 会先按一个未定型的协议开发，然后集体返工。

**结论**：
- `PresentationCommand` 信封（含 `commandSeq` 与 `PRESENTATION_RESYNC`）→ **DEV-012 冻结**
- 命令总线的分发实现 → 仍在 DEV-028

于是 M1 结束时，三个对外契约全部冻结：Runtime Event（DEV-008）、Presentation Command（DEV-012）、Public State 的可见性分区（DEV-009）。

### 2.3 PresentationState 必须是派生的

RESYNC 需要一份"当前演出全貌"。这里有个真实的架构陷阱：把它单独存起来，就出现了第二个真相源，直接违反 P-01。

**必须派生。** 而且第 18 节 LKG 已经要求记录 `Current Asset State` 与 `Current Audio Position`，所以所需信息本来就在 Runtime Snapshot 里 —— `PresentationState` 是它的投影函数，不是新容器。

```typescript
type PresentationState = {
  commandSeq: number          // 本快照对应的命令序号
  visualSceneId: string
  characters: CharacterPlacement[]
  subtitle: { text: string; visible: boolean } | null
  uiMode: "NONE" | "CHOICE" | "DICE" | "RESULT"
  choiceCounts?: Record<string, number>
  dicePhase?: "INTRO" | "LOOP" | "RESOLVE"
  audio: { bgmId?: string; ambienceIds: string[]; positionMs?: number }
  hpUi?: unknown
  bossUi?: unknown
}
```

### 2.4 commandSeq：不加它就会静默错屏

每条 `PresentationCommand` 携带单调递增 `commandSeq`。

没有它会出现这个竞态：Renderer 重连 → Runtime 发 RESYNC → 但重连前发出、仍在链路上的旧命令随后抵达 → Renderer 把过期命令应用到刚同步好的画面上 → 表情、字幕或 UI 停在错误状态，而且**不报错**。

规则：

1. RESYNC 携带其对应的 `commandSeq = N`
2. Renderer 丢弃所有 `commandSeq <= N` 的命令
3. Renderer 检测到序号跳空时，主动发 `REQUEST_RESYNC`
4. RESYNC 必须幂等 —— 连续应用两次得到同一画面

### 2.5 握手流程

```
Renderer 连接
   → RENDERER_HELLO { lastAppliedSeq? }
   ← PRESENTATION_RESYNC { presentationState, commandSeq: N }
   ← 后续增量命令 seq > N
```

首次连接时 `lastAppliedSeq` 省略，与重连走同一条路径 —— **不为"首次"和"重连"设计两套逻辑**，重连路径若只在崩溃时才走，就永远得不到测试覆盖。

### 2.6 涉及节点

| 节点 | 变更 |
|---|---|
| DEV-012 | Outputs 增加：`PresentationCommand` 信封（含 `commandSeq`）、`PRESENTATION_RESYNC`、`RENDERER_HELLO`、`REQUEST_RESYNC`；`getPresentationState()` 投影函数 |
| DEV-020 | 实现握手；序号跳空检测 |
| DEV-028 | 实现分发与序号分配；RESYNC 幂等性测试 |

---

## 3. CR-017 — 不提前抽象 Platform Adapter

### 3.1 裁决

**部分采纳。** 不删除第 43 节的 `LivePlatformAdapter` —— 它作为 Twitch 的形状是合适的。真正要做的是另外两件事。

原提案「不要抽象」的方向对，但落点不对：接口本身不是问题，问题是**核心对它的消费面有多宽**，以及**合规差异是否会打到已冻结的存储层**。

### 3.2 措施一：窄化 Runtime 核心的消费面

Runtime 核心（DEV-009 ~ DEV-012）**不得依赖任何平台特有类型**。核心只认两个窄契约：

```typescript
// 入站：唯一入口
type NormalizedChatMessage = {
  platform: string
  viewerId: string          // 平台内唯一
  messageId: string         // 用于第 43 节要求的去重
  text: string
  receivedAt: number
}

// 出站：唯一出口
sendChat(message: string): Promise<void>
```

Twitch 的 `channel.chat.message` 里的 structured fragments、badge、emote 等一律**在 Adapter 内消化**，不进入核心。

这样即使 DEV-080 时接口大改，改动被限制在 `platform-*` 包内，`runtime-kernel` / `interaction-engine` 不受影响。**保护的不是接口，是核心。**

### 3.3 措施二：合规变量必须在 M1 前置（本 CR 的实质内容）

第 47 节：

> Bilibili 开放平台涉及开发者认证、应用关联和用户数据处理规则，因此该 Adapter 的数据存储策略必须单独经过平台合规检查，不能简单照搬 Twitch Viewer Memory。

DEV-010 Persistence 在 **M1**，DEV-081 Bilibili Adapter 在 **POST-M8**。如果 M1 的存储层按 Twitch 规则设计，等 Bilibili 落地时就是一次带数据的 schema 迁移 —— 而那时是线上系统。

因此 DEV-010 必须让保留策略**可表达**：

1. 所有观众相关表（`viewer_states`、`host_viewer_memory`、`host_running_jokes`）**必含 `platform` 列**，并进入主键或唯一索引（呼应第 15 节 Identity = `platform + viewerId`）
2. 必含 `created_at` / `last_seen_at`，使"按时间清理"在数据层面可行
3. 保留策略是**按平台的配置**，不是硬编码常量
4. 观众标识不得作为其它表的裸外键散布 —— 集中在上述三张表，便于按平台整体清理

**边界**：DEV-010 只负责让保留策略**可表达**。清理任务本身（purge job）不在 M1，属 DEV-054 / DEV-081 时代。

这是"现在花很小代价，避免以后在线迁移"的典型情形 —— 不是提前实现功能，是不把自己焊死。

### 3.4 措施三：明确标注单实现抽象

DEV-040 组冻结的接口在文档中标注：

> `LivePlatformAdapter` v1 — 由 Twitch 单一实现推导，**未经第二实现验证**。DEV-080 首个异构平台落地时进行一次计划性修订，该修订是预期事件，不是设计失败。

同时保持 Rev 2 已决定的：`platform-youtube` / `platform-bilibili` 在对应节点前不创建。

---

## 4. CR-018 — 编译期音频预生成

### 4.1 先更正我在审计中的机制判断

审计 §6 提出「用 PASS 8 仿真枚举高频 Result 文本，编译期批量生成音频」。**这个机制不成立** —— 组合数量级算错了。

Result 文本对应的是 **ResultSet**（一轮里多个 ActionGroup 结算的合流，第 11 节），不是单个 result。以 4 个选项、6 个等级估算，一次互动的 ResultSet 空间是各子集组合之和：

```
C(4,1)·6 + C(4,2)·6² + C(4,3)·6³ + C(4,4)·6⁴
= 24 + 216 + 864 + 1296 = 2400
```

一个章节 30 个互动即约 72,000 条完整语句。按每条 10 秒计，是 200 小时音频。**不可行。**

### 4.2 正确的切入点在更低一层

关键在第 13 节：Narrative Composer 的输出**本身就是块拼装**的 ——

```
PREFIX + SUPPORT + PRIMARY + URGENCY + TRANSITION
```

要预生成的**不是句子，是块**。

块的数量级完全不同：`ADDENDUM §A7` 的 `NarrativeBlock` 是章节作者手写的有限集合，一个章节几百条量级。**全量离线生成完全可行**，而且第 28 节明确允许为此使用质量更高、速度更慢的离线模型：

> 可以为了演技选择质量更高、速度较慢的离线语音模型。

于是运行时的工作从"生成一段语音"变成"按顺序播放 2–5 个音频片段"。**零 TTS 调用，零延迟，完全确定性。**

规范自己的叙事模型早就是块结构的 —— 这不是绕路，是顺着已有设计走下去。

### 4.3 采纳内容

**音频解析链**（在 DEV-030 Audio Manifest 定义，全系统统一）：

```
1. PREGENERATED  预生成块音频     → 直接播放（常态路径）
2. CACHE         运行时 TTS 缓存   → 直接播放
3. RUNTIME_TTS   现场生成          → 播放并写入缓存（兜底）
4. SUBTITLE_ONLY 字幕 + BGM + SFX  → 第 31 节 / 第 56 节 L2 降级
```

**`AudioAsset.source` 枚举**（修订 `ADDENDUM §A10`）：

```typescript
source: "PREPRODUCED" | "PREGENERATED" | "RUNTIME_TTS"
```

- `PREPRODUCED` — 人工/离线精修，第 28 节 Master Audio（Chapter Intro、Boss 登场、Ending 等）
- `PREGENERATED` — 编译期由 Narrative Block 批量生成（**新**）
- `RUNTIME_TTS` — 兜底

**第 27 节三分类的处置**：`MASTER / COMPILED / SOUND` 的前两者区别在"谁生产的"，属内容管线关注点；运行时只关心"有没有可播文件"。因此收敛为 `kind: SPEECH | BGM | SFX | AMBIENCE` + `source` 字段（`ADDENDUM §A10` 已如此起草，本 CR 只是补上 `PREGENERATED` 一档）。

### 4.4 归属节点：不需要新增

第 65 节 **DEV-074 Audio Production Queue**（第七施工组）正是干这个的。它获得明确职责：

> 遍历 Chapter Pack 全部 `NarrativeBlock`，批量生成 `PREGENERATED` 音频，随 Bundle 发布。

`DEV-075 Chapter Packager` 的 PASS 7 资产文件存在性检查随之覆盖：**每个可达 NarrativeBlock 必须有对应音频文件**。

**没有排序问题**：M3（音频）在 M7（内容工厂）之前，所以 M3 ~ M6 期间只有 RUNTIME_TTS 路径 —— 这正是 DEV-035 Result TTS 的用途。M7 之后它退居兜底。前提是 DEV-035 从一开始就按**兜底形态**建造，而不是按主路径建造，因此 §4.3 的解析链必须在 DEV-030 就定义。

### 4.5 Dice Buffer 不删除，但重新定位

第 31 节的 Dice Buffer 在原设计中是**延迟遮掩机制**。预生成之后，`AUDIO_READY?` 在常态下立即为真。

但它不该被删除，因为：

1. 兜底 TTS 路径仍然存在
2. `minDiceMs 3500` 的存在理由是**戏剧节奏**，不是延迟 —— 骰子在 T0 后几毫秒就已算完（第 31 节原文），动画本来就是表演
3. Host TTS 仍是实时的

**重新定位**：DEV-037 从「延迟遮掩控制器」改为「节奏控制器 + 延迟安全阀」。常态按 `targetDiceMs` 走叙事节奏；仅在兜底路径未就绪时才进入延长逻辑；`maxDiceMs` 到达后按第 31 节降级到字幕 + BGM + SFX，且本轮不补播迟到的 Result 音频。

复杂度实际下降 —— 常见路径不再需要激进的 loop 延长逻辑。

### 4.6 收益与代价

**收益**

- **G08（TTS failure 不影响 Story）从"靠降级达成"变为"结构上成立"** —— 主链路根本不调用在线 TTS。这是四条 CR 里对上线 Gate 影响最大的一条。
- 骰子动画时长可按叙事设计，不被 TTS 延迟绑架
- 经济性：几百块一次性生成，对比无限次重跑中的每轮 TTS 调用（第 72 节：同一章节可无限次运行）
- 确定性提升：Replay 时音频层也是确定的

**代价：拼接处的韵律断裂**

这是真实成本，必须正视。单条完整语句的语音自然度高于多段拼接。

缓解手段：

1. 第 13 节的块划分本身就是**句/从句级**边界，不是词级 —— 天然接缝较少
2. `PRIMARY` 块（承担戏剧重量的那一段）**整句生成**，接缝只出现在 PREFIX / TRANSITION 等次要位置
3. `PREFIX` / `TRANSITION` 可做成固定短过门，甚至由音效承担
4. 利用 `ADDENDUM §A7` 已有的 `NarrativeBlock.tone` 约束同场景块的语气一致性
5. 片段间加短交叉淡化

**验证要求**：DEV-030 / DEV-033 阶段必须做一次拼接听感原型（十来条真实块拼装试听），确认可接受后再在 DEV-074 投入全章节生成。若听感不可接受，退回方案是"仅预生成 PRIMARY 块，其余走运行时 TTS" —— 那样仍能消除大部分延迟。

---

## 5. 落地变更汇总

### 5.1 新增节点

| 节点 | 名称 | 组 | 执行序 | 依赖 |
|---|---|---|---|---|
| DEV-050A | Host Egress Gate | 第五组 | 紧随 DEV-050 | DEV-050、DEV-002A |

### 5.2 既有节点职责变更

| 节点 | 变更 |
|---|---|
| DEV-002A | Outputs 增加 `ForbiddenLexicon`（随 Bundle 发布） |
| DEV-009 | 无变更（CR-008 已覆盖可见性分区） |
| DEV-010 | 观众表必含 `platform` + 时间戳；保留策略为按平台配置；不实现 purge job |
| DEV-012 | Outputs 增加 `PresentationCommand` 信封（含 `commandSeq`）、`PRESENTATION_RESYNC`、`RENDERER_HELLO`、`REQUEST_RESYNC`、`getPresentationState()` |
| DEV-020 | 实现握手与序号跳空检测 |
| DEV-028 | 实现序号分配与分发；RESYNC 幂等性测试 |
| DEV-030 | 定义全系统统一音频解析链（4 级） |
| DEV-035 | 按**兜底形态**建造，非主路径 |
| DEV-037 | 重定位为节奏控制器 + 延迟安全阀 |
| DEV-040 组 | 核心只消费 `NormalizedChatMessage` + `sendChat`；接口标注单实现抽象 |
| DEV-046 / DEV-057 | 不得暴露绕过 Egress Gate 的出站接口 |
| DEV-074 | 明确职责：批量生成 `PREGENERATED` 块音频 |
| DEV-075 | PASS 7 覆盖"每个可达 NarrativeBlock 有音频文件" |

### 5.3 增补稿修订

| 位置 | 修订 |
|---|---|
| `ADDENDUM §A10` | `source` 增加 `PREGENERATED` 一档；移除「CR-018 待决」标注 |
| `ADDENDUM §A15` | PASS 6 增加产物 `ForbiddenLexicon` |

### 5.4 未变更

- 第 43 节 `LivePlatformAdapter` 接口定义保持原文
- 第 31 节 Dice Buffer 的 min/target/max 与降级行为保持原文
- 第 39 节 Host Permission 三档保持原文
- 第 51 节 Audio Cache Key 保持原文（仍服务兜底 TTS 与 Host TTS）

### 5.5 可回退性

CR-012 与 CR-017 只补齐规范未定义处，不改已冻结语义，无回退成本。

CR-010 与 CR-018 改动了规范正文的语义（前者新增运行时组件与编译产物，后者改变音频分类与生成时机）。若需保留原样，回退点分别是：

- CR-010：删除 DEV-050A 与 DEV-002A 的词表产物 —— 代价是 G06 只剩读向防线，Host 复述剧透无法拦截
- CR-018：`source` 去掉 `PREGENERATED`，DEV-074 恢复为仅处理 Master Audio —— 代价是 G08 重新依赖降级达成，且骰子时长被 TTS 延迟绑架
