# DEV-055 DECISIONS

本文件记录 DEV-055（Host Scheduler）实现中的关键决策与理由。Task
Package 第 6 节要求的要点逐一覆盖（D1–D4）。

## D1 — 为何只实现 "Story Audio > Host Audio" 一条规则

**决策**：`decideHostScheduling` 只实现 Dev Spec 第 41 节唯一有明确、
无歧义定义的调度规则——`audioChannelBusy === true` 时返回
`{ canSpeak: false, reason: 'audioChannelBusy' }`（正式故事音频播放时
Host 音频必须让路）；否则返回 `{ canSpeak: true, reason: 'clear' }`。
其余五个因子完全不参与判定逻辑。

**理由**：
- Dev Spec 第 41 节（第 1652–1673 行）把六个因子并列列为"调度策略
  需要考虑"的输入，但**只有** Audio Channel Busy 被紧随其后的
  "核心：Story Audio > Host Audio——任何正式故事声音拥有抢占优先权"
  段落赋予了明确、无歧义的强规则（真/假 → 禁/放行，方向与判定都完整）。
- 其余五个因子（Chat Velocity/Last Host Speech Time/Selected Comment
  Importance/Conversation Continuity/Current Story Phase）在 Dev Spec
  中只有"需要考虑"的列举，没有任何阈值、方向或组合公式。
- USER 已于 2026-09-07 就此现实核对给出裁决：**只实现明确规则，不
  发明其余算法**。施工方不发明 Dev Spec 未定义的内容是本仓库既有
  取舍先例（DEV-050/051："Dev Spec 未定义就不发明"；DEV-052/053/054
  同构节点的同样处理）。

## D2 — 为何其余五个因子只保留类型签名，不实现组合逻辑（逐一说明）

**决策**：`HostSchedulingFactors` 接口完整保留六个字段，但
`decideHostScheduling` 函数体只读取 `audioChannelBusy`。其余五个因子
的存在意义是：为未来节点/产品决策定义具体组合算法时保留统一的输入
接口，本节点不发明任何阈值/方向/权重。

**逐一说明每个因子的歧义**：

- **`chatVelocity`（聊天速度）——方向未定义**：聊天越快，是越说明
  直播间热闹、Host 该多说（趁热打铁），还是越说明弹幕在自发生成
  内容、Host 该少插嘴让聊天继续？Dev Spec 只列了因子，没给方向。
  任何"越快越说"或"越快越沉默"的实现都是一种发明。
- **`lastHostSpeechTimeMs`（上次 Host 说话时间）——冷却时长未定义**：
  该因子暗示存在某种"别说得太密"的冷却机制（上次说话越近越该
  克制），但冷却窗口多长、与其它因子如何叠加，Dev Spec 全无定义。
- **`selectedCommentImportance`（被选中评论的重要性）——门槛值未
  定义**：该因子暗示存在"评论足够重要才值得 Host 回应"的重要性门槛
  （Task Package 给出 DEV-051 `SelectedComment.clusterSize` 作为现实
  取值来源参照），但门槛值、如何随语境浮动，Dev Spec 未定义。
- **`conversationContinuity`（对话连续性）——具体逻辑未定义**：该
  因子暗示"正处于连续对话中"应影响 Host 的介入节奏（可能倾向少打断、
  继续接话），但影响方向与强度 Dev Spec 未定义。
- **`currentStoryPhase`（当前故事阶段）——阶段差异未定义**：该因子
  暗示不同故事阶段（铺垫/高潮/收尾等）应有不同的 Host 介入策略
  （比如高潮段更该让故事音频独白），但具体差异 Dev Spec 未定义。

**推论**：以上五个因子全部存在方向/阈值/公式歧义，任一实现都会是
施工方对产品策略的发明。故只保留类型位置 + JSDoc 注释说明"调用方
计算好传入、本节点不解释具体取值"，与 DEV-051 以来"Dev Spec 未定义
就不发明"的取舍一致。

## D3 — 为何不读取真实 runtime-kernel 状态

**决策**：本文件不 import `runtime-kernel`/`platform-core`/
`egressGate.ts`/`commentPipeline.ts`/`hostPersona.ts`/`hostMood.ts`
任何东西，不调用 `getPublicState()`，不读取 `audioRegion` 状态机或
任何真实 Audio Channel/Story Phase 状态；`HostSchedulingFactors` 的
全部字段由调用方（未来某个尚未建造的 Runtime 组合层）计算好后传入。

**理由**：
- 本节点产出的是"调度策略这个决策函数本身"（纯函数、无状态、无
  副作用），不是"接入真实运行时状态"的接线层——后者需要真实
  runtime-kernel 状态源存在且接口稳定，属于未来节点的职责。
- 调用方注入模式让函数可被纯测试完整覆盖（本节点 6 条测试穷举
  busy/clear × 其余因子任意组合 × 可选字段缺省），不依赖任何 IO/
  时序/全局状态。
- 该边界与 `ai-host` 现有四个模块（`egressGate`/`commentPipeline`/
  `hostPersona`/`hostMood`，除 `commentPipeline` 依赖 `platform-core`
  的类型外）均不依赖 `runtime-kernel`/`platform-core` 运行时行为的
  既有边界完全一致。

## D4 — 测试为何刻意构造"反直觉"因子组合

**决策**：测试不满足于单字段穷举，专门构造两类反直觉组合：
(a) `audioChannelBusy=true` 但其余因子全是"看起来 Host 该说话"的取值
（高 `chatVelocity`、高 `selectedCommentImportance`、高潮 `storyPhase`、
连续对话中）；(b) `audioChannelBusy=false` 但其余因子全是"看起来 Host
不该说话"的取值（`lastHostSpeechTimeMs` 是 1ms 前、`chatVelocity=0`
冷场、`silence` 阶段、非连续对话）。

**理由**：这两类组合在"某因子实际参与判定"的错误实现下必然产生不同
结果——它们直证其余五个因子确实不参与判定，而不是恰好取到不触发
差异的数值（同 DEV-052 A09/A10 与 DEV-054 FIX 系列"消除恒真断言"
的断言质量要求一脉相承）。
