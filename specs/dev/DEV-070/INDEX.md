# DEV-070 INDEX

Status: IN_PROGRESS

## Current Node

DEV-070 — Chapter Authoring Schema Prompt

## Objective

新建 `packages/chapter-authoring-prompts`：导出
`CHAPTER_AUTHORING_SCHEMA_PROMPT` 字符串常量——一段指导 AI 模型
（GPT-5.6 Sol / Fable 5）按 `chapter-schema`（DEV-001 冻结）逐
模块写作 Chapter 内容的十一阶段 prompt。本节点交付物类型与
M1–M6 全部节点不同（prompt 文本，非确定性类型/决策代码）；测试
只做机械关键字覆盖检查，不判断写作质量。不真实调用任何 AI API
（DEV-071 职责），不实现 Schema Normalizer/Compiler（既有
DEV-002）/AI Repair Loop（未来 DEV-072）逻辑。

## Allowed Scope

```
packages/chapter-authoring-prompts/package.json            （新增）
packages/chapter-authoring-prompts/tsconfig.json            （新增）
packages/chapter-authoring-prompts/src/index.ts             （新增）
packages/chapter-authoring-prompts/src/chapterAuthoringSchemaPrompt.ts       （新增）
packages/chapter-authoring-prompts/src/chapterAuthoringSchemaPrompt.test.ts  （新增）
tsconfig.json                                               （根，追加一条 references 条目）
specs/dev/DEV-070/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/chapter-schema/src/*.ts（Read-only，撰写 prompt 时的事实核对来源，不 import、不修改）
```

## Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖 packages/chapter-schema 或任何其他既有包
真实调用任何 AI/LLM API
实现任何 Schema Normalizer/Compiler 逻辑
实现任何 AI Repair Loop 逻辑
改写 Task Package 第 2.1 节给出的 prompt 正文内容（必须逐字照抄）
新增第三方 npm 依赖
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 chapterAuthoringSchemaPrompt.ts + 测试 + 包骨架 + 根 tsconfig 引用 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**；工作区不得残留任何
施工用临时文件。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
