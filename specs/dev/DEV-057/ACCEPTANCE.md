# DEV-057 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-057.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `noopHostTtsProvider.synthesizeSpeech(text)` 对任意输入返回 `{ ok:false, reason:'no Host TTS provider configured' }` | 测试检查 |
| A08 | `noopHostTtsProvider.getHealth()` 返回 `{ status:'DOWN', error:'no Host TTS provider configured' }` | 测试检查 |
| A09 | `noopHostTtsProvider` 不发起任何网络请求（源码不 import `fetch`/WebSocket/HTTP 相关模块） | 文件/文本检查 |
| A10 | `HostTtsResult` 的 `ok:true` 分支类型契约可用，手写 mock async generator 实现能被正确 `for await` 遍历出预期数据块 | 测试检查 |
| A11 | 未新增第三方 npm 依赖 | 文件检查 |
| A12 | `platform-core/**`、`platform-twitch/**`、`runtime-kernel/**`、`audio-engine/**`、`egressGate.ts`、`commentPipeline.ts`、`hostPersona.ts`、`hostMood.ts`、`hostScheduler.ts`、`hostLLMProvider.ts` 均未被修改 | git diff 比对 |
| A13 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A14 | `specs/dev/DEV-057/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A15 | `git log` 新增恰 1 条提交，首行 `DEV-057: host tts (streaming-shaped interface + honest noop placeholder)` | 命令 |
| A16 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A17 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改（DEV-038 状态不受影响） | git diff 比对 |
