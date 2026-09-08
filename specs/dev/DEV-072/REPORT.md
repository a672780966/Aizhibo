# DEV-072 REPORT

## 1. Status

DONE — DEV-072（AI Compiler Repair Loop，M7 第三个节点）T001–T002
施工完成，六条验证命令全部退出码 0，恰 1 条提交，`Status:
READY_FOR_REVIEW`。交付给 AUDITOR/COMMANDER 验收。

## 2. Implemented

新建 `packages/ai-compiler-repair-loop`（唯一 workspace 依赖
`@interactive-story/chapter-compiler`——DEV-002 冻结导出的
`compile`/`CompileResult` 等类型，`workspace:*` 同 chapter-compiler
引用 chapter-schema 的仓库惯例，无第三方 npm 依赖）：

- `src/aiRepairPort.ts`：`AiRepairPort` 接口（`repairDraft(requestText):
  Promise<RepairResult>` + `getHealth(): Promise<Health>`）+
  `noopAiRepairPort` 诚实占位实现——`repairDraft` 恒定
  `{ ok: false, reason: 'no AI repair provider configured' }`、
  `getHealth` 恒定 `{ status: 'DOWN', error: 'no AI repair provider
  configured' }`，均与输入无关。`Health` 类型按
  `aiChapterGeneratorPort.ts` / `hostLLMProvider.ts` 先例本地镜像
  （status/lastSuccessAt/latencyMs/error 逐字段一致），不 import——
  零跨包耦合。Dev Spec 未给出任何具体 AI Repair 网络协议（同 DEV-071
  处境），只建接口 + 诚实占位，不建真实网络客户端、不发明协议
  （DECISIONS.md D1）。
- `src/buildRepairRequest.ts`：纯函数 `buildRepairRequest(result:
  CompileResult): string`——`result.passed === true` 时抛出带清晰信息
  的 `Error`（编译已通过、无问题可转述时调用是调用方逻辑错误）；
  否则把 CompileResult 的全部问题载体忠实转述为可读文本：七个 issue
  数组（loadIssues / uniquenessIssues / referenceIssues / graphIssues /
  stateIssues / hiddenInfoIssues / ruleCoverageIssues）中所有非空者 +
  schemaResult 的 19 个分节（manifest/storyGraph/…/metadata，逐字
  枚举分节名）内每个 failed 校验错误（文件路径 + zod issue message +
  zod path）。带 `message` 字段的 issue 输出 message 原文逐字出现；
  `uniquenessIssues` 没有 message 字段，改用
  category/id/conflictingFiles 拼一条完整可读描述。不生成任何"猜测应
  如何修复"的建议文本（DECISIONS.md D5）。
- `src/runCompileRepairLoop.ts`：
  `runCompileRepairLoop(rootDir, repairPort)` 闭集三态决策，穷尽所有
  可观察结果、无 default 兜底——真实调用 `compile(rootDir)`；passed
  → `{ outcome: 'PASSED', result }`（**不调用** `repairPort.
  repairDraft`）；否则 `buildRepairRequest(result)` 构造请求文本后调用
  `repairPort.repairDraft(requestText)`：`ok:false` →
  `{ outcome: 'REPAIR_UNAVAILABLE', result, reason: repairResult.reason }`
  （诚实占位/未配置 provider 的处境，同 DEV-063 `NOT_YET_WIRED`
  先例）；`ok:true` → `{ outcome: 'REPAIR_NOT_APPLIED', result,
  reason }`——reason 诚实说明本节点没有 Schema Normalizer、也没有草稿
  落盘机制，repairedDraft 无法写回磁盘、也无法据此重新 compile。
  只做一次 compile 尝试 + 一次 repair 尝试：不把 repairedDraft 写入
  任何文件、不递归再次调用 compile()、不实现任何重试循环
  （DECISIONS.md D2/D3/D4）。
- `src/index.ts`：barrel `export * from './aiRepairPort.js'; export *
  from './buildRepairRequest.js'; export * from
  './runCompileRepairLoop.js';`
