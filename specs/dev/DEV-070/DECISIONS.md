# DEV-070 DECISIONS

本文件记录 DEV-070（Chapter Authoring Schema Prompt，M7 第一个节点）施工中的
关键决策。权威需求来源为 `specs/tasks/TASK-PACKAGE-DEV-070.md`。

## D1 — 本节点交付物是 prompt 文本而非确定性代码

M1–M6 每个节点交付确定性类型/决策代码（Zod schema、封闭联合、纯函数三路
switch 等），其正确性可由 TypeScript 类型系统与单元测试机械验证。DEV-070
的交付物是指导 AI 模型（GPT-5.6 Sol / Fable 5，仅用于 Offline Authoring）
按 `chapter-schema` 逐模块写作 Chapter 内容的十一阶段 prompt 文本——prompt
的"正确性"最终由 AI 的写作质量决定，无法用类型系统机械验证。因此本节点
不产出任何程序化 schema 校验逻辑，交付物本身（字符串常量）即全部产出。
这与 `DEV_SPEC_V1.0.md` 第 2758-2761 行"让 Sol/F5 按 Schema 写"及第 25-26
节（AI Draft 是 Compile–Repair Loop 的第一步）的职责边界一致。

## D2 — 零依赖：不 import `chapter-schema` 或任何既有包

prompt 字符串虽逐字段引用 `chapter-schema` 的 19 个组件（manifest /
storyGraph / initialState / worldRules / hostPublic / scenes / interactions /
actions / dice / results / state-rules / narrative.result / narrative.block /
npc / recovery / boss / endings / visuals / audio / metadata），但它是给
**自然语言模型阅读的文本**，不是给 TypeScript 程序消费的结构化引用——代码
层面不存在对 `chapter-schema` 导出符号的依赖。import 任何既有包只会制造
虚假的编译期契约（schema 一冻结便无需在编译期联动），因此
`package.json` **整体省略 `dependencies` 字段**（同 error-registry /
watchdog 的零依赖惯例），源文件零 import。

## D3 — 测试只做机械关键字覆盖，不做语义/写作质量判断

判断"AI 读了这段 prompt 真的会写对"需要真实调用 AI 模型（DEV-071 AI
Chapter Generator）并真实运行 Compiler（DEV-072）才能端到端验证——超出
本节点范围（本节点不真实调用任何 AI API）。可机械验证的只有：
字符串非空、十一个 Stage 标题逐字存在、18 个模块关键字（每个关键字对应
第 2.1 节列出该模块的一个字段名/枚举值，缺一个即证明该模块没被谈到）
全部存在、六个 Quality 取值全部存在、五个角色 slot 取值全部存在。这些
`includes` 断言不判断文字质量、不判断措辞优劣，只证明 prompt 确实逐模块
覆盖了冻结 schema。

## D4 — prompt 正文必须逐字照抄，不允许执行方改写

Commander 已逐一核对 `packages/chapter-schema` 全部 19 个组件的真实 Zod
定义（metadata / worldState / scene / npc / interaction / stateRules /
dice / result / endings / boss / audio / visuals / hostPublic / recovery /
narrative / action / manifest / chapterPack）逐字段撰写第 2.1 节正文。
任何改写/精简/意译/重排都可能引入与冻结 Schema 不一致的错误指导（错字段
名、错枚举值、错必填性），且改写后的文本无法被审计方与 Task Package
逐字比对。因此本节点把第 2.1 节围栏内全文视为唯一权威来源，施工时用
脚本从 Task Package 机械抽取、转义后写入字符串常量，并用独立脚本回读
磁盘文件、反转义后与 Task Package 逐字节比对（12170 字符一致），从流程上
杜绝手抄错漏——而不是靠人工誊写后"相信没抄错"。

## D5 — 测试只断言 `includes` 存在性，不强制 Stage 间相对顺序

18 个关键字/六个 Quality/五个 slot 的断言均为独立 `includes` 检查（缺一
不可）；十一个 Stage 标题用带游标的 `indexOf` 断言，顺带验证标题按
1→11 顺序出现（标题本身含序数，顺序错乱即证明正文被重排）。关键字在
prompt 内出现的具体位置与次数不在断言范围内——那是写作内容问题，交给
DEV-071/DEV-072 端到端验证（见 D3）。
