# AI 自驱动互动绘本直播系统
## 最终产品开发需求规范
### Development Specification V1.0

---

# 0. 文档性质

本文件是产品 V4 冻结后的**工程实施基线**。

开发目标不是 MVP。

目标是：

> 从第一行代码开始就按照最终产品架构施工，每个阶段完成的代码均属于最终系统，不制造后续需要推倒重来的临时代码。

开发主体：

**1 名开发者 + AI 编程 Agent。**

开发策略：

> 模块化单体 + 明确规格 + 自动测试 + AI 并行施工。

---

# 1. 最终产品定义

产品是一套：

> **由结构化 Chapter Pack 驱动、由直播观众共同决策、由规则和骰子决定结果、由状态机自动演出、由 AI 助播维持直播间社交关系的无人值守互动绘本直播系统。**

产品不是：

- MMO
- 3D 游戏
- 实时 AI 生成游戏
- AI 自由跑团
- 多 Agent 模拟世界
- 礼物互动游戏
- 传统投票故事

最终用户体验：

```text
观看故事
   ↓
出现选择
   ↓
观众 A/B/C/D
   ↓
形成行动组
   ↓
骰子
   ↓
行动结果
   ↓
世界状态变化
   ↓
故事演出
   ↓
下一页
```

核心原则：

> **人数决定行动规模与形态。**

> **骰子决定行动质量与顺逆。**

> **代码决定事实。**

> **状态机推动故事。**

> **AI 不掌握运行时裁判权。**

---

# 2. 总体工程原则

## P-01 单一事实源

运行时只能存在一个权威状态：

# Runtime Snapshot

不得出现：

- Story State 一套真相
- Audio State 一套真相
- Renderer 一套真相
- AI Host 自己保存一套剧情状态

所有系统只能读取或提交 Event。

最终真相由 Runtime Kernel 更新。

---

## P-02 AI 不参与确定性规则

以下操作禁止交给 LLM：

- 掷骰
- HP 计算
- Life 计算
- 人数统计
- 成败判定
- Story Transition
- World Flag 修改
- Boss 判定
- Recovery 判定
- Action 合法性
- Hidden State 权限判断

---

## P-03 AI 不提前知道未来

AI Host：

只能读取：

```text
Public Runtime State
```

不得读取：

```text
Future Scene
Hidden Truth
Boss Secret
Ending
Unrevealed Flag
Correct Answer
```

这是权限隔离，不是 Prompt 约束。

---

## P-04 故事 Runtime 不依赖 LLM

即使：

```text
OpenAI DOWN
Anthropic DOWN
Gemini DOWN
```

正式剧情仍必须可以：

> 从当前节点继续运行直到章节结束。

AI Host 可以离线。

故事不能停。

---

# 3. 技术栈

## 3.1 主语言

# TypeScript

Runtime、Compiler、Platform Adapter、Operator Console、Renderer 尽量统一 TypeScript。

原因：

- Twitch / WebSocket 生态适配
- Web Renderer 原生
- XState 原生 TS
- AITuber OnAir 本身就是模块化 TypeScript 工具包，并提供 Twitch/YouTube 评论、LLM、TTS、Memory、Live2D/PNG/VRM 相关能力，可选择性复用而不必 Fork 整个产品。

---

## 3.2 项目形态

# Monorepo + Modular Monolith

禁止第一版：

- Kubernetes
- 微服务
- Kafka
- Redis Cluster
- Service Mesh

推荐：

```text
pnpm
+
TypeScript
+
Node.js
+
React
+
XState v5
+
SQLite
```

---

# 4. 仓库规范

```text
interactive-story/
│
├── apps/
│   ├── runtime/
│   ├── renderer/
│   └── operator/
│
├── packages/
│   ├── chapter-schema/
│   ├── chapter-compiler/
│   ├── runtime-kernel/
│   ├── state-engine/
│   ├── event-engine/
│   ├── rule-engine/
│   ├── dice-engine/
│   ├── interaction-engine/
│   ├── narrative-composer/
│   ├── audio-engine/
│   ├── platform-core/
│   ├── platform-twitch/
│   ├── platform-youtube/
│   ├── platform-bilibili/
│   ├── ai-host/
│   ├── host-memory/
│   ├── obs-control/
│   ├── persistence/
│   └── shared/
│
├── chapters/
│
├── assets/
│
├── scripts/
│
├── specs/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── simulation/
│   ├── replay/
│   └── soak/
│
└── tools/
```

---

# 5. Runtime 总节点结构

整个 Runtime 使用一个根 Statechart。

XState v5 支持 parallel states：多个 Region 同时保持活动，并同时接收事件；同时支持 Actor snapshot 持久化和恢复，因此非常适合作为长时间、可恢复的直播运行内核。

根节点：

