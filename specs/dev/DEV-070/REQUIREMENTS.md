# DEV-070 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-070.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- 新建 `packages/chapter-authoring-prompts`：`chapterAuthoringSchemaPrompt.ts`
  导出 `CHAPTER_AUTHORING_SCHEMA_PROMPT` 字符串常量，内容为 Task
  Package 第 2.1 节给出的十一阶段 Markdown prompt 全文，**逐字
  照抄，不得改写**。
- 覆盖 `chapter-schema` 全部 19 个 schema 组件（DEV-001 冻结）的
  字段级指导：manifest/storyGraph/initialState/worldRules/
  hostPublic/scenes/interactions/actions/dice/results/
  state-rules/narrative.result/narrative.block/npc/recovery/
  boss/endings/visuals/audio/metadata。
- **零依赖**：不 import `chapter-schema` 或任何其他既有包（本
  节点只产出自然语言文本，不做程序化校验）。
- 测试只做机械关键字覆盖检查（字符串 `includes`），不判断写作
  质量。

## Scope（Task Package 第 3 节）

Writable：见 `INDEX.md` Allowed Scope 逐条。

Forbidden（摘录）：不改除本节点外任何既有文件；不 import
`chapter-schema`；不真实调用 AI/LLM API；不实现 Compiler/AI
Repair Loop 逻辑；不改写 prompt 正文；不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `chapterAuthoringSchemaPrompt.ts` + 测试 +
包骨架 + 根 `tsconfig.json` 引用 + 全量验证 + REPORT + commit
（**恰一条提交，LEDGER/NODE_REPORT 写入工作区但不提交，工作区
不得残留任何施工用临时文件**）。
