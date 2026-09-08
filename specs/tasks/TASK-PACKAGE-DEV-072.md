---
node: DEV-072
title: AI Compiler Repair Loop
milestone: M7 — Content Factory Complete
status: ISSUED
task_package_ref: "0315"
---

# TASK PACKAGE — DEV-072（AI Compiler Repair Loop）

## 1. Context

Dev Spec 对 DEV-072 只给出标题「AI Compiler Repair Loop」和一张
ASCII 流程图（第 2770-2781 行）：

```text
Compile
↓
Errors
↓
AI Repair
↓
Compile
```

第 25-26 节把这条链路描述为 AI Draft → Schema Normalizer →
Compiler → Compiler Error → AI Repair → Compiler → PASS。**Schema
Normalizer 在 Dev Spec 里没有对应的 DEV 节点编号**——没有任何节点
负责把 AI 生成的原始草稿文本转成 Compiler 能加载的 Chapter Pack
文件目录，也没有任何节点/真实生产入口进程负责把"修复后的草稿"
重新写回磁盘文件。这与 DEV-065/066/067 面对的"没有真实生产入口
进程"是同一类现实约束，但与它们不同——DEV-072 仍有大量真实、
确定性、可施工的内容：**真实调用既有 DEV-002 Compiler**（`compile()`，
已冻结、`DONE`）、把它的错误结构化输出转成可读的修复请求文本、
以及一个诚实的三态闭集决策函数——因此不裁定 `BLOCKED`，只裁定
"不发明 Schema Normalizer、不发明草稿落盘机制"。

AI Repair 本身面对的处境与 DEV-071 完全相同：Dev Spec 没有给出任何
具体的 AI Repair 网络协议。同 DEV-071 msg 0311/0314 先例，只建
接口 + 诚实占位，不建真实网络客户端。

## 2. Deliverable

新建 `packages/ai-compiler-repair-loop`（唯一 workspace 依赖：
`@interactive-story/chapter-compiler`，DEV-002 冻结导出的
`compile`/`CompileResult` 等类型）。

### 2.1 `src/aiRepairPort.ts`

同 `packages/ai-chapter-generator/src/aiChapterGeneratorPort.ts`
（DEV-071）逐字段风格一致：本地 `Health` 类型镜像（不 import）；

```ts
export type RepairResult = { ok: true; repairedDraft: string } | { ok: false; reason: string };

export interface AiRepairPort {
  repairDraft(requestText: string): Promise<RepairResult>;
  getHealth(): Promise<Health>;
}

export const noopAiRepairPort: AiRepairPort = {
  repairDraft: async () => ({ ok: false, reason: 'no AI repair provider configured' }),
  getHealth: async () => ({ status: 'DOWN', error: 'no AI repair provider configured' }),
};
```

（示例代码，不要求逐字照抄——同 DEV-071，只要类型契约与行为符合
Acceptance。）

### 2.2 `src/buildRepairRequest.ts`

纯函数 `buildRepairRequest(result: CompileResult): string`（`CompileResult`
从 `@interactive-story/chapter-compiler` import）：

- 若 `result.passed === true`，抛出 `Error`（没有任何问题需要修复时
  调用是调用方逻辑错误，明确失败而非静默返回空文本）。
- 否则遍历 `CompileResult` 的每一个问题数组（`loadIssues`、
  `uniquenessIssues`、`referenceIssues`、`graphIssues`、
  `stateIssues`、`hiddenInfoIssues`、`ruleCoverageIssues`；
  `schemaResult` 内的 `failed` 校验错误同样需要覆盖），只把**非空**
  的数组纳入输出，格式不强制（允许直接 `JSON.stringify` 具体条目），
  但返回的字符串必须包含每一条存在的问题的 `message` 文本原文
  （`loadIssues` 用其 `message` 字段；`uniquenessIssues` 没有
  `message` 字段，允许改用 `category`/`id` 拼一条可读描述，只要
  这条描述完整出现在输出里即可）。
- 不做任何"猜测应该如何修复"的建议文本——只忠实转述 Compiler 已经
  给出的问题，不发明修复建议（那是 AI Repair provider 自己的职责）。

### 2.3 `src/runCompileRepairLoop.ts`

