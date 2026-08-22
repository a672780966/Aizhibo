# DEV-031 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-031.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `resolveResultAudio([], anyText, noop)` → `undefined` | 测试检查 |
| A08 | `resolveResultAudio(nonEmpty, '', noop)` → `undefined` | 测试检查 |
| A09 | `resolveResultAudio(nonEmpty, text, noop)` → `{source:'SUBTITLE_ONLY'}` | 测试检查 |
| A10 | `contentId` 按 `resolved` 原顺序拼接、不排序 | 测试检查（自定义 Port 感知具体 contentId 值） |
| A11 | `Ports.audioResolution` 为追加字段，`defaultPorts.audioResolution === noopAudioResolutionPorts` | 代码检查 + `ports.test.ts` |
| A12 | 端到端默认 Ports：`RESULT_PLAYING` 携带 `audio` 字段且值诚实（`SUBTITLE_ONLY` 或 `undefined`，取决于 fixture） | 集成测试 |
| A13 | 端到端注入 `ports.audioResolution`：`RESULT_PLAYING.audio` 正确反映注入结果 | 集成测试 |
| A14 | `machine.ts` 中 `onResolve`/`onResultPlaying` 之外的全部 action 逐字节未变 | git diff 比对 |
| A15 | `Ports.audio`/`noopAudioPort`/`audioRegion.ts`/`packages/audio-engine/**` 未被修改 | git diff 比对 |
| A16 | `pickResultAudio` 对缺失/非法 `audio` 字段防御性返回 `undefined`，不抛异常 | 测试检查 |
| A17 | `apps/renderer` 未新增任何 workspace 依赖 | 文件检查 |
| A18 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A19 | `specs/dev/DEV-031/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T006 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A20 | `git log` 新增恰 1 条提交，首行 `DEV-031: master audio player`；提交时 `git status --porcelain` 为空 | 命令 |
| A21 | LEDGER 含 `NODE_REPORT-DEV-031` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A22 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
