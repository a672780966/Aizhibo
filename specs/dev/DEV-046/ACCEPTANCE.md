# DEV-046 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-046.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | 凭据不可用 → 直接失败，`fetchImpl` 从未被调用 | 测试检查 |
| A08 | 成功路径：请求 URL/method/header/body 字段正确，返回 `{ok:true,messageId}` | 测试检查 |
| A09 | `is_sent:false` → `{ok:false,reason}`（取自 `drop_reason.message`） | 测试检查 |
| A10 | 非 200 → `{ok:false,reason}` | 测试检查 |
| A11 | 响应体形状异常 → `{ok:false,reason}` | 测试检查 |
| A12 | `fetch` 抛异常 → `{ok:false,reason}`，不抛出未捕获异常 | 测试检查 |
| A13 | `noopTwitchSendChat` 恒定 `{ok:false,reason}`，不发起 `fetch` | 测试检查 |
| A14 | 失败场景下 `fetchImpl` 只被调用一次（不重试） | 测试检查 |
| A15 | 未新增第三方 npm 依赖 | 文件检查 |
| A16 | `runtime-kernel/**` 未被修改，且未被 import/依赖 | git diff + 源码检查 |
| A17 | 未创建 `packages/ai-host` 或额外新包 | 文件检查 |
| A18 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A19 | `specs/dev/DEV-046/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A20 | `git log` 新增恰 1 条提交，首行 `DEV-046: twitch send chat` | 命令 |
| A21 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A22 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
