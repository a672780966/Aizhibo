# DEV-053 DECISIONS

本文件记录 DEV-053（Host Mood）实现中的关键决策与理由。Task
Package 第 6 节要求的四个要点逐一覆盖（D1–D4）。

## D1 — 为何 `label` 用自由文本字符串，不用封闭枚举

**决策**：`HostMood.label` 类型为自由文本 `string`，不用封闭枚举/
联合类型（如 `'happy' | 'bored' | 'excited' | ...`）。

**理由**：
- Dev Spec 对 Host Mood 的规范极度稀薄：第 37 节只把 Host Mood 列为
  Host Context 八项输入之一，第 2681 行只有一个标题 "Host Mood"，全篇
  从未定义过合法的情绪分类取值集合——没有"开心/无聊/兴奋"这类枚举，
  没有数值范围，没有"什么事件让 Mood 如何变化"的触发规则。
- 发明一个封闭枚举等于发明一套规则：枚举的每个取值都是一种"情绪
  分类学"的创作决策，且一旦入库（interface 冻结、测试锁定）就会变成
  对 Dev Spec 未定义内容的规范性约束，未来想引入新情绪只能走破坏性
  变更。
- 这与 DEV-052 的 `voiceDescription` 用自由文本而非固定短语列表是
  同一取舍精神：Dev Spec 未定义的取值空间一律不封闭，只保证"有值、
  可读、可写"，具体内容由规范的拥有者（未来定义 Mood 语义的节点或
  USER 配置）填充。

## D2 — 为何默认值是中性占位 `'neutral'`

**决策**：不传 `initial` 时，`createHostMoodStore()` 默认持有
`{ label: 'neutral' }`。

**理由**：
- 需要一个默认值使类型契约成立（`getMood()` 永远有值可返回），但
  具体默认成哪种情绪（开心？无聊？兴奋？）是创作/产品决策——Dev Spec
  未定义，本节点不发明。
- `'neutral'` 是情绪空间里的中性点：不携带任何积极/消极/高低唤醒度
  的预设立场，不会在真实的情绪触发逻辑（Host Scheduler DEV-055 未来
  的职责）上线前误导任何消费方。
- 与 DEV-052 的 `name: "Host"` 占位取舍同精神：占位值只求功能成立
  与语义中立，真实内容留给未来定义 Mood 语义的节点。
- 注意 `'neutral'` 本身也是自由文本（D1），不是枚举的一个成员——它
  只是默认值，调用方永远可以用任意 `HostMood` 覆盖（A08 直证）。

## D3 — 为何不做任何自动推导逻辑，不读取 danger/tension/Public State 等信号

**决策**：本文件只有 `getMood`/`setMood` 两个方法，`setMood` 完全由
调用方决定何时调用、传什么值；不读取 `danger.level`/
`danger.tensionKey`/Public State/Selected Comment 等任何运行时信号，
不做"信号 → Mood"的任何映射算法，不 import `runtime-kernel`/
`platform-core` 等任何含这些信号的模块。

**理由**：
- Dev Spec 第 37 节只把 Host Mood 列为 Host Context **八项输入之一**，
  没有定义任何推导规则；DangerState（SPEC-ADDENDUM-002）与 Host
  Permission 是**已有的、别的节点负责计算**的运行时信号，但 Dev Spec
  没有任何地方说 Host Mood = 由这些信号自动推导——那只是可能的未来
  设计方向。
- "根据当前直播状态决定 Host 该处于什么情绪"是**调度决策**，属于
  Host Scheduler（DEV-055）的职责范围（它读取 Public State/Danger/
  Selected Comment 等信号后统一决定喂给 LLM 的 Host Context 各项）；
  本节点抢做推导既越界（发明 Dev Spec 未定义的规则，违反 D1 同一
  取舍），又会造成对尚不存在的下游节点语义的前向猜测。
- 保持零依赖的纯存储原语，也让 A06 的回归面最小：新增独立文件不触碰
  任何既有代码路径，行为完全由调用方驱动、可测试（A07–A11 直证）。

## D4 — 为何设计成可变的 `createHostMoodStore()` 工厂，而不是像 DEV-052 Host Persona 那样的不可变静态单例

**决策**：Mood 用每次调用返回独立实例的**可变**存储工厂
（`createHostMoodStore()` → 闭包内 `let current`，`setMood` 整体覆盖）；
不采用 DEV-052 Persona 的模块级不可变静态常量模式。

**理由**：
- 两者在 Dev Spec 中的语义定位有本质差异：
  - **Persona 是"Host 是谁"**（身份数据）：直播全程不变，只读常量即
    可表达，所以 DEV-052 用 `getHostPersona()` 返回唯一静态常量。
  - **Mood 是"Host 当前状态"**（瞬时状态数据）：Dev Spec 给 Host 的
    职责包括"缓解冷场"等，暗示 Host 的状态会随直播过程被更新——
    "什么时候该变成什么"虽然留给未来节点，但"可被更新"是 Mood 的
    内在性质，与 Persona 的不可变性恰恰相反。
- 可变状态需要存储原语：`getMood`（读）与 `setMood`（写）成对出现，
  未来的 Host Scheduler（DEV-055）将在直播循环里调用 `setMood` 推进
  状态；若照搬 Persona 的静态常量模式，Mood 就退化为"又一个只读
  常量"，丢失其状态语义，DEV-055 将无从写入。
- 工厂而非模块级单例，是因为 Mood 是**每场直播实例的状态**（与
  Persona 的"全系统唯一身份"不同）：工厂每次返回独立闭包，多个
  消费者/多场直播各持其状态互不干扰（A11 直证），且便于测试
  （每用例新建干净实例，无模块级脏状态跨用例泄漏）。
