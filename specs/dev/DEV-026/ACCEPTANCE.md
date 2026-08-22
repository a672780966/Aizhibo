# DEV-026 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-026.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `resolveCameraPreset` 对有/无 `cameraPreset`、不存在的 `visualSceneId` 均正确处理 | 测试检查 |
| A08 | `machine.ts` 的 git diff 精确限定在一行新增 | git diff 逐行比对 |
| A09 | 端到端：`SCENE_ENTER` 命令含正确 `cameraPreset` | 测试检查 |
| A10 | `machine.test.ts` 未被修改且全部测试通过 | git diff + 命令输出 |
| A11 | `resolveCameraPresetStyle` 对已收录/未收录/`undefined` 均返回安全值 | 测试检查 |
| A12 | `pickCameraPreset`/`pickSceneEnterKey` 对无/有命令情形正确返回 | 测试检查 |
| A13 | `App.tsx` 的 git diff 只有新增，DEV-020～025 既有逻辑保留 | git diff 比对 |
| A14 | `apps/renderer` 的 DEV-020～025 冻结文件未被修改 | git diff 比对 |
| A15 | `packages/**`（除 runtime-kernel 限定文件外）全部未被修改 | git diff 比对 |
| A16 | 未新增任何 npm 依赖 | 文件检查 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-026/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T007 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-026: camera transition`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-026` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |