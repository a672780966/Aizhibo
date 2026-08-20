# DEV-033 DECISIONS

本节点的解释性设计决策（Task Package §9 的 6 条 + 若干实现细节）。本文件随最终提交入库（DEV-004
教训：REPORT 引用但未提交证据链断裂）。

## D1 — 零语言模型，纯数据驱动拼接（§9 #1）

本节点不引入任何 LLM SDK、Prompt、文本生成逻辑。`composeSingleNarrative` 是"从
`blocksById` 查表、按 `when` 条件过滤、按固定槽位顺序连接"，`categorizeFocus` 是"按
`focus.priority/category/urgency` 排序分组"，`composeResultSetNarration` 是两者的组合。全部
确定性、可复现——同一输入永远同一输出。规范第 13 节明文"不使用语言模型"。

## D2 — 不做 tone 匹配（§9 #2）

已核实 `SceneNode` 没有 `tone` 字段（`packages/chapter-schema/src/scene.ts`）。`NarrativeBlock.tone`
目前只是创作期的一致性提示，**没有运行时可比对的场景基调**，因此本节点不实现任何基于 `tone` 的
筛选/匹配逻辑。记录于 REQUIREMENTS §10 Non-goals 与 DECISIONS——这是核实的事实，不是猜测。

## D3 — PRIMARY/SUPPORT/CONTEXT/DEFERRED 判定规则（§9 #3，Task §7 T004）

按 Task Package T004 #2–6 严格实现，不自行发明替代算法（例如不因"觉得 urgent 该优先"就改变
判定顺序）。规则：

1. `narratives.length === 0` → 抛描述性错误（见 D6）。
2. PRIMARY = `focus.priority` 最高者；并列取数组中**靠前**一条（确定性 tie-break，无随机/复杂规则）。
3. SUPPORT = 除 PRIMARY 外，`focus.category` 与 PRIMARY 相同者。
4. CONTEXT = 除 PRIMARY/SUPPORT 外，`focus.urgency !== "NONE"` 者（不同类别但紧急，简短提及）。
5. DEFERRED = 其余全部（不同类别且不紧急），这一轮不念，只标出 id（"以后怎么补"是调用方职责，
   本节点不管）。

实现用 `reduce` 以严格 `>` 比较（相等时保留靠前元素），配合 `filter` 依次求出 SUPPORT/CONTEXT/
DEFERRED，四组两两不相交、都不含 PRIMARY。

## D4 — SUPPORT/CONTEXT 只取 primary 槽位（§9 #4）

SUPPORT/CONTEXT 每条只取 `primaryBlockId` 对应块的 `text` 作为简短提及，不做五槽位全展开。理由：
一轮结算可能有多条叙事同时产生，完整展开每一条会让旁白过长、拖慢节奏；只取核心句子足够传达
"这件事也发生了"。查不到/条件不满足则该条跳过（不报错），不进入最终文本。

## D5 — 文本连接统一用单空格（§9 #5）

`composeSingleNarrative` 内部、以及 `composeResultSetNarration` 的三段（PRIMARY 完整 +
SUPPORT 简短 + CONTEXT 简短）之间，统一用**单个空格**连接，不引入任何标点/分句逻辑。理由：这是
最简单、最不会引入意外拼接问题的方式；空段在 join 前被 `filter(part => part !== '')` 剔除，避免
出现双空格或前导/尾随空格。（分句/润色属 DEV-033 之后、M3 的职责，或未来 CHANGE_REQUEST。）

## D6 — `categorizeFocus` 对空数组抛异常：本节点唯一例外（§9 #6）

除 `categorizeFocus([])` 外，本节点所有函数对"查不到/条件不满足"一律防御性跳过、不抛异常（T003 #3、
T005 #4）。唯独空数组输入**抛出一个描述性错误**，理由：

- 这是**调用契约违反**，不是"数据内容有缺陷"——一轮结算至少要有一条叙事（`categorizeFocus` 是
  `composeResultSetNarration` 内部必经步骤，而后者被调用时必有一条 PRIMARY）。调用方负责保证
  `narratives.length >= 1`。
- 与本节点其它路径的差异在于：防御性跳过是针对"内容里某个引用坏了"的策略，而空数组意味着调用方
  根本没在进行一次合法的结算；静默返回 `{primary: undefined, ...}` 会让下游拿到不可用的 PRIMARY，
  把错误的根源藏起来，反而更危险。
- 因此这是本节点唯一允许抛异常的地方，且消息为描述性（`categorizeFocus requires at least one
  ResultNarrative`）。

## D7 — 单条叙事防御性处理 primary 缺失（Task §7 T003 #5）

`primaryBlockId` 是 `ResultNarrative` 的必填字段，但其对应块可能在 `blocksById` 中缺失、或其
`when` 条件不满足。此时**整体仍返回其它已拼好的块**，不因 primary 缺失就整段返回空字符串——防御性
优先于"看起来更正确"的严格失败。理由：旁白是给观众听的，主句暂时咽不下去也比整段沉默好；且 PASS2
理论上应已保证引用存在，运行期缺失是异常兜底而非常态。
