# DEV-071 INDEX

Status: IN_PROGRESS

## Current Node

DEV-071 — AI Chapter Generator

## Objective

新建 `packages/ai-chapter-generator`：`AiChapterGeneratorPort` 接口 +
`noopAiChapterGeneratorPort` 诚实占位实现（同 `packages/ai-host/src/
hostLLMProvider.ts` 先例——Dev Spec 未给出任何具体 LLM 网络协议，
不建真实客户端），加上一个真实确定性纯函数
`buildChapterAuthoringRequest(brief)`，把 DEV-070 冻结的
`CHAPTER_AUTHORING_SCHEMA_PROMPT` 与调用方提供的 brief 拼接成完整
请求文本。不真实调用任何网络 API，不做 Schema Normalizer/Compiler/
AI Repair Loop。

## Allowed Scope

```
packages/ai-chapter-generator/package.json                        （新增）
packages/ai-chapter-generator/tsconfig.json                        （新增）
packages/ai-chapter-generator/src/index.ts                         （新增）
packages/ai-chapter-generator/src/aiChapterGeneratorPort.ts        （新增）
packages/ai-chapter-generator/src/aiChapterGeneratorPort.test.ts   （新增）
packages/ai-chapter-generator/src/buildChapterAuthoringRequest.ts       （新增）
packages/ai-chapter-generator/src/buildChapterAuthoringRequest.test.ts  （新增）
tsconfig.json                                                      （根，追加一条 references 条目）
pnpm-lock.yaml（自动生成的新增 importer 条目，含对
chapter-authoring-prompts 的 workspace 依赖，见 Task Package 第 3 节）
specs/dev/DEV-071/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/chapter-authoring-prompts/src/chapterAuthoringSchemaPrompt.ts
（Read-only，本节点唯一允许 import 的既有源）
packages/ai-host/src/hostLLMProvider.ts（Read-only，接口+占位设计的
风格先例，不 import）
```

## Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖除 @interactive-story/chapter-authoring-prompts 外的任何其他既有包
真实调用任何 AI/LLM 网络 API
实现任何 Schema Normalizer/Compiler 逻辑
实现任何 AI Repair Loop 逻辑
新增除 @interactive-story/chapter-authoring-prompts 外的任何第三方/workspace 依赖
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 aiChapterGeneratorPort.ts + buildChapterAuthoringRequest.ts + 测试 + 包骨架 + 根 tsconfig 引用 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

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
