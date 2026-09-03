# DEV-040 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-040.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归；测试全程零真实网络请求 | 命令输出 + 代码检查 |
| A07 | 凭据不全时 `createOptionalTwitchAuthProvider` 返回值 `===` `noopTwitchAuthPort` | 测试检查（身份比较） |
| A08 | 凭据齐全 + 200 响应 → 字段正确映射，返回 `{ok:true,token}` | 测试检查 |
| A09 | 非 200 / 网络异常 → `{ok:false,reason}`，不抛异常 | 测试检查 |
| A10 | 请求 URL/method/header/body 构造正确 | 测试检查 |
| A11 | 凭据不全时 `getOptionalTwitchAuthHealth` 返回 `DOWN`，零网络请求 | 测试检查 |
| A12 | `getTwitchAuthHealth` 对 200/非200/异常分别返回 `OK`/`DOWN`/`DOWN` | 测试检查 |
| A13 | 未新增任何 npm 依赖 | 文件检查 |
| A14 | `packages/audio-engine/**`、`packages/runtime-kernel/**`、`apps/renderer/**` 未被修改 | git diff 比对 |
| A15 | 未创建 `packages/ai-host` 或任何 EventSub/Chat 相关代码 | 文件检查 |
| A16 | 根 `tsconfig.json` 恰新增 1 条 `platform-twitch` 的 `references` | git diff 比对 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-040/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T003 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-040: twitch oauth (token refresh provider)`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-040` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
