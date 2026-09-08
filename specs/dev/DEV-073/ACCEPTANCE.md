# DEV-073 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-073.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | 对一个手写构造的最小 `SchemaValidationResult`（含至少一个 `VisualScene`、一个 `CharacterAsset`（`expressions` 至少两项、`microAnimations` 至少一项非空）、一个 `ImageAsset`、一个 `kind:'BGM'` 的 `AudioAsset`、一个 `kind:'SPEECH'` 的 `AudioAsset`），`extractAssetRequirements` 返回的五个数组内容与手写输入精确匹配（去重排序后） | 测试 |
| A08 | 对同一手写输入，`ImageAsset` 条目本身的 `id` 不出现在任何输出数组里（除非它恰好也被某个 `VisualLayer.assetId` 引用） | 测试 |
| A09 | 对 `schemaResult` 中某个集合含 `failed` 校验失败条目的情况，`extractAssetRequirements` 忽略它们，不抛错、不产生对应输出 | 测试 |
| A10 | 对 `chapter-compiler` 的 `valid-minimal` fixture，`generateAssetRequirements(rootDir)` 返回 `illustrations: ['img-forest']`、`bgm: ['bgm-main']`、`voice: ['amb-forest', 'voice-guide']`（真实调用 `loadChapterPack`+`runSchemaValidation`，断言与该 fixture 真实内容逐一匹配） | 测试 |
| A11 | 五个输出数组均无重复元素且按字典序排序 | 测试 |
| A12 | 唯一 workspace 依赖是 `@interactive-story/chapter-compiler` 与 `@interactive-story/chapter-schema`；未新增第三方 npm 依赖 | 文件检查 |
| A13 | 未实现任何可达性过滤逻辑、未实现任何"已生产/未生产"比对逻辑 | 代码检查 |
| A14 | 除本节点 Writable Scope 外任何既有文件均未被修改（`pnpm-lock.yaml` 自动新增 importer 条目除外） | git diff 比对 |
| A15 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A16 | `specs/dev/DEV-073/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A17 | `git log` 新增恰 1 条提交，首行 `DEV-073: asset requirement generator (real chapter pack extraction, 5 Dev Spec categories, no reachability filter)` | 命令 |
| A18 | 提交后 LEDGER 追加行（正确置于历史表格内，`当前待处理` 之前）与 NODE_REPORT 消息文件存在于工作区但**未提交**；工作区无任何额外残留文件 | 命令 + `git status` 检查 |
| A19 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