```text
RUNTIME
│
├── STORY
├── PRESENTATION
├── INTERACTION
├── AUDIO
├── HOST
├── PLATFORM
└── SAFETY
```

这些是**并行 Region**。

但只有一个 Runtime Snapshot。

---

# 6. STORY Region

状态：

```text
STORY
│
├── BOOT
├── CHAPTER_LOADING
├── SCENE_ENTER
├── STORY_PLAYING
├── INTERACTION_PENDING
├── RESOLUTION_PENDING
├── RESULT_PLAYING
├── TRANSITION
├── CHAPTER_END
└── ERROR
```

---

## 6.1 BOOT

负责：

- Runtime 初始化
- 配置读取
- DB 初始化
- Chapter Bundle 校验
- Snapshot 恢复检查

退出条件：

```text
runtimeReady = true
```

---

## 6.2 CHAPTER_LOADING

负责加载：

```text
manifest
storyGraph
initialState
assets
rules
narratives
audioManifest
```

不得直接开始播放。

必须通过 Bundle Integrity Check。

---

## 6.3 SCENE_ENTER

加载：

```text
sceneId
background
characters
initialExpressions
BGM
ambientAudio
sceneNarration
```

随后发：

```text
SCENE.READY
```

进入 STORY_PLAYING。

---

## 6.4 STORY_PLAYING

负责固定剧情内容演出。

此时：

```text
hostPermission = MUTED / LIMITED
interaction = CLOSED
```

Story 内容播放结束：

```text
if interactionNode:
    → INTERACTION_PENDING
else:
    → TRANSITION
```

---

# 7. INTERACTION Region

状态：

```text
INTERACTION
│
├── CLOSED
├── ANNOUNCING
├── OPEN
├── LOCKING
├── LOCKED
└── RESOLVED
```

---

## 7.1 ANNOUNCING

显示：

```text
A
B
C
D
```

播放固定选项提示。

---

## 7.2 OPEN

接受观众输入。

每个 Viewer 每轮只有：

```text
one effective vote
```

例如：

```text
User123 → A
User123 → C
```

最终：

```text
User123 = C
```

最后一次合法输入覆盖前一次。

---

## 7.3 LOCKING

停止接受新的 gameplay choice。

但聊天仍然继续。

---

## 7.4 LOCKED

产生：

```text
ActionGroup[]
```

例如：

```json
[
  {
    "action": "SEARCH_HALL",
    "participants": 421
  },
  {
    "action": "INSPECT_CORPSE",
    "participants": 267
  }
]
```

---

# 8. Dice Engine

Dice Engine 独立于 State Machine，但只能通过 Event 被调用。

要求：

# Seeded PRNG

禁止：

```text
Math.random()
```

作为正式骰子源。

每次骰子产生：

```text
seed
rollIndex
diceType
rawValue
modifier
finalValue
```

全部进入 Event Log。

---

## 骰子事件

```text
DICE.REQUESTED
DICE.ROLLED
DICE.PUBLISHED
```

其中：

```text
ROLLED
```

发生在后台。

```text
PUBLISHED
```

发生在视觉骰子动画结束之后。

这两个时间必须分离。

---

# 9. Rule Engine

输入：

```typescript
type ResolveInput = {
  chapterId: string
  sceneId: string
  interactionId: string

  actionId: string
  participantCount: number

  dice: DiceResult

  worldState: WorldState
  playerStateSummary: PlayerStateSummary
}
```

输出：

```typescript
type ResolveResult = {
  actionId: string

  scale: ActionScale

  quality:
    | "DISASTER"
    | "FAILURE"
    | "COSTLY_SUCCESS"
    | "SUCCESS"
    | "GREAT_SUCCESS"
    | "SPECIAL"

  resultId: string

  worldEffects: StateEffect[]
  playerEffects: PlayerEffect[]

  narrativeId: string

  visibility:
    | "PUBLIC"
    | "DEFERRED"
}
```

---

# 10. 人数规则

人数不得直接转换为：

```text
攻击力
```

人数只能进入：

```text
Action Scale
```

建议标准：

```text
SOLO
SMALL
MEDIUM
LARGE
MASS
```

具体人数边界由 Chapter / World Rules 定义。

不同 Action Type 可以有不同 scale function。

例如：

### SEARCH

更多人：

> 扩大覆盖范围。

### STEALTH

更多人：

> 行动类型逐渐转为分散潜入 / 诱敌 / 佯攻。

### LIFT

更多人：

> 提高可搬运物体规模。

---

# 11. Result Merge

多个 Action Group 结算完成以后：

```text
ResultSet
```

必须合流。

例如：

```text
A → SECRET_DOOR_OPEN
B → ROYAL_SEAL_FOUND
C → CREATURE_AWAKE
D → GUARDS_APPROACH
```

不得生成四条永久时间线。

统一写入：

```text
World State
```

---

