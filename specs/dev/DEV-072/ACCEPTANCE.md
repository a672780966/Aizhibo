# DEV-072 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-072.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

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
| A11 | 对 `broken-composite` fixture 真实 `compile()` 结果调用 `buildRepairRequest`，返回值包含该结果中每一条存在问题的可读描述 | 测试 |
| A12 | 对 `valid-minimal` fixture 真实 `compile()` 结果，`runCompileRepairLoop` 用任意 `AiRepairPort`（含 noop）调用，返回 `{outcome:'PASSED', result}`，且不调用 `repairPort.repairDraft` | 测试 |
| A13 | 对 `broken-composite` fixture，`runCompileRepairLoop(rootDir, noopAiRepairPort)` 返回 `{outcome:'REPAIR_UNAVAILABLE', ...}`，`reason` 为 noop 的诚实拒绝理由 | 测试 |
| A14 | 对 `broken-composite` fixture，`runCompileRepairLoop` 传入手写返回 `{ok:true, repairedDraft:'...'}` 的 mock，返回 `{outcome:'REPAIR_NOT_APPLIED', ...}`，且不产生任何文件写入、不递归调用 `compile` 第二次 | 测试 |
| A15 | 唯一 workspace 依赖是 `@interactive-story/chapter-compiler`；未新增第三方 npm 依赖 | 文件检查 |
| A16 | 未真实发出任何网络请求 | 代码检查 |
| A17 | 未实现 Schema Normalizer/写回磁盘/重新触发 compile/重试循环 | 代码检查 |
| A18 | 除本节点 Writable Scope 外任何既有文件均未被修改（`pnpm-lock.yaml` 自动新增 importer 条目除外） | git diff 比对 |
| A19 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A20 | `specs/dev/DEV-072/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-072: ai compiler repair loop (real DEV-002 compile integration, port + noop AI repair, honest 3-outcome decision, no Schema Normalizer)` | 命令 |
| A22 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交**；工作区无任何额外残留文件 | 命令 + `git status` 检查 |
| A23 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
