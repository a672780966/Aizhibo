# DEV-056 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

新增 `packages/ai-host/src/hostLLMProvider.ts`（Dev Spec 第五施工组
DEV-056 "只需一个可替换 Provider API"）：

- **`HostLLMProvider`** 接口：两个方法
  `generateReply(prompt: string): Promise<HostLLMResult>` 与
  `getHealth(): Promise<Health>`——"可替换 Provider API"字面要求的
  抽象层本身。
- **`HostLLMResult`** 联合类型：`{ ok: true; text: string }` |
  `{ ok: false; reason: string }`。
- **`noopHostLLMProvider`** 诚实占位实现：`generateReply` 对任意
  prompt 恒定返回 `{ ok: false, reason: 'no Host LLM provider
  configured' }`；`getHealth` 恒定返回 `{ status: 'DOWN', error:
  'no Host LLM provider configured' }`——**不发起任何网络请求、不
  伪造成功结果**。
- **本地 `Health` 类型镜像**（不导出，仅作接口返回类型）：形状与
  `packages/shared/src/health.ts` 契约逐字段一致，同
  `twitchAuth.ts`（DEV-040）先例，保持 ai-host 零 shared 依赖边界。
- **零依赖**：不 import `runtime-kernel`/`platform-core`/
  `egressGate.ts`/`commentPipeline.ts`/`hostPersona.ts`/
  `hostMood.ts`/`hostScheduler.ts`，无任何 `fetch`/HTTP 客户端/第三
  方 LLM SDK；不接入 Host Scheduler/prompt 拼装/真实 Host Context
  组装（未来 Runtime 组合层职责）。
- **`index.ts`** 追加 `export * from './hostLLMProvider.js';`，未动
  既有五行导出。

## 3. Changed Files

Writable Scope 内共 6 个文件（§7 恰 1 条提交；INDEX/REPORT/DECISIONS
随该提交入库，LEDGER 追加行与 NODE_REPORT 消息文件写入工作区但不提交）：

```text
packages/ai-host/src/hostLLMProvider.ts       （新增，HostLLMResult + HostLLMProvider + noopHostLLMProvider）
packages/ai-host/src/hostLLMProvider.test.ts  （新增，4 条测试）
packages/ai-host/src/index.ts                 （追加导出 ./hostLLMProvider.js）
specs/dev/DEV-056/DECISIONS.md                （新增，D1–D3）
specs/dev/DEV-056/REPORT.md                   （本文件，T001 模板 → T002 回填）
specs/dev/DEV-056/INDEX.md                    （T001–T002 勾选 + Status=READY_FOR_REVIEW）
```

## 4. Tests Executed

| 项 | 结果 |
|---|---|
| `pnpm test`（hostLLMProvider.test.ts） | 4 个测试全部通过 |
| `pnpm test`（全量 workspace） | 零回归：122 个测试文件，715 个测试全部通过（DEV-055 基线 711 + 新增 4） |

## 5. Acceptance Results

| # | 判定 | 结果 | 说明 |
|---|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS | `Already up to date`，退出码 0（未新增任何依赖，A10） |
| A02 | `pnpm typecheck` 退出码 0 | PASS | `tsc -b && tsc -b --noEmit` + renderer typecheck 通过 |
| A03 | `pnpm lint` 退出码 0 | PASS | `eslint .` 通过 |
| A04 | `pnpm format:check` 退出码 0 | PASS | Prettier `All matched files use Prettier code style!` |
| A05 | `pnpm build` 退出码 0 | PASS | `tsc -b` 通过 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | PASS | 全量 122 文件 / 715 测试全绿（见 §4），零回归 |
| A07 | `noopHostLLMProvider.generateReply(prompt)` 对任意输入返回 `{ ok:false, reason:'no Host LLM provider configured' }` | PASS | 测试：`'hello'` 与 `''` 两个不同输入均返回该恒定结果，与 prompt 内容无关（不抛错、不发起网络请求） |
| A08 | `noopHostLLMProvider.getHealth()` 返回 `{ status:'DOWN', error:'no Host LLM provider configured' }` | PASS | 测试：`resolves.toEqual` 全等断言通过 |
| A09 | `noopHostLLMProvider` 不发起任何网络请求（源码不 import `fetch`/HTTP 相关模块） | PASS | hostLLMProvider.ts 零 import——无 fetch/HTTP 客户端/第三方 SDK（见 §2 与 DECISIONS D1） |
| A10 | 未新增第三方 npm 依赖 | PASS | `pnpm install` 无 lock 变化；hostLLMProvider.ts 零 import（见 §2） |
| A11 | `platform-core/**`、`platform-twitch/**`、`runtime-kernel/**`、`egressGate.ts`、`commentPipeline.ts`、`hostPersona.ts`、`hostMood.ts` 均未被修改 | PASS | 见 §6 Scope Check 空 diff 佐证 |
| A12 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | PASS | D1–D3 覆盖全部要点（见 DECISIONS.md） |
| A13 | `specs/dev/DEV-056/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | PASS | 四份文档齐全；INDEX Task 全勾 + Status 已更新 |
| A14 | `git log` 新增恰 1 条提交，首行 `DEV-056: host llm provider (replaceable interface + honest noop placeholder)` | PASS | 见 §7 |
| A15 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | PASS | 见 §8 |
| A16 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | PASS | 见 §6 Scope Check 空 diff 佐证 |

## 6. Scope Check

只施工 DEV-056。严格在 Writable Scope 内改动（见 §3 六个文件），未触碰
Forbidden Scope 任何文件：`packages/platform-core/**`、
`packages/platform-twitch/**`、`packages/runtime-kernel/**`、
`packages/ai-host/src/egressGate.ts`、`commentPipeline.ts`、
`hostPersona.ts`、`hostMood.ts`、`hostScheduler.ts` 零改动（A11）；
未实现任何真实的网络调用/HTTP 客户端/LLM API 协议对接——源码零
import、无 `fetch`、无第三方 LLM SDK（A09/A10，D1）；未接入 Host
Scheduler/prompt 拼装/真实 Host Context 组装；未新增任何第三方 npm
依赖；未创建除 ai-host 内文件外的任何新包；`specs/PROJECT_INDEX.md`/
`DAG.md`/`tasks/**`/`audit/**`/`protocol/**` 零改动（A16）。
Forbidden Scope 全部遵守，无越界。

**Scope Deviations（申报）**：无。工作区在开工前已存在
`egressGate.ts`/`commentPipeline.ts`/`hostScheduler.ts` 的 CRLF 行尾
标记（pre-existing 非内容差异，同 DEV-052/054/055 审计先例），本
节点未触碰未提交。红线核验命令（对比 HEAD~1 与本次提交的
`git diff --stat`）输出为空，确认冻结/治理路径零改动。

## 7. Commit

提交信息首行：`DEV-056: host llm provider (replaceable interface + honest noop placeholder)`。

恰 1 条提交，包含：`hostLLMProvider.ts`、`hostLLMProvider.test.ts`、
`index.ts` 导出、`DECISIONS.md`/`REPORT.md`/`INDEX.md` 节点文档
（共 6 文件）。LEDGER 追加行与 NODE_REPORT 消息文件已写入工作区但
**未提交**（A15）。

## 8. Handoff

LEDGER 追加行与 NODE_REPORT 消息文件（`specs/comms/`）留给 Commander
收尾统一提交，不在本次提交范围内（A15，Constraint 6）。NODE_REPORT
发往 `AUDITOR`，抄送 `COMMANDER`；审核锚点与交付快照见
`specs/comms/0274-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-056.md`。