# 12. Narrative Focus

每一个 ResultSet 要计算：

```text
PRIMARY
SUPPORT
CONTEXT
DEFERRED
```

这个计算尽量由 Chapter Pack 中提前定义的：

```text
priority
category
urgency
```

完成。

禁止运行时 LLM 判断。

---

# 13. Narrative Composer

Narrative Composer：

# 不使用语言模型。

其输入：

```text
Resolved ResultSet
+
Narrative Dictionary
+
Scene Tone
+
Priority
```

输出：

```text
ResultNarrationText
```

例如：

```text
PREFIX
+
SUPPORT
+
PRIMARY
+
URGENCY
+
TRANSITION
```

Chapter Pack 中提前准备不同句法块。

---

# 14. World State

必须严格 Schema 化。

例如：

```typescript
type WorldState = {
  chapterId: string
  sceneId: string

  flags: Record<string, boolean | number | string>

  npc: Record<string, NPCState>

  danger: DangerState

  discovered: string[]

  activeThreats: string[]

  chapterVariables: Record<string, unknown>
}
```

禁止存：

```text
free form paragraph
```

作为事实源。

---

# 15. 玩家状态

每个 Viewer：

```typescript
type ViewerState = {
  platform: Platform
  viewerId: string

  hp: 0 | 1 | 2 | 3
  life: 0 | 1 | 2

  alive: boolean

  lastChoice?: string

  participationCount: number

  joinedChapterAt?: number
}
```

Identity：

```text
platform + viewerId
```

---

# 16. Event Log

这是整个系统可靠性的核心之一。

每个状态变化必须来源于 Event。

Event：

```typescript
type RuntimeEvent = {
  id: string
  sequence: number
  timestamp: string

  type: string
  payload: unknown

  chapterId: string
  sessionId: string
}
```

不需要每个事件重复保存完整 before/after snapshot。

正式实现：

```text
Event Log
+
Periodic Snapshot
```

更加合理。

---

# 17. Snapshot / Checkpoint

XState 支持 persisted snapshot，因此运行时应使用其持久化能力保存完整 actor 状态并恢复，而不是自行重新发明一整套 workflow persistence。

Checkpoint 发生：

```text
Scene Entry Complete
Interaction Resolved
Result Complete
Scene Transition Complete
Chapter End
```

---

# 18. Last Known Good State

LKG 必须包含：

```text
Runtime Actor Snapshot
+
Event Sequence
+
Chapter Version
+
PRNG State
+
Current Audio Position
+
Current Asset State
```

Crash：

```text
Runtime Restart
↓
load LKG
↓
Replay events after LKG if needed
↓
resume
```

---

# 19. Chapter Pack

正式目录：

```text
chapter/
│
├── manifest.json
│
├── story.graph.json
│
├── initial.state.json
│
├── world.rules.json
│
├── host.public.json
│
│
├── scenes/
│
├── interactions/
│
├── actions/
│
├── dice/
│
├── results/
│
├── state-rules/
│
├── narrative/
│
├── npc/
│
├── recovery/
│
├── boss/
│
├── endings/
│
├── visuals/
│
├── audio/
│
└── metadata/
```

---

# 20. Scene Node

每一个 Scene：

```typescript
type SceneNode = {
  id: string

  visualSceneId: string

  narration?: string[]

  characters: CharacterPlacement[]

  bgm?: string
  ambience?: string[]

  interactionId?: string

  next?: string

  guards?: SceneGuard[]

  hostPolicy: HostPolicy
}
```

---

# 21. Interaction Node

```typescript
type InteractionNode = {
  id: string

  promptAudioId?: string

  openDurationMs: number

  choices: Choice[]

  diceMode: "PER_ACTION_GROUP"

  resultPolicy: string

  nextScene: string
}
```

Choice：

```typescript
type Choice = {
  id: "A" | "B" | "C" | "D"

  label: string

  actionType: string

  ruleId: string

  visibleIf?: Condition[]
}
```

---

# 22. Result Dictionary

每个 Action 必须完整覆盖：

```text
DISASTER
FAILURE
COSTLY_SUCCESS
SUCCESS
GREAT_SUCCESS
SPECIAL
```

如果某结果等级不适用于该 Action：

不能省略。

必须显式：

```text
mapsTo = SUCCESS
```

或者：

```text
unreachable = true
```

这样 Compiler 才能证明 Coverage。

---

# 23. Chapter Compiler

Compiler 输入：

```text
Raw Chapter Pack
```

输出：

```text
Validated Runtime Bundle
```

这是整个内容生产系统最重要的工程模块。

---

# 24. Compiler Pass 结构

## PASS 1 — Schema

检查：

- JSON 格式
- ID 唯一
- 类型合法
- 必填字段

---

## PASS 2 — Reference

检查：