```ts
export type CompileRepairLoopOutcome = 'PASSED' | 'REPAIR_UNAVAILABLE' | 'REPAIR_NOT_APPLIED';

export interface CompileRepairLoopResult {
  outcome: CompileRepairLoopOutcome;
  result: CompileResult;
  reason?: string;
}

export async function runCompileRepairLoop(
  rootDir: string,
  repairPort: AiRepairPort,
): Promise<CompileRepairLoopResult>
```

行为（闭集三态，穷尽 `switch`/等价分支，不留 default 兜底）：

1. 真实调用 `compile(rootDir)`（从 `chapter-compiler` import，同流程图
   第一个 `Compile` 框）。
2. `result.passed === true` → 返回 `{ outcome: 'PASSED', result }`
   （流程图走到底部的 `Compile` 成功，无需 Repair）。
3. 否则（对应流程图 `Errors` → `AI Repair`）：用
   `buildRepairRequest(result)` 构造请求文本，调用
   `repairPort.repairDraft(requestText)`：
   - `ok === false` → 返回
     `{ outcome: 'REPAIR_UNAVAILABLE', result, reason: repairResult.reason }`
     （诚实占位/未配置 provider 时的处境，同 DEV-063
     `NOT_YET_WIRED` 先例）。
   - `ok === true` → 返回
     `{ outcome: 'REPAIR_NOT_APPLIED', result, reason: '<诚实说明：本节点没有 Schema Normalizer/草稿落盘机制，收到的 repairedDraft 无法写回 rootDir 也无法据此重新 compile>' }`
     ——**不**尝试把 `repairedDraft` 写入任何文件、**不**递归再次
     调用 `compile()`。只调用一次，不做重试循环（Dev Spec 未定义
     重试上限，不发明）。

### 2.4 `src/index.ts`

```ts
export * from './aiRepairPort.js';
export * from './buildRepairRequest.js';
export * from './runCompileRepairLoop.js';
```

## 3. Scope

