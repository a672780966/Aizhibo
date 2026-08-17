# DEV-003 DECISIONS

本文件记录 DEV-003 施工中做出的设计决策（Task Package 第 4 节 Optional 技能的落地裁量）。

## D1 — 陷阱环判定：SCC 必须真实内含一条环，纯死路不重复上报

Task Package T004 字面规则是"出边全部指向 SCC 内部 + 非单个 ENDING"。若逐字执行，一个
**零出边的可达死路节点**（单节点 SCC，无任何边）会因"出边全部指向内部"的 vacuous true 被
同时判为陷阱环——而它已经被 T003 作为 `deadEnd` 上报。为避免同一缺陷双重上报、并保持
"Infinite loop detection"的字面语义（没有环就不算陷阱环），实现上增加一条非空判定：

- SCC 大小 ≥ 2：成员两两可达，自动构成环，只看是否全部出边留在 SCC 内；
- SCC 大小 = 1：仅当节点有**自环边**（edge 指向自身）且无其它出边时才判为陷阱；零出边节点
  不判为陷阱（归属 T003 死路）。

这满足 A11/A12 的全部测试点（互指环检出、含逃逸边不误判、单节点自环判陷阱、ENDING 不误
判），且 A10 的死路 isolation 不被环检测污染。若 Commander 认为应严格按字面（含零出边死路
也报陷阱），属 Acceptance 语义变更，需 SCOPE_RULING 明确。

## D2 — PASS5 值集合的 ANY_VALUE 哨兵约定

T005 要求 `ReachableStateModel.keys: Map<string, Set<string | number | boolean>>`（固定形状）。
INC/DEC/PUSH/REMOVE 效果"只登记键存在，不推算具体数值"。若未知值表示为"空集合"，则 EQ/IN
判定（"目标值必须在集合中"）会**误杀**任何只被 INC 触碰过的键——违反第 2 节"宁可放行"的总
前提。因此：

- 未知值键的值集合只含哨兵 `ANY_VALUE`（`'\u0000*any*'`，pass5ReachableState.ts 导出并文档化）；
- 满足性判定对含 ANY_VALUE 的集合视为"该键可能取任何值"，EQ/IN 一律放行；
- 种子（initial.state.json）与 SET 效果登记**具体值**（初始值/确定赋值是事实，可精确登记）；
- 下游 DEV-002A 消费该模型时按同一约定解释 ANY_VALUE。

## D3 — `not` 的判定：字面执行 T006 #2

T006 #2 原文："对 `not` 保守放行，除非其内部引用的 path 完全不存在于 `model.keys`"。
实现按其**字面**执行：`not(X)` 默认可满足；当且仅当 X 内部引用的全部 path（递归收集）都
不在模型键集合中，才判不可满足。语义：一个只引用"任何可达状态下都不可能存在的键"的条件
是定义性缺陷，值得上报；其余情况一律放行。

## D4 — Recovery scope 覆盖 DOWNED 的集合

A13 要求"至少一条规则 scope 覆盖 DOWNED"。覆盖集合取保守方向：`ALL_DOWNED`/`ALL_VIEWERS`
显然覆盖；`THIS_ACTION_GROUP`/`OTHER_ACTION_GROUPS` 的组内观众可能包含 DOWNED，为不误杀内容
一并视为覆盖；`ALL_ACTIVE`（明确只指活跃观众）与 `ALL_SPECTATORS`（终态，非 DOWNED）不覆盖。
`RESULT_QUALITY` 触发器只要求 action 可达即为"可能触发"，不校验 minQuality 是否实际可达
（可达质量枚举属 PASS 4 / DEV-006）。

## D5 — checkRecoverySatisfiability 内部重算可达集

T006 #1 固定签名 `checkRecoverySatisfiability(schemaResult, model)`，没有 reachable 参数，
但 #3 要求 SCENE_ENTER/RESULT_QUALITY 分支以"节点/action 本身可达"判定。实现内部通过
`buildStoryGraphModel` + `computeReachability`（manifest.entryNodeId）+ reachable 交互的
choice 链重算可达集合——输入相同，结果与 PASS3 必然一致，无需外部注入。

## D6 — Boss variables 落到 `chapterVariables.<key>`

ADDENDUM §A11：BossNode.variables "注入 chapterVariables"。故可达 Boss 的变量登记在
`chapterVariables.<key>` 命名空间，而不是独立命名空间。

## D7 — compile() 的 `passed` 行是 DEV-003 内容，单行编辑

A08 要求四文件既有行只增不改；T007 #3 又要求 `passed` 判定**追加** `graphIssues`/`stateIssues`
条件。两条件对本行无法同时满足——`const passed = ...` 是单行表达式，追加条件即修改该行。
裁定：该行属于"涉及 DEV-003 新增内容"的行（T007 #3 明文规定其形态），允许且仅允许这一行
的极小编辑（追加两个 `&&` 条件），其余全部为纯插入；实现与 diff 见 REPORT Changed Files。

## D8 — fixture 复制起点与多文件编辑的说明

按消息 `0036` 修订 3：8 组 fixture 全部复制自 `valid-minimal`（graph-trap-cycle 为最小化
重建，因其不需要 interaction/action 链，避免拷贝与删除产生噪音）。多数 fixture 需要**两处**
编辑（如 `interaction-01.nextScene → boss-tyrant`），原因：valid-minimal 原图把 Boss 设计成
不可达（见 BLK-003），若不做此编辑，几乎所有 fixture 会同时携带"不可达 Boss"这一第二缺陷，
破坏 A10/T008 的隔离性验收。这是"单点编辑制造目标缺陷"原则的必要变体，已在 REPORT 注明。

## D9 — SCOPE_RULING 0038 授权修复 valid-minimal 的图设计缺陷

PASS3 接入后暴露：`valid-minimal` 的 `boss-tyrant` 在入口可达集合之外——这是**先于 DEV-003
存在**的 fixture 图设计缺陷（唯一入边是 Boss 相位交互 `interaction-boss.nextScene` 的自回边；
`scene-start` 全部出边指向 `ending-end`），只是 PASS1/PASS2 不做可达性分析，DEV-002 未曾
检出。PASS3 如实报告 `UNREACHABLE_BOSS` 是新增能力的正确行为，不是回归。

经 `SCOPE_RULING`（消息 `0038`）授权，解除 `valid-minimal/scenes/scene-start.json` 的单文件
只读限制，在 `guards` 追加一条 `scene-start → boss-tyrant` 边（`when {flags.bossStart EXISTS}`，
`priority: 2`，不影响既有 `guards[0]`/`next` 的确定性顺序）。效果：入口可达集合扩为
{scene-start, boss-tyrant, ending-end}，`compile('valid-minimal').passed` 恢复 `true`，
DEV-002 既有断言字面不变、零回归（六条命令全绿，219/219）。