```text
Scene → Asset
Action → Rule
Rule → Result
Narrative → Block
Audio → File
NPC → Character
```

全部引用必须存在。

---

## PASS 3 — Graph

执行：

- Reachability
- Dead-end detection
- Unreachable node
- Infinite loop detection
- Ending reachability
- Boss reachability

---

## PASS 4 — Rule Coverage

模拟：

```text
every interaction
×
every action
×
every reachable quality
```

必须存在合法结果。

---

## PASS 5 — State Reachability

静态检查可能出现的 Flag 组合。

这里不是穷举所有布尔排列。

只追踪：

> **Story Graph 中真正可达的状态。**

---

## PASS 6 — Hidden Information

检查：

```text
host.public
```

不得引用：

```text
future
hidden
ending
boss-secret
```

---

## PASS 7 — Asset

验证：

- 图片
- 音频
- 字幕
- 角色表情
- 微动
- BGM

---

## PASS 8 — Simulation

Compiler 自动随机跑：

```text
10,000+
```

场 Chapter Simulation。

正式发布前提高到：

```text
100,000+
```

---

# 25. Chapter 内容 AI Pipeline

强模型：

# GPT-5.6 Sol / Fable 5

只用于 Offline Authoring。

主要任务：

```text
World Bible
↓
Chapter Outline
↓
Scene Graph
↓
Interaction Design
↓
Rule Dictionary
↓
Result Dictionary
↓
Narrative Blocks
↓
Boss
↓
Ending
↓
Review
```

一个模型生成。

另一个模型审计。

---

# 26. AI 不直接生成最终 Chapter Bundle

必须经过：

```text
AI Draft
↓
Schema Normalizer
↓
Compiler
↓
Compiler Error
↓
AI Repair
↓
Compiler
↓
PASS
```

形成：

# Compile–Repair Loop

只有 PASS 才进入资产生产。

---

# 27. Audio System 总原则

音频分三类：

## MASTER

提前制作。

## COMPILED

运行时确定性文本 → TTS。

## SOUND

BGM / SFX / Ambience。

---

# 28. Master Audio

用于：

- Chapter Intro
- 关键剧情
- NPC关键对白
- Boss登场
- Boss核心对白
- 情绪高潮
- Ending

要求：

> 可以为了演技选择质量更高、速度较慢的离线语音模型。

Runtime 不重新生成。

---

# 29. Runtime Result Audio

流程：

```text
Rule Result
↓
Narrative Composer
↓
Complete Text
↓
signature
↓
Audio Cache
```

HIT：

```text
PLAY
```

MISS：

```text
TTS
↓
CACHE
↓
PLAY
```

---

# 30. TTS 协议

对于 Result：

文本已经完整存在。

ElevenLabs 官方明确建议这种情况使用 HTTP Streaming；WebSocket 更适合文本本身正在逐步产生的 LLM → Voice 场景，而且复杂度更高。

因此：

```text
Story Result → HTTP Streaming TTS
```

AI Host：

```text
LLM Streaming
→ WebSocket TTS
```

---

# 31. Dice Buffer

完整过程：

```text
T0
Lock choices

T0 + 几毫秒
Dice 已经实际完成

T0 + 几毫秒
Rules 完成
Narrative 完成
TTS request 开始

与此同时：

DICE_INTRO
↓
DICE_LOOP
↓
AUDIO_READY?
```

READY：

```text
DICE_RESOLVE
→ RESULT AUDIO
```

NOT READY：

继续：

```text
DICE_LOOP
```

---

## Dice 时间

不硬编码固定长度。

配置：

```text
minDiceMs
targetDiceMs
maxDiceMs
```

例如产品初始目标：

```text
MIN  3500ms
TARGET 6000ms
MAX  12000ms
```

MAX 到达后：

> 不继续等待。

降级到：

```text
字幕
+
BGM
+
SFX
```

继续故事。

---

# 32. Audio State

Audio 只是 Runtime Statechart 的 Region。

例如：

```text
IDLE
MASTER
CHOICE
DICE
RESULT_PREPARING
RESULT
TRANSITION
DUCKED
ERROR
```

---

# 33. Presentation Region

```text
PRESENTATION
│
├── LOAD_SCENE
├── READY
├── CINEMATIC
├── CHOICE
├── DICE
├── RESULT
├── TRANSITION
└── FAILOVER
```

负责：

- 背景
- 角色
- 表情
- 微动画
- 字幕
- 镜头
- 粒子
- Choice UI
- Dice UI
- HP UI
- Boss UI

---

# 34. Renderer

技术：

# React Web App

OBS Browser Source 可以直接承载网页、图片、视频和音频，因此整个演出层使用 Web Renderer 是可靠而且足够的。

Runtime 和 Renderer 通过：

```text
localhost WebSocket
```

通信。

---

# 35. Renderer 不维护剧情