### Writable Scope

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
pnpm-lock.yaml（自动生成：新增 packages/ai-compiler-repair-loop 的
importer 条目，含对 @interactive-story/chapter-compiler 的 workspace
依赖解析——新增包被授权后 pnpm 工具链的强制副作用，同 DEV-070
msg 0310 裁定）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-072/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/chapter-compiler/src/compile.ts、types.ts（Read-only，import
消费 compile/CompileResult 等类型，不修改）
packages/chapter-compiler/test-fixtures/valid-minimal/**（Read-only，
测试用真实通过 fixture）
packages/chapter-compiler/test-fixtures/broken-composite/**（Read-only，
测试用真实失败 fixture）
packages/ai-chapter-generator/src/aiChapterGeneratorPort.ts（Read-only，
接口+占位设计的风格先例，不 import）
```

### Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖除 @interactive-story/chapter-compiler 外的任何其他既有包
真实调用任何 AI/LLM 网络 API
实现任何 Schema Normalizer 逻辑（把草稿文本转成 Chapter Pack 文件）
实现任何把 repairedDraft 写回磁盘/重新触发 compile 的逻辑
实现任何重试循环（超过一次 compile → repair 尝试）
新增除 @interactive-story/chapter-compiler 外的任何第三方/workspace 依赖
```

## 4. Required Skills

TypeScript strict mode、Vitest、pnpm workspace 包骨架搭建，需要
读懂 `packages/chapter-compiler/src/compile.ts` 与 `types.ts` 的
真实导出类型（不得凭空猜测字段名）。

## 5. Task Breakdown

- **T001** 节点文档。
- **T002** 实现三个源文件 + 三个测试文件 + 包骨架 + 根 `tsconfig.json`
  引用 + 全量验证（六条命令）+ `REPORT.md`/`DECISIONS.md` 填写 +
  commit + 写入（不提交）LEDGER 追加行与 NODE_REPORT 消息文件。

## 6. Key Decisions（撰写 DECISIONS.md 时必须覆盖）

- 为何不建真实 AI Repair 网络客户端（同 DEV-071/hostLLMProvider.ts
  先例）。
- 为何不实现 Schema Normalizer（Dev Spec 没有为它分配任何 DEV 节点
  编号，发明其实现即超出已授权范围）。
- 为何 `REPAIR_NOT_APPLIED` 是诚实的终止状态而不是继续循环（没有
  落盘机制，"继续 compile" 无对象可 compile）。
- 为何只跑一次 compile→repair，不做重试上限（Dev Spec 未定义，不
  发明具体次数）。
- 为何 `buildRepairRequest` 只转述问题不生成修复建议。

## 7. Definition of Done

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 入库；
`REPORT.md` 完成且 `INDEX.md` Status = `READY_FOR_REVIEW`；LEDGER
追加行与 NODE_REPORT 消息文件已写入工作区但未提交；工作区无残留
临时文件。

## 8. Exit Procedure

提交前用 `git status` 自查工作区是否干净，不得留下任何额外的
临时/草稿文件（DEV-061 的 MAJOR-01 先例）。

## 9. Non-Goals

不真实调用任何网络 API；不实现 Schema Normalizer；不把修复草稿
写回磁盘；不做重试循环；不修改 `chapter-compiler` 本身任何一行。

## 10. Out of Scope (Future Nodes)

真实 AI Repair Provider 接入（若未来 Dev Spec 给出具体协议）、
Schema Normalizer（未分配 DEV 编号）、DEV-073 Asset Requirement
Generator。

## 11. Dependencies

依赖 DEV-002（Compiler，已 `DONE`，冻结）。与 DEV-071（AI Chapter
Generator）平行，无直接代码依赖（本节点不 import
`ai-chapter-generator`）。

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `noopAiRepairPort.repairDraft(...)` 恒定返回 `{ok:false, reason:'no AI repair provider configured'}`，与输入无关 | 测试 |
| A08 | `noopAiRepairPort.getHealth()` 恒定返回 `{status:'DOWN', error:'no AI repair provider configured'}` | 测试 |
| A09 | 手写满足 `AiRepairPort` 接口的 mock 可正常赋值调用 | 测试 |
| A10 | `buildRepairRequest(result)` 当 `result.passed === true` 时抛出 `Error` | 测试 |
| A11 | 对 `chapter-compiler` 的 `broken-composite` fixture 真实 `compile()` 结果调用 `buildRepairRequest`，返回值包含该结果中每一条存在问题的可读描述（message/或 category+id 拼接文本） | 测试 |
| A12 | 对 `chapter-compiler` 的 `valid-minimal` fixture 真实 `compile()` 结果，`runCompileRepairLoop` 用任意 `AiRepairPort`（含 noop）调用，返回 `{outcome:'PASSED', result}`，且不调用 `repairPort.repairDraft` | 测试 |
| A13 | 对 `broken-composite` fixture，`runCompileRepairLoop(rootDir, noopAiRepairPort)` 返回 `{outcome:'REPAIR_UNAVAILABLE', ...}`，`reason` 为 noop 的诚实拒绝理由 | 测试 |
| A14 | 对 `broken-composite` fixture，`runCompileRepairLoop` 传入一个手写返回 `{ok:true, repairedDraft:'...'}` 的 mock `AiRepairPort`，返回 `{outcome:'REPAIR_NOT_APPLIED', ...}`，且不产生任何文件写入、不递归调用 `compile` 第二次 | 测试 |
| A15 | 唯一 workspace 依赖是 `@interactive-story/chapter-compiler`；未新增第三方 npm 依赖 | 文件检查 |
| A16 | 未真实发出任何网络请求（无 `fetch`/`http`/`https`/`WebSocket`） | 代码检查 |
| A17 | 未实现任何 Schema Normalizer 逻辑、未实现任何写回磁盘/重新触发 compile 的逻辑、未实现任何重试循环 | 代码检查 |
| A18 | 除本节点 Writable Scope 外任何既有文件均未被修改（`pnpm-lock.yaml` 自动新增 importer 条目除外） | git diff 比对 |
| A19 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A20 | `specs/dev/DEV-072/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-072: ai compiler repair loop (real DEV-002 compile integration, port + noop AI repair, honest 3-outcome decision, no Schema Normalizer)` | 命令 |
| A22 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交**；工作区无任何额外残留文件 | 命令 + `git status` 检查 |
| A23 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