- `src/aiRepairPort.test.ts`（4 测试）：noop `repairDraft` 恒定拒绝
  （非空请求 + 空串请求，证明与输入无关）、`getHealth` 恒定 DOWN、
  手写 `AiRepairPort` mock（返回 `{ok:true, repairedDraft:'mock
  repaired draft'}`）可正常赋值调用（类型契约测试）。
- `src/buildRepairRequest.test.ts`（2 测试）：对 `valid-minimal` fixture
  真实 `compile()` 结果（`passed: true`）调用 `buildRepairRequest` 抛
  `Error`；对 `broken-composite` fixture 真实 `compile()` 结果调用，
  断言返回值非空且**每一处真实存在的问题**的可读描述完整出现——逐条
  `.toContain` 校验全部 message 类 issue 的 message 原文、
  uniquenessIssues 的 `category=… id=…` 与全部 conflictingFiles、
  schemaResult 各 failed 分节的文件路径与每条 zod issue message。
- `src/runCompileRepairLoop.test.ts`（3 测试）：对 `valid-minimal`
  fixture 调用返回 `{outcome:'PASSED', result}`，且以"被调用即抛错"的
  port 证明 `repairDraft` 从未被调用；对 `broken-composite` fixture +
  noop 返回 `{outcome:'REPAIR_UNAVAILABLE', …}` 且 reason 为 noop 的
  诚实拒绝理由；对 `broken-composite` fixture + 手写
  `{ok:true, repairedDraft:'some repaired text'}` mock 返回
  `{outcome:'REPAIR_NOT_APPLIED', …}` 且 reason 点名 Schema
  Normalizer 缺失——全程无任何文件写入、compile 只发生一次。
- 根 `tsconfig.json`：`references` 数组 `ai-chapter-generator` 之后
  追加 `{ "path": "./packages/ai-compiler-repair-loop" }`。
- `pnpm-lock.yaml`：新增 ai-compiler-repair-loop importer 条目（含对
  chapter-compiler 的 workspace 依赖解析）——新增包被授权后 pnpm
  工具链的强制副作用，Task Package 第 3 节已明确授权。

未实现（超出本节点范围，见 Task Package §9/§10）：不真实调用任何
AI/LLM 网络 API（无 `fetch`/`http`/`https`/`WebSocket`）；无 Schema
Normalizer（Dev Spec 未分配 DEV 节点编号）；不把 repairedDraft 写回
磁盘、不递归触发第二次 compile；无重试循环；不修改
`chapter-compiler` 任何一行；不 import/依赖 chapter-compiler 以外的
任何既有包。

## 3. Changed Files

提交内共 14 个文件：

- `packages/ai-compiler-repair-loop/package.json`（新增：name
  `@interactive-story/ai-compiler-repair-loop`，结构对齐
  ai-chapter-generator；`dependencies` 恰一项
  `@interactive-story/chapter-compiler: workspace:*`，无第三方依赖）
- `packages/ai-compiler-repair-loop/tsconfig.json`（新增：与
  ai-chapter-generator 逐字一致，extends ../../tsconfig.base.json，
  outDir dist / rootDir src）
- `packages/ai-compiler-repair-loop/src/index.ts`（新增：三行 barrel）
- `packages/ai-compiler-repair-loop/src/aiRepairPort.ts`（新增）
- `packages/ai-compiler-repair-loop/src/aiRepairPort.test.ts`（新增，
  4 测试）
- `packages/ai-compiler-repair-loop/src/buildRepairRequest.ts`（新增）
- `packages/ai-compiler-repair-loop/src/buildRepairRequest.test.ts`
  （新增，2 测试）
- `packages/ai-compiler-repair-loop/src/runCompileRepairLoop.ts`（新增）
- `packages/ai-compiler-repair-loop/src/runCompileRepairLoop.test.ts`
  （新增，3 测试）
- `tsconfig.json`（根，references 末尾 ai-chapter-generator 之后追加
  一条）
