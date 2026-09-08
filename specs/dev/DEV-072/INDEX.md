# DEV-072 INDEX

Status: IN_PROGRESS

## Current Node

DEV-072 — AI Compiler Repair Loop

## Objective

新建 `packages/ai-compiler-repair-loop`：真实调用既有 DEV-002
Compiler（`compile()`），`AiRepairPort` 接口 + `noopAiRepairPort`
诚实占位（同 DEV-071 先例，Dev Spec 未给出具体 AI Repair 网络协议，
不建真实客户端），`buildRepairRequest` 真实转述 `CompileResult` 的
问题列表，`runCompileRepairLoop` 三态闭集决策
（`PASSED`/`REPAIR_UNAVAILABLE`/`REPAIR_NOT_APPLIED`）——不实现
Schema Normalizer（Dev Spec 未分配节点编号），不把修复草稿写回
磁盘，不做重试循环。

## Allowed Scope

```
packages/ai-compiler-repair-loop/package.json                        （新增）
packages/ai-compiler-repair-loop/tsconfig.json                        （新增）
packages/ai-compiler-repair-loop/src/index.ts                         （新增）
packages/ai-compiler-repair-loop/src/aiRepairPort.ts                  （新增）
packages/ai-compiler-repair-loop/src/aiRepairPort.test.ts             （新增）
packages/ai-compiler-repair-loop/src/buildRepairRequest.ts            （新增）
packages/ai-compiler-repair-loop/src/buildRepairRequest.test.ts       （新增）
packages/ai-compiler-repair-loop/src/runCompileRepairLoop.ts          （新增）
packages/ai-compiler-repair-loop/src/runCompileRepairLoop.test.ts     （新增）
tsconfig.json                                                          （根，追加一条 references 条目）
pnpm-lock.yaml（自动生成的新增 importer 条目，含对 chapter-compiler
的 workspace 依赖）
specs/dev/DEV-072/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/chapter-compiler/src/compile.ts、types.ts（Read-only）
packages/chapter-compiler/test-fixtures/valid-minimal/**（Read-only）
packages/chapter-compiler/test-fixtures/broken-composite/**（Read-only）
packages/ai-chapter-generator/src/aiChapterGeneratorPort.ts（Read-only，风格先例）
```

## Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖除 @interactive-story/chapter-compiler 外的任何其他既有包
真实调用任何 AI/LLM 网络 API
实现任何 Schema Normalizer 逻辑
实现任何把 repairedDraft 写回磁盘/重新触发 compile 的逻辑
实现任何重试循环
新增除 @interactive-story/chapter-compiler 外的任何第三方/workspace 依赖
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 aiRepairPort.ts + buildRepairRequest.ts + runCompileRepairLoop.ts + 测试 + 包骨架 + 根 tsconfig 引用 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

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
