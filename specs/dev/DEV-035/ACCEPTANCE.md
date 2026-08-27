# DEV-035 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-035.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归；测试全程零真实网络请求 | 命令输出 + 代码检查 |
| A07 | 无 key 时 `createOptionalElevenLabsTtsProvider` 返回值 `===` `noopTtsProviderPort` | 测试检查（身份比较） |
| A08 | 有 key + 200 响应 → 文件真实写入、内容匹配、返回 `{ok:true,file}` | 测试检查 |
| A09 | 同一 `(voiceId,text)` 两次调用得到同一文件名（幂等） | 测试检查 |
| A10 | 非 200 / 网络异常 → `{ok:false,reason}`，不抛异常 | 测试检查 |
| A11 | 请求 URL/header/body 构造正确 | 测试检查 |
| A12 | 无 key 时 `getOptionalElevenLabsHealth` 返回 `DOWN`，零网络请求 | 测试检查 |
| A13 | `getElevenLabsHealth` 对 200/非200/异常分别返回 `OK`/`DOWN`/`DOWN` | 测试检查 |
| A14 | 未新增任何 npm 依赖 | 文件检查 |
| A15 | `ttsProvider.ts`/`resolveAudioSource.ts` 逐字节未变 | git diff 比对 |
| A16 | `packages/runtime-kernel/**`、`apps/renderer/**` 未被修改 | git diff 比对 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-035/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T003 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-035: result tts (elevenlabs provider)`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-035` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
