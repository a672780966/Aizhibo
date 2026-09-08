---
node: DEV-071
title: AI Chapter Generator
milestone: M7 — Content Factory Complete
status: ISSUED
task_package_ref: "0311"
---

# TASK PACKAGE — DEV-071（AI Chapter Generator）

## 1. Context

Dev Spec 对 DEV-071 只给出标题「AI Chapter Generator」（第 2765-2768
行），未给出任何具体的外部 LLM API 协议、鉴权方式、请求/响应格式。
第 25-26 节把「GPT-5.6 Sol / Fable 5」列为 Offline Authoring 使用的
强模型，但同样没有给出任何可对接的具体接口。

**直接先例（同类决策，已存在于本仓库）**：`packages/ai-host/src/
hostLLMProvider.ts`（DEV-05X 系列，早于本轮 M6/M7）面对完全相同的
处境——需要"调用一个强 LLM"但 Dev Spec 没给出具体协议——采取的
方案是只建 `HostLLMProvider` 接口 + `noopHostLLMProvider` 诚实占位
实现，不建任何真实网络客户端。这与 DEV-040（Twitch OAuth）/
DEV-041（Twitch EventSub）/DEV-064（OBS WebSocket v5）的"建真实
客户端"先例形成对照：后三者面对的是**真实、公开、稳定的外部协议
文档**（Twitch API、obs-websocket v5 spec），前者（hostLLMProvider）
面对的是**不存在任何可查证协议文档的抽象 LLM 调用**。DEV-071 与
hostLLMProvider 是同一种处境，因此采用同一种方案：接口 + 诚实占位，
不建真实网络客户端、不发明协议。

DEV-071 唯一的真实可施工内容是：把 DEV-070 冻结的
`CHAPTER_AUTHORING_SCHEMA_PROMPT` 与调用方提供的 brief（章节创作
意图简述）**真实、确定性地拼接**成一段完整的请求文本——这一步不
依赖任何未定义的外部协议，可以完全机械验证。

## 2. Deliverable

新建 `packages/ai-chapter-generator`。

### 2.1 `src/aiChapterGeneratorPort.ts`

```ts
// Health 形状与 packages/ai-host/src/hostLLMProvider.ts 逐字段一致（本地
// 镜像，不 import，同 DEV-040 先例保持零跨包耦合）。
type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};

export type ChapterDraftResult = { ok: true; draft: string } | { ok: false; reason: string };

export interface AiChapterGeneratorPort {
  generateDraft(requestText: string): Promise<ChapterDraftResult>;
  getHealth(): Promise<Health>;
}

export const noopAiChapterGeneratorPort: AiChapterGeneratorPort = {
  generateDraft: async () => ({ ok: false, reason: 'no chapter generator provider configured' }),
  getHealth: async () => ({ status: 'DOWN', error: 'no chapter generator provider configured' }),
};
```

（上面是设计意图的示例代码，不是要求逐字照抄——不同于 DEV-070，本
节点的代码是确定性实现，执行方可按自己的代码风格实现，只要类型
契约、行为与本节点 Acceptance 一致即可。）

### 2.2 `src/buildChapterAuthoringRequest.ts`

一个纯函数 `buildChapterAuthoringRequest(brief: string): string`：

- 从 `@interactive-story/chapter-authoring-prompts` import
  `CHAPTER_AUTHORING_SCHEMA_PROMPT`（DEV-070 冻结导出，本节点唯一
  允许的 workspace 依赖）。
- `brief` 是调用方提供的章节创作意图简述（自然语言，自由格式）。
- 若 `brief` 是空字符串或只含空白字符，抛出 `Error`（明确的失败，
  不是静默通过——防止把一段没有意图的请求发给未来真实接入的
  provider）。
- 否则返回 `CHAPTER_AUTHORING_SCHEMA_PROMPT` 与 `brief` 拼接后的
  完整请求文本，要求同时满足：
  - 返回值必须同时 `includes` 完整未改动的
    `CHAPTER_AUTHORING_SCHEMA_PROMPT`（原样，不截断/不改写）；
  - 返回值必须 `includes` 传入的 `brief` 原文；
  - `CHAPTER_AUTHORING_SCHEMA_PROMPT` 的内容必须出现在 `brief`
    之前（顺序：schema prompt 在先，brief 在后——保持 AI 先读
    完整规则再读具体需求的阅读顺序）。
  - 具体的分隔符/标题文案由执行方自行决定（不强制格式，只强制
    上述三条可机械验证的性质）。

### 2.3 `src/index.ts`

```ts
export * from './aiChapterGeneratorPort.js';
export * from './buildChapterAuthoringRequest.js';
```

## 3. Scope

### Writable Scope

```
packages/ai-chapter-generator/package.json                        （新增）
packages/ai-chapter-generator/tsconfig.json                        （新增）
packages/ai-chapter-generator/src/index.ts                         （新增）
packages/ai-chapter-generator/src/aiChapterGeneratorPort.ts        （新增）
packages/ai-chapter-generator/src/aiChapterGeneratorPort.test.ts   （新增）
packages/ai-chapter-generator/src/buildChapterAuthoringRequest.ts       （新增）
packages/ai-chapter-generator/src/buildChapterAuthoringRequest.test.ts  （新增）
tsconfig.json                                                      （根，追加一条 references 条目）
pnpm-lock.yaml（自动生成：新增 packages/ai-chapter-generator 的 importer
条目，含对 @interactive-story/chapter-authoring-prompts 的 workspace
依赖解析——这是新增包被授权后 pnpm 工具链的强制副作用，非执行方自行
选择修改的既有文件，同 DEV-070 msg 0310 裁定）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-071/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/chapter-authoring-prompts/src/chapterAuthoringSchemaPrompt.ts
（Read-only，本节点唯一允许 import 的既有源，验证内容用）
packages/ai-host/src/hostLLMProvider.ts（Read-only，接口+占位设计的
风格先例，不 import、不依赖）
```

### Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖除 @interactive-story/chapter-authoring-prompts 外的任何其他既有包
真实调用任何 AI/LLM 网络 API（Dev Spec 未给出具体协议，同
hostLLMProvider.ts 先例，只建 interface + noop）
实现任何 Schema Normalizer/Compiler 逻辑（既有 DEV-002 的职责）
实现任何 AI Repair Loop 逻辑（未来 DEV-072 的职责）
新增除 @interactive-story/chapter-authoring-prompts 外的任何第三方/workspace 依赖
```

## 4. Required Skills

TypeScript strict mode、Vitest、pnpm workspace 包骨架搭建（参照
`packages/chapter-authoring-prompts` 与 `packages/ai-host` 的既有
结构）。

## 5. Task Breakdown

- **T001** 节点文档（本文件对应的 `specs/dev/DEV-071/*.md` 四件套 +
  DECISIONS.md 占位）。
- **T002** 实现 `aiChapterGeneratorPort.ts` + `buildChapterAuthoringRequest.ts`
  + 对应测试 + 包骨架 + 根 `tsconfig.json` 引用 + 全量验证（六条命令）
  + `REPORT.md`/`DECISIONS.md` 填写 + commit + 写入（不提交）
  LEDGER 追加行与 NODE_REPORT 消息文件。

## 6. Key Decisions（撰写 DECISIONS.md 时必须覆盖）

- 为何不建真实 LLM 网络客户端（Dev Spec 未给出协议，同
  hostLLMProvider.ts 先例，与 Twitch/OBS 的"有真实协议就建真实
  客户端"先例并不矛盾——协议是否存在才是判据）。
- 为何 `buildChapterAuthoringRequest` 是本节点唯一的真实确定性逻辑，
  以及它为何不做任何 schema 校验/normalize（那是 DEV-072 及以后的
  职责，本节点只负责"把 prompt 和 brief 拼起来"）。
- 为何空/空白 `brief` 要抛错而不是静默通过。
- 为何唯一允许的 workspace 依赖是 `chapter-authoring-prompts`。

## 7. Definition of Done

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 入库；
`REPORT.md` 完成且 `INDEX.md` Status = `READY_FOR_REVIEW`；LEDGER
追加行与 NODE_REPORT 消息文件已写入工作区但未提交；工作区无残留
临时文件。

## 8. Exit Procedure

提交前用 `git status` 自查工作区是否干净，不得留下任何额外的
临时/草稿文件（DEV-061 的 MAJOR-01 先例）。

## 9. Non-Goals

不真实调用任何网络 API；不做 Schema Normalizer/Compiler/AI Repair
Loop；不实现真实的 Chapter 生成结果解析或落盘。

## 10. Out of Scope (Future Nodes)

真实 AI Provider 接入（若 Dev Spec 未来给出具体协议）、Schema
Normalizer、DEV-072 AI Compiler Repair Loop。

## 11. Dependencies

依赖 DEV-070（已 `DONE`，`CHAPTER_AUTHORING_SCHEMA_PROMPT` 已冻结）。

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `noopAiChapterGeneratorPort.generateDraft(...)` 恒定返回 `{ok:false, reason:'no chapter generator provider configured'}`，与输入无关 | 测试 |
| A08 | `noopAiChapterGeneratorPort.getHealth()` 恒定返回 `{status:'DOWN', error:'no chapter generator provider configured'}` | 测试 |
| A09 | 手写满足 `AiChapterGeneratorPort` 接口的 mock 可正常赋值调用（类型契约测试） | 测试 |
| A10 | `buildChapterAuthoringRequest('')` 与仅空白字符的 brief 均抛出 `Error` | 测试 |
| A11 | `buildChapterAuthoringRequest(brief)` 返回值完整 `includes` 未改动的 `CHAPTER_AUTHORING_SCHEMA_PROMPT` | 测试 |
| A12 | 返回值完整 `includes` 传入的 `brief` 原文 | 测试 |
| A13 | `CHAPTER_AUTHORING_SCHEMA_PROMPT` 在返回值中的出现位置早于 `brief` 的出现位置 | 测试 |
| A14 | 唯一 workspace 依赖是 `@interactive-story/chapter-authoring-prompts`；未新增第三方 npm 依赖 | 文件检查 |
| A15 | 未真实发出任何网络请求（无 `fetch`/`http`/`https`/`WebSocket` 等网络 API 调用） | 代码检查 |
| A16 | 未实现任何 Schema Normalizer/Compiler/AI Repair Loop 逻辑 | 代码检查 |
| A17 | 除本节点 Writable Scope 外任何既有文件均未被修改（`pnpm-lock.yaml` 的自动新增 importer 条目除外，见第 3 节说明） | git diff 比对 |
| A18 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A19 | `specs/dev/DEV-071/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A20 | `git log` 新增恰 1 条提交，首行 `DEV-071: ai chapter generator (port + noop, no real LLM protocol defined; deterministic prompt+brief request builder)` | 命令 |
| A21 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交**；工作区无任何额外残留文件 | 命令 + `git status` 检查 |
| A22 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