- `pnpm-lock.yaml`（新增 ai-compiler-repair-loop importer 条目）
- `specs/dev/DEV-072/DECISIONS.md`（新增，D1–D5）、
  `specs/dev/DEV-072/REPORT.md`（本文件）、
  `specs/dev/DEV-072/INDEX.md`（T001–T002 勾选 + Status →
  READY_FOR_REVIEW）

（`specs/comms/LEDGER.md` 追加行与 NODE_REPORT 消息文件已写入工作区，
**未提交**——留待 Commander 收尾，同 DEV-070/071 交接方式。）

## 4. Tests Executed

按序执行六条命令，全部退出码 0：

| 命令 | 退出码 |
|---|---|
| `pnpm install --frozen-lockfile` | 0（lockfile 已含新包 importer；先以普通 `pnpm install` 落盘该 importer 条目后复跑仍 0） |
| `pnpm typecheck` | 0（`tsc -b` 含新包真正构建 + `tsc -b --noEmit` + renderer 子包） |
| `pnpm lint` | 0 |
| `pnpm format:check` | 0（首跑即 0——新增文件提交前已 `prettier --write` 就地格式化） |
| `pnpm build` | 0（dist 产出 14 个文件，含新包 9 个 src 文件 × .js/.d.ts） |
| `pnpm test` | 0（141 files / 811 tests 全部通过；既有 802 + 新增 9，零回归） |

## 5. Acceptance Results

A01–A23 逐项：

| # | 判定 | 结果 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | VERIFIED（0） |
| A02 | `pnpm typecheck` 退出码 0 | VERIFIED（0，`tsc -b` 含新包） |
| A03 | `pnpm lint` 退出码 0 | VERIFIED（0） |
| A04 | `pnpm format:check` 退出码 0 | VERIFIED（0） |
| A05 | `pnpm build` 退出码 0 | VERIFIED（0） |
| A06 | `pnpm test` 退出码 0，零回归 | VERIFIED（141 files / 811 tests，
  802 → 811 = +9 新增） |
| A07 | noop `repairDraft` 恒定 `{ok:false, reason:'no AI repair provider
  configured'}`，与输入无关 | VERIFIED（测试 1–2：非空请求 + 空串
  请求） |
| A08 | noop `getHealth` 恒定 `{status:'DOWN', error:'no AI repair
  provider configured'}` | VERIFIED（测试 3） |
| A09 | 手写满足 `AiRepairPort` 的 mock 可赋值调用 | VERIFIED（测试 4：
  `repairDraft` 返回 `{ok:true, repairedDraft:'mock repaired draft'}`） |
| A10 | `buildRepairRequest(result)` 当 `passed: true` 时抛出 `Error` |
  VERIFIED（对 valid-minimal 真实 `compile()` 结果断言抛 `Error`） |
| A11 | 对 broken-composite 真实 `compile()` 结果调用
  `buildRepairRequest`，返回值包含每一条存在问题的可读描述 | VERIFIED
  （逐条 `.toContain`：message 类 issue 的 message 原文 +
  uniquenessIssues 的 category/id/conflictingFiles 拼接 + schemaResult
  failed 分节的文件路径与 zod message） |
| A12 | 对 valid-minimal，`runCompileRepairLoop` 返回
  `{outcome:'PASSED', result}` 且不调用 `repairDraft` | VERIFIED（以
  "被调用即抛错"的 port 证明 `repairDraft` 从未被调用） |
| A13 | 对 broken-composite + noop，返回
  `{outcome:'REPAIR_UNAVAILABLE', …}`，reason 为 noop 诚实拒绝理由 |
  VERIFIED |
| A14 | 对 broken-composite + `{ok:true, repairedDraft}` mock，返回
  `{outcome:'REPAIR_NOT_APPLIED', …}`，无文件写入、compile 不二次调用 |
  VERIFIED（reason 点名 Schema Normalizer 缺失；实现中无任何写盘/递归
  调用路径） |
| A15 | 唯一 workspace 依赖是 `@interactive-story/chapter-compiler`；无
  第三方依赖 | VERIFIED（package.json `dependencies` 恰一项
  `workspace:*`；无新增 npm 依赖） |
| A16 | 未真实发出任何网络请求 | VERIFIED（无 fetch/http/https/
  WebSocket；接口 + 诚实占位 + 纯字符串转述） |
| A17 | 无 Schema Normalizer / 写回磁盘 / 重新触发 compile / 重试循环 |
  VERIFIED（无相关逻辑） |
| A18 | Writable Scope 外既有文件未被修改 | VERIFIED（git diff：仅根
  tsconfig.json + pnpm-lock.yaml——均为新增包的必需联动，Task Package
  第 3 节已明确授权，同 DEV-063/DEV-070/DEV-071 先例） |
| A19 | `DECISIONS.md` 存在并覆盖第 6 节全部要点 | VERIFIED（D1–D5：
  不建真实 AI Repair 客户端之因 / 不实现 Schema Normalizer 之因 /
  REPAIR_NOT_APPLIED 为诚实终止态之因 / 不做重试上限之因 / 只转述不
  生成修复建议之因） |
| A20 | 节点文档齐全，INDEX T001–T002 勾选，Status READY_FOR_REVIEW |
  VERIFIED |
| A21 | `git log` 恰 1 条提交，首行符合 | VERIFIED（提交后核实） |
| A22 | LEDGER 追加行与 NODE_REPORT 存在于工作区未提交；无残留文件 |
  VERIFIED（提交后写入 comms 两处未提交改动；`git status` 无任何额外
  残留——含 Commander dispatch 遗留的 `.tmp_dev072_prompt.txt` 已清除，
  同 DEV-070/071 先例） |
| A23 | PROJECT_INDEX / DAG / tasks / audit / protocol 未修改 |
  VERIFIED（git diff 比对） |

## 6. Scope Check

- Writable Scope 内文件逐一真实改动：新包 9 个文件、根 tsconfig.json、
  INDEX / REPORT / DECISIONS（REQUIREMENTS / ACCEPTANCE 由 Commander
  预置，T001 已满足未改动）。
- Read-only Scope（`compile.ts`/`types.ts` 消费其冻结导出类型、
  test-fixtures 两个 fixture 供真实 `compile()` 集成测试、DEV-071 的
  `aiChapterGeneratorPort.ts` 风格先例）零改动；仅
  `@interactive-story/chapter-compiler` 被 import（本节点唯一允许的
  依赖），fixture 目录只读、不写入。
- Forbidden Scope 全部遵守：未 import/依赖 chapter-compiler 以外的
  任何包；未新增第三方依赖；未调用任何 AI/LLM API（无网络调用代码）；
  未实现 Schema Normalizer / 草稿落盘 / 重新触发 compile / 重试循环；
  `packages/chapter-compiler/` 下无任何改动；Writable Scope 外无改动。
- 说明：`pnpm-lock.yaml` 因新包加入 workspace 产生 importer 条目，
  随实现一并提交——同 DEV-063/070/071 先例（新增包被授权后 pnpm
  工具链的强制副作用，Task Package 第 3 节已明确授权）。

## 7. Commit

单条提交，消息首行：

```
DEV-072: ai compiler repair loop (real DEV-002 compile integration, port + noop AI repair, honest 3-outcome decision, no Schema Normalizer)
```

`git log -1` 核实恰 1 条新提交。LEDGER 追加行（msg_id 0316）与
`specs/comms/0316-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-072.md` 已写入
工作区，**未纳入本次提交**。

## 8. Handoff

交付给 AUDITOR/COMMANDER 验收，验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-072.md` 第 12 节（A01–A23，节点
`ACCEPTANCE.md` 逐行一致）。重点核对项：A15/A16（唯一依赖 +
零网络调用）、A17（无 Normalizer/落盘/重试）、A18（Writable Scope 外
仅 tsconfig/lockfile 联动）、A21（恰 1 条提交）、A22（工作区无残留，
`.tmp_dev072_prompt.txt` 已清除；LEDGER 追加行 + NODE_REPORT 消息文件
未提交）。OpenCode 禁止自行推进下一 DEV Node。