Renderer 只能收到：

```text
PresentationCommand
```

例如：

```json
{
  "type": "CHARACTER_EXPRESSION",
  "characterId": "priest",
  "expression": "fear"
}
```

不能：

```text
renderer.nextScene()
```

---

# 36. AI Host

AI Host 是整个正式 Runtime 唯一长期需要实时 LLM 的部分。

职责：

- 回复弹幕
- 主动评论
- 点名
- 吐槽行动组
- 评论骰子
- 提醒互动
- 缓解冷场
- 建立直播间内部梗

---

# 37. Host Context

输入：

```text
Host Persona
+
Host Mood
+
Public State
+
Current Phase
+
Recent Chat
+
Selected Comment
+
Viewer Memory
+
Recent Host Lines
```

---

# 38. Public State Gateway

必须存在：

```typescript
getPublicState(): PublicRuntimeState
```

绝不能给 Host：

```typescript
getRuntimeSnapshot()
```

Public State 例如：

```typescript
type PublicRuntimeState = {
  chapterTitle: string

  currentLocation: string

  knownFacts: string[]

  currentChoices?: PublicChoice[]

  currentChoiceCounts?: Record<string, number>

  publishedDice?: PublicDiceResult[]

  visiblePlayerCondition?: string

  currentTension: string

  phase: PublicPhase
}
```

---

# 39. Host Permission

三档：

```text
ALLOWED
LIMITED
MUTED
```

ALLOWED：

- Choice Wait
- Dice Wait
- Long Transition
- Idle

LIMITED：

- Result 后
-普通 Scene 切换

MUTED：

- Master Narration
- NPC关键对白
- Boss cinematic
- Ending
- Emotional climax

---

# 40. Comment Intelligence

不要所有 Chat 都交给 LLM。

AITuber OnAir 已经有 `comment-intelligence` 模块，采用 rules-first，并可以完成评论筛选、安全过滤、未选择评论摘要以及压缩 LLM context，正适合借用其设计或直接使用其独立 npm 包。

流程：

```text
Chat Stream
↓
Deduplicate
↓
Normalize
↓
Safety
↓
Priority
↓
Topic Cluster
↓
Select Candidate
↓
Host
```

---

# 41. Host Scheduler

Host 不能收到一句评论就说一句。

调度策略需要考虑：

```text
Current Story Phase
Chat Velocity
Last Host Speech Time
Selected Comment Importance
Conversation Continuity
Audio Channel Busy
```

核心：

# Story Audio > Host Audio

任何正式故事声音拥有抢占优先权。

---

# 42. Host Memory

不要一开始做复杂向量 Memory。

使用结构化数据库：

```text
viewerId
nickname
interactionCount
lastSeen
knownRunningJokes
hostAffinity
notableEvents
```

普通短期聊天：

Ring Buffer。

长期只保存：

> 明确结构化事实。

---

# 43. Platform Core

统一接口：

```typescript
interface LivePlatformAdapter {
  connect(): Promise<void>
  disconnect(): Promise<void>

  onChat(handler: ChatHandler): void

  sendChat(message: string): Promise<void>

  getHealth(): PlatformHealth
}
```

---

# 44. Twitch Adapter

首发。

使用：

# EventSub WebSocket + Twitch API

Twitch 官方 EventSub WebSocket 会发送 welcome、keepalive、notification、reconnect 等消息；并且 EventSub 是至少一次投递，相同通知可能重复，因此 Adapter 必须基于 `message_id` 做去重。

Chat：

```text
channel.chat.message
```

可以直接获得 chatter ID、name、message ID、text 及 structured fragments。

回复：

使用 Twitch Send Chat Message API。

---

# 45. Twitch Adapter 状态

```text
DISCONNECTED
CONNECTING
WELCOME
SUBSCRIBING
CONNECTED
RECONNECTING
DEGRADED
ERROR
```

必须支持：

- Keepalive watchdog
- Twitch requested reconnect
- OAuth refresh
- Event dedupe
- Exponential backoff

---

# 46. YouTube Adapter

最终产品预留。

YouTube 当前 Live Streaming API 提供 `liveChatMessages.streamList`，使用 server-streaming 低延迟推送新的聊天消息，并能使用 `nextPageToken` 在断线后从此前位置恢复，因此无需自行高频轮询。

---

# 47. Bilibili Adapter

最终产品预留。

Bilibili 官方开放平台明确包含：

> 开播能力和直播间消息长连能力。

因此平台抽象结构可以覆盖 Bilibili，但具体协议实现放在 Twitch 主链稳定之后。

同时 Bilibili 开放平台涉及开发者认证、应用关联和用户数据处理规则，因此该 Adapter 的数据存储策略必须单独经过平台合规检查，不能简单照搬 Twitch Viewer Memory。

---

# 48. OBS Layer

OBS 不承担业务逻辑。

