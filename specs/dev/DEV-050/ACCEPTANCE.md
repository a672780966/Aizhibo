# DEV-050 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-050.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `currentLocation` 正确取自 `sceneDisclosures[sceneId].locationLabel` | 测试检查 |
| A08 | `knownFacts` 依赖全 PUBLIC 且已确立 → 事实出现 | 测试检查 |
| A09 | `knownFacts` 依赖含 HIDDEN → 事实剔除 | 测试检查 |
| A10 | `knownFacts` 依赖未确立值 → 事实剔除 | 测试检查 |
| A11 | `knownFacts` 事实未声明依赖 → 剔除（default-reject） | 测试检查 |
| A12 | `isFactSafeToDisclose` 覆盖 5 种 key 格式（flags/npc.present/npc.alive/npc.disposition/npc.flags/chapterVariables） | 测试检查 |
| A13 | `currentChoices` 互动 OPEN 时正确返回，非互动时为 `undefined` | 测试检查 |
| A14 | `publishedDice` 正确过滤 `DICE.PUBLISHED`（不误取 `DICE.ROLLED`），无记录时为 `undefined` | 测试检查 |
| A15 | `currentTension` 正确取自 `tensionLabels[world.danger.tensionKey]` | 测试检查 |
| A16 | `storyPhase`/`interactionPhase` 与既有访问器输出逐字节一致 | 测试检查 |
| A17 | `runtime-kernel` 除 `index.ts`（仅追加两行）与新文件外零改动 | git diff 比对 |
| A18 | `index.ts` 未导出 `unwrapSnapshot`/任何暴露 `InternalSnapshot` 的符号 | 源码检查 |
| A19 | 未新增第三方 npm 依赖 | 文件检查 |
| A20 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A21 | `specs/dev/DEV-050/` 节点文档齐全，`INDEX.md` T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A22 | `git log` 新增恰 1 条提交，首行 `DEV-050: public state gateway (projection function)` | 命令 |
| A23 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A24 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
