# DEV-062 DECISIONS

本文件记录 DEV-062（Error Registry，M6 第三个节点）施工中做出并落
库的决策。Task Package 第 6 节与 Dispatch 要求覆盖四个"为何"要点，
逐条以真实理由说明如下。

## D1 — 为何 `category` 是自由文本 string，而不是封闭枚举；为何不做 category→level 推断

Dev Spec 第 56 节（故障等级）是 DEV-062 唯一权威范围来源——第 62
节本身零正文、DAG.md 备注为空。第 56 节在每一级下列举错误类别时
用的措辞是冒号加若干示例（"L1 非关键：Host LLM error / Host TTS
error / Viewer memory error"、"L2 演出降级：Story TTS unavailable /
Visual minor asset missing"……），这是**举例**的写法，不是"仅限于
以下"的穷尽清单：规范没有给出任何"错误类别全集"的定义，也没有
说明这份清单依据什么原则封闭。

如果把 `category` 做成 `'Host LLM error' | 'Host TTS error' | ...`
这样的封闭字面量联合，就等于把规范里那十几个示例**硬编码成唯一
合法取值**。而 M6 后续模块（Watchdog DEV-063、Failover
DEV-065/066/067 以及未来真实装配节点）随时可能产生一个今天清单里
没列出的新错误类别——届时类型系统会立刻过时，要么把新类别强塞进
封闭联合（改类型即改契约），要么让调用方被迫复用语义相近的错误类
别名（丢信息）。这与 DEV-053 对 `HostMood.label` 的既有裁定完全同
构：Dev Spec 未定义封闭取值集合时，自由文本是唯一不会在第一个新
取值出现时就过期的表示。

`level` 则相反：`L1`–`L4` 是第 56 节**明确给出**的封闭四值集合，
做成字面量联合是抄录规范原文，不是发明。同样地，本节点不做任何
"category→level 自动推断"映射：一份错误该归哪一级，依赖的是当时
的语境与调用方的判断（同一个错误类别在不同运行阶段可能对应不同
处置），第 56 节也从未定义推断规则。把示例清单固化成一张推断表，
等于把调用方的判断权抢走并写死进本包——同 DEV-055"只实现明确规
则、不发明未定义组合逻辑"的精神一致。记录方（本节点）如实保存
调用方给出的 `level`，分类判断留给未来集成节点。

## D2 — 为何只记录（record/list），不实现第 56 节任何一级的"处理"方针

第 56 节每级后面都有一句处理方针：L1 忽略、L2 Subtitle/固定音频/
fallback asset 降级、L3 自动恢复、L4 Failover Scene + Operator
intervention。逐级核对仓库现状，这些行为**没有一项属于本节点**：

- L1"忽略，故事继续"：这是"什么都不做"——不需要任何代码，硬要
  实现也只是个空分支。
- L2"降级"：Subtitle 展示已由 DEV-023（Subtitle / Dialogue）冻结
  交付；固定音频/fallback asset 属于演出资产侧既有能力的消费方式，
  由未来装配节点决定何时按 L2 错误触发。
- L3"自动恢复"：DEV-063 Watchdog 尚不存在（M6 后续节点），重启/
  恢复的执行主体在它那里。
- L4"Failover + Operator intervention"：涉及 DEV-065/066/067（M6
  后续 Failover 相关节点）与 operator-api 的动作组合，全部未开工。

也就是说，第 56 节的处理方针要么已落在既有节点（L2 → DEV-023），
要么属于尚不存在的未来节点（L3 → DEV-063；L4 → DEV-065/066/067）。
在本节点实现任何一条，都是在那些节点存在之前凭空发明其行为细节
——触发条件、降级素材选取、恢复步骤、Operator 通知协议全部无据
可依，写出来只会被未来节点推翻。这与 DEV-061"Health Registry 只
聚合、不驱动"一脉相承：本节点交付"把发生的错误按 L1–L4 记下来、
可以读回"的通用原语，记录本身即全部职责；谁消费记录、按等级做
什么，是未来节点的职责。而"只记录不处理"正是"Error Registry"
这个名字（相对于"Error Handler/Recovery"）所限定的范围。

## D3 — 为何零依赖，连 `@interactive-story/shared` 都不依赖

本包的类型形状（`ErrorLevel`/`ErrorRecordInput`/`ErrorRecord`/
`ErrorRegistry`）全部是**自包含**的：`ErrorLevel` 是第 56 节的字
面量联合，直接写死在本包；`ErrorRecord` 的 `id`/`timestamp` 是字
符串字段。对比 health-registry——它依赖 `shared` 是因为要复用
`Health` 类型（DEV-000 冻结的跨包契约）；error-registry 没有任何
一个字段需要复用其它包的既有类型，没有可 import 的类型，也就不
存在"为类型依赖 shared"的理由。dependency 的唯一合法理由是"用到
了"，不是"也许未来会用"。同理也不新增任何第三方 npm 依赖：本包
是纯内存数组 + 自增计数，无 IO、无网络、无框架需求。零依赖同时
让本包成为 M6 里最容易被未来装配节点引用的原子原语——它不把任何
无关模块拖进依赖图。

## D4 — 为何 `id`/`timestamp` 用闭包内自增计数 + `new Date().toISOString()`，不注入 clock

`packages/operator-api` 的 `operatorOverrideLog.ts` 已有同样写法的
先例：`id: \`op-${nextSequence}\`` + `timestamp:
new Date().toISOString()`，直接取系统时钟，不注入任何 clock 参数。
本节点照抄这一风格：`err-${counter}`（counter 从 1 起严格递增，闭
包私有）保证同一 registry 实例内 id 唯一且可读；`toISOString()`
给出规范 ISO 8601 时间串。

不注入 clock 的理由是本节点的测试**不需要**控制精确时间值：验收
项只要求"timestamp 是合法 ISO 字符串"（`new
Date(x).toISOString() === x` 往返验证）与"三次 record 的 id 两两
不同"——前者验证格式，后者验证计数器，两者都不依赖时间轴上的
具体位置。可注入 clock 是给"需要在固定时刻回放/比对时间"的场景
准备的（如 DEV-037 的假时钟），本节点没有这种需求，预埋它只会增
加一个无人调用、无测试覆盖的构造参数（且 `createErrorRegistry()`
的签名是 Task Package 第 2.1 节逐字规定的零参工厂）。同 DEV-061
D5 的精神：未来若出现需要精确控制时间戳的消费方（如按时间窗口
聚合错误），届时再以 CR 扩展工厂签名，不需要现在预埋。