只做：

- Browser Source
- Audio
- 编码
- 推流
- Failover Scene

---

# 49. OBS Scenes

至少：

```text
BOOT
LIVE
RECONNECTING
MAINTENANCE
ERROR
ENDING
```

Runtime 通过 OBS WebSocket 控制 failover。

---

# 50. Persistence

第一版最终产品：

# SQLite

表：

```text
runtime_sessions
runtime_snapshots
runtime_events

viewer_states

audio_cache

host_viewer_memory
host_running_jokes

chapter_runs

platform_events

errors
```

---

# 51. Audio Cache

Key：

```text
hash(
  voiceModelVersion
  + voiceId
  + resultText
  + voiceSettings
)
```

不能只用：

```text
resultId
```

否则换声音以后会错误复用。

---

# 52. Operator Console

这是最终产品必要组件。

页面：

# Overview

显示：

```text
Runtime Status
Chapter
Scene
Current State
Current Interaction
Choice Counts
Dice
Audio
Host
Platform
OBS
Errors
```

---

# 53. Operator Actions

支持：

```text
Pause
Resume

Mute Host
Unmute Host

Close Interaction
Force Resolve

Replay Current Audio

Restart Scene

Restore LKG

Switch OBS Failover

Emergency Stop
```

---

# 54. Operator 权限限制

Operator 可以：

> 改变运行流程。

但不能偷偷修改：

```text
Dice history
Resolved result
Event log
```

需要人工修复时：

必须产生：

```text
OPERATOR_OVERRIDE
```

Event。

保证审计完整。

---

# 55. Safety Region

```text
SAFETY
│
├── HEALTHY
├── DEGRADED
├── RECOVERING
├── FAILOVER
└── EMERGENCY_STOP
```

---

# 56. 故障等级

## L1

非关键：

```text
Host LLM error
Host TTS error
Viewer memory error
```

处理：

> 忽略，故事继续。

---

## L2

演出降级：

```text
Story TTS unavailable
Visual minor asset missing
```

处理：

> Subtitle / 固定音频 / fallback asset。

---

## L3

Runtime 可恢复：

```text
Renderer crash
Twitch disconnect
Runtime process restart
```

处理：

> 自动恢复。

---

## L4

Chapter Integrity failure

处理：

> Failover Scene + Operator intervention。

---

# 57. Runtime Health

每个模块必须提供：

```typescript
type Health = {
  status: "OK" | "DEGRADED" | "DOWN"

  lastSuccessAt?: number

  latencyMs?: number

  error?: string
}
```

---

# 58. Logging

所有日志 JSON Structured Log。

必须带：

```text
sessionId
chapterId
sceneId
eventSequence
component
severity
```

---

# 59. Metrics

产品指标和工程指标分开。

工程至少采集：

```text
Runtime uptime
Platform reconnect count
Duplicate event count
TTS latency
TTS cache hit ratio
Host latency
Renderer command latency
State transition latency
Chapter error count
Recovery count
```

---

# 60. 产品指标

至少：

```text
Unique viewers
Choice participants

first participation rate
repeat participation rate

choice-to-result retention

story-only retention

boss retention

average interaction depth

choice distribution

minority-choice participation

returning viewer rate
```

---

# 61. 测试系统

这是一个人 + AI 开发情况下必须比普通小项目更重的部分。

---

## Unit Test

每个 package：

```text
> 90% core logic coverage
```

不要求 UI 机械追求覆盖率。

---

## Contract Test

特别测试：

```text
Chapter Schema
Platform Adapter
Public State
Runtime Event
Presentation Command
```

---

## Simulation Test

虚拟直播间自动生成：

```text
10
100
1,000
10,000
```

Viewer。

测试：

- 选择
- 改票
- 重复消息
- 大量聊天
- Late event
- Disconnect
- Reconnect

---

## Replay Test

固定：

```text
Chapter Bundle
Event Log
PRNG Seed
```

Replay 最终：

```text
World State
Player State
Story State
```

必须完全一致。

---

## Fuzz Test

随机：

```text
Player count
Choice split
Dice
Timing
Reconnect
TTS failure
Host failure
```

最终必须：

> 永远进入合法 State。

---

# 62. Soak Test

正式上线前：

```text
24h
↓
72h
↓
168h
```

最终：

# 7 × 24 小时

无人运行。

需要注入模拟故障。

---

# 63. AI 开发规范

任何 AI Agent 不允许：

> 看到一句自然语言需求后直接改整个仓库。

必须走：

```text
SPEC
↓
PLAN
↓
IMPLEMENT
↓
TEST
↓
REVIEW
↓
ACCEPT
```

---

# 64. Development Unit

每个施工节点编号：

```text
DEV-001
DEV-002
...
```

每个节点都包含：

