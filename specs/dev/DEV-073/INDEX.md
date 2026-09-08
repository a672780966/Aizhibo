# DEV-073 INDEX

Status: IN_PROGRESS

## Current Node

DEV-073 — Asset Requirement Generator

## Objective

新建 `packages/asset-requirement-generator`：真实调用既有
DEV-002 Compiler 的 `loadChapterPack`/`runSchemaValidation`，从
已校验的 Chapter Pack 内容提取五类资产需求（插画/表情/序列帧/
BGM/声音），映射到 `chapter-schema` 真实字段
（`VisualLayer.assetId`/`CharacterAsset.expressions`/
`CharacterAsset.microAnimations`/`AudioAsset.kind`）。不做可达性
过滤，不做"已生产/未生产"比对，不涉及任何 AI/LLM 调用。

## Allowed Scope

```
packages/asset-requirement-generator/package.json                              （新增）
packages/asset-requirement-generator/tsconfig.json                              （新增）
packages/asset-requirement-generator/src/index.ts                               （新增）
packages/asset-requirement-generator/src/assetRequirements.ts                   （新增）
packages/asset-requirement-generator/src/extractAssetRequirements.ts            （新增）
packages/asset-requirement-generator/src/extractAssetRequirements.test.ts       （新增）
packages/asset-requirement-generator/src/generateAssetRequirements.ts           （新增）
packages/asset-requirement-generator/src/generateAssetRequirements.test.ts      （新增）
tsconfig.json                                                                    （根，追加一条 references 条目）
pnpm-lock.yaml（自动生成的新增 importer 条目，含对 chapter-compiler
与 chapter-schema 的 workspace 依赖）
specs/dev/DEV-073/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/chapter-compiler/src/loader.ts、pass1Schema.ts、types.ts（Read-only）
packages/chapter-schema/src/visuals.ts、audio.ts（Read-only）
packages/chapter-compiler/test-fixtures/valid-minimal/**（Read-only）
```

## Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖除 @interactive-story/chapter-compiler、
@interactive-story/chapter-schema 外的任何其他既有包
实现任何可达性（reachability）过滤逻辑
实现任何"资产是否已生产/已存在"的比对逻辑
新增除以上两个既有包外的任何第三方/workspace 依赖
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 assetRequirements.ts + extractAssetRequirements.ts + generateAssetRequirements.ts + 测试 + 包骨架 + 根 tsconfig 引用 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

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