```text
Objective
Scope
Inputs
Outputs
Dependencies
Implementation
Tests
Acceptance
Out-of-scope
```

---

# 65. 正式施工 DAG

下面是推荐施工顺序。

---

## DEV-000
### Repository Foundation

建立：

```text
Monorepo
pnpm
TypeScript
Lint
Formatter
Vitest
CI
Shared Types
```

验收：

> 所有 package 可以统一 build/test/typecheck。

---

## DEV-001
### Chapter Schema

实现：

```text
Scene
Interaction
Choice
Action
Result
Rule
World State
Narrative
Asset
Audio
```

所有 JSON Schema / Zod Schema。

---

## DEV-002
### Chapter Compiler Core

实现：

```text
Schema validation
Reference validation
Graph validation
Coverage
```

依赖：

DEV-001。

---

## DEV-003
### Story Graph Analyzer

实现：

```text
Reachability
Dead ends
Cycles
Boss reachability
Ending reachability
```

---

## DEV-004
### State Rule Engine

实现：

```text
Condition
Guard
Effect
Flag mutation
```

---

## DEV-005
### Dice Engine

实现：

```text
Seeded PRNG
Dice
Modifiers
Replay
```

---

## DEV-006
### Action Resolution Engine

实现：

```text
participant scale
dice quality
result lookup
world effects
player effects
```

---

## DEV-007
### Chapter Simulator

可以脱离 UI：

```text
load chapter
random choices
resolve
transition
repeat
```

目标：

> 100,000局自动仿真。

---

## DEV-008
### Runtime Event Model

实现统一 Runtime Event。

---

## DEV-009
### XState Runtime Kernel

建立根：

```text
STORY
PRESENTATION
INTERACTION
AUDIO
HOST
PLATFORM
SAFETY
```

---

## DEV-010
### Persistence

实现：

```text
SQLite
Event Store
Snapshot Store
LKG
```

---

## DEV-011
### Deterministic Replay

输入 Event Log：

> 重建 Runtime。

---

## DEV-012
### Runtime API

给 Renderer / Operator / Platform 提供内部接口。

---

# 第二施工组：演出

## DEV-020
### Renderer Shell

React + WebSocket。

---

## DEV-021
### Scene Renderer

背景 / 前景 / Layers。

---

## DEV-022
### Character Renderer

角色：

```text
position
expression
visibility
micro-animation
```

---

## DEV-023
### Subtitle / Dialogue

---

## DEV-024
### Choice UI

---

## DEV-025
### Dice UI

必须实现：

```text
INTRO
LOOP
RESOLVE
```

---

## DEV-026
### Camera / Transition

---

## DEV-027
### BGM / SFX

---

## DEV-028
### Presentation Command Bus

Runtime → Renderer。

---

# 第三施工组：音频

## DEV-030
### Audio Manifest

---

## DEV-031
### Master Audio Player

---

## DEV-032
### Audio State Region

---

## DEV-033
### Narrative Composer

不含 LLM。

---

## DEV-034
### TTS Provider Interface

---

## DEV-035
### Result TTS

完整文本 → Streaming TTS。

---

## DEV-036
### Audio Cache

---

## DEV-037
### Dice Buffer Controller

把：

```text
TTS ready
```

接入：

```text
DICE_LOOP → RESOLVE
```

---

## DEV-038
### Audio Ducking

Story 开始：

> Host 自动压低/停止。

---

# 第四施工组：Twitch

## DEV-040
### Twitch OAuth

---

## DEV-041
### EventSub Client

---

## DEV-042
### Chat Message Adapter

---

## DEV-043
### Message Deduplication

必须做。

因为 EventSub 官方明确是至少一次投递。

---

## DEV-044
### Interaction Aggregator

A/B/C/D。

---

## DEV-045
### Twitch Reconnect

---

## DEV-046
### Twitch Send Chat

---

# 第五施工组：AI Host

## DEV-050
### Public State Gateway

这是安全边界。

---

## DEV-051
### Comment Pipeline

---

## DEV-052
### Host Persona

---

## DEV-053
### Host Mood

---

## DEV-054
### Viewer Memory

---

## DEV-055
### Host Scheduler

---

## DEV-056
### Host LLM Provider

只需一个可替换 Provider API。

---

## DEV-057
### Host TTS

---

## DEV-058
### Host Avatar

可以借鉴 AITuber OnAir 的 PNG / Live2D / voice integration 思路，不需要重新设计整个 AI VTuber 框架。

---

# 第六施工组：运维

## DEV-060
### Operator Console

---

## DEV-061
### Health System

---

## DEV-062
### Error Registry

---

## DEV-063
### Watchdog

---

## DEV-064
### OBS Control

---

## DEV-065
### OBS Failover

---

## DEV-066
### Crash Recovery

---

## DEV-067
### Emergency Stop

---

# 第七施工组：内容生产工具

## DEV-070
### Chapter Authoring Schema Prompt

让 Sol/F5 按 Schema 写。

---

## DEV-071
### AI Chapter Generator

---

## DEV-072
### AI Compiler Repair Loop

```text
Compile
↓
Errors
↓
AI Repair
↓
Compile
```

---

## DEV-073
### Asset Requirement Generator

从 Chapter 自动导出：

```text
需要哪些插画
需要哪些表情
需要哪些序列帧
需要哪些BGM
需要哪些声音
```

---

## DEV-074
### Audio Production Queue

---

## DEV-075
### Chapter Packager

---

# 第八施工组：平台扩展

## DEV-080
YouTube Adapter

## DEV-081
Bilibili Adapter

## DEV-082
Interaction Gateway

## DEV-083
Twitch Extension

---

# 66. 施工依赖关系

核心 DAG：

```text
DEV-000
   ↓
DEV-001
   ↓
DEV-002 ─→ DEV-003
   │
   ├──→ DEV-004
   ├──→ DEV-005
   └──→ DEV-006
              ↓
           DEV-007
              ↓
DEV-008 → DEV-009 → DEV-010 → DEV-011
              │
      ┌───────┴────────┐
      ↓                ↓
   DEV-020           DEV-030
      │                │
      ↓                ↓
 Renderer            Audio
      │                │
      └───────┬────────┘
              ↓
           DEV-040
              ↓
           Twitch
              ↓
           DEV-050
              ↓
           AI Host
              ↓
           DEV-060
              ↓
          Operations
              ↓
           DEV-070
              ↓
        Content Factory
```

---

# 67. 一个人 + AI 的开发并行策略

不要按照：

> 001做完以后人肉等002。

可以在 Schema 冻结后并行：

### Worker A
Compiler。

### Worker B
Rule Engine。

### Worker C
Runtime Event / Persistence。

### Worker D
Renderer。

### Worker E
Audio。

但每个 Worker：

只能按照已冻结 Interface 开发。

---

# 68. Milestone 不是 MVP

## M1 — Story Machine Complete

包含：

```text
Chapter
Compiler
Rules
Dice
State
Simulator
Replay
```

这是最终核心。

---

## M2 — Presentation Complete

完整动态绘本播放器。

---

## M3 — Audio Complete

正式音频系统。

---

## M4 — Twitch Complete

真实直播间控制。

---

## M5 — AI Host Complete

完整助播。

---

## M6 — Operations Complete

无人值守基础设施。

---

## M7 — Content Factory Complete

AI Chapter 生产工具。

---

## M8 — Chapter 01 Production Ready

第一件完整内容产品。

---

# 69. 最终上线 Gate

只有全部通过才能正式公开运行：

### G01
Chapter Compiler PASS。

### G02
100,000 次 Simulation PASS。

### G03
Replay 100% deterministic。

### G04
Twitch reconnect PASS。

### G05
Event duplicate 0 次重复计票。

### G06
Host Hidden Information Leak = 0。

### G07
AI Host failure 不影响 Story。

### G08
TTS failure 不影响 Story。

### G09
Runtime Crash 可以恢复。

### G10
Renderer Crash 可以恢复。

### G11
OBS Failover PASS。

### G12
24h Soak PASS。

### G13
72h Soak PASS。

### G14
168h Soak PASS。

---

# 70. 明确禁止重新引入

开发过程中如果 AI Agent 建议以下技术：

默认拒绝：

```text
Vector DB
RAG
Multi-Agent Runtime
Realtime story LLM
Unity
Unreal
3D World
Microservices
Redis
Kafka
Kubernetes
Realtime AI image generation
LLM rule adjudication
LLM dice
LLM state transition
```

除非出现明确无法由当前架构解决的真实需求。

---

# 71. 最终系统真正的核心代码

整个项目长期真正有价值的技术资产只有：

### Chapter Schema

定义什么叫“一本机器能运行的互动书”。

### Chapter Compiler

保证书一定能运行。

### Rule Engine

把集体选择变成世界结果。

### Runtime Statechart

自动主持整本书。

### Narrative Composer

把有限事件组合成自然叙事。

### Story Host Gateway

让 AI 助播生活在这个世界旁边，但永远碰不到世界真相。

---

# 72. 最终工程定义

整个 Runtime 不是：

> AI 在现场直播一场故事。

而是：

> **AI 在制作阶段创造一台故事机器；直播时，这台机器自己运行。**

AI Host 是这台机器旁边唯一真正实时存在的 AI。

因此：

> **故事不会因为模型犯傻而崩。**

> **助播不会因为知道未来而剧透。**

> **观众每次选择都有真实作用。**

> **同一个章节可以无限次运行。**

> **每一次运行又可以因为观众、骰子和状态不同而拥有自己的经历。**

这就是最终工程形态。