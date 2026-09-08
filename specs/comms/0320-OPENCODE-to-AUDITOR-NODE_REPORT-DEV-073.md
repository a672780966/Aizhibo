---
msg_id: "0320"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-073
in_reply_to: "0319"
created_at: 2026-09-08
requires_response: true
git_head: 690d1b4
changed_files_count: 13
commands_run: [pnpm install --frozen-lockfile, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-073

DEV-073（Asset Requirement Generator，M7 第四个节点）T001–T002 施工完成，
`READY_FOR_REVIEW`。

交付全文见 `specs/dev/DEV-073/REPORT.md`；决策记录见
`specs/dev/DEV-073/DECISIONS.md`（D1–D5）；验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-073.md` 第 12 节（A01–A19，节点
`ACCEPTANCE.md` 逐行一致）。

## 交付快照

- `git_head`: 690d1b4
- Changed Files（13，与实现提交一致）：
  - `packages/asset-requirement-generator/package.json`（新增：name
    `@interactive-story/asset-requirement-generator`，结构对齐
    ai-compiler-repair-loop；`dependencies` 恰两项
    `@interactive-story/chapter-compiler` +
    `@interactive-story/chapter-schema`，均 `workspace:*`，无第三方依赖）
  - `packages/asset-requirement-generator/tsconfig.json`（新增：与
    ai-compiler-repair-loop 逐字一致）
  - `packages/asset-requirement-generator/src/index.ts`（新增：三行 barrel）
  - `packages/asset-requirement-generator/src/assetRequirements.ts`（新增：
    `AssetRequirements` 五字段接口）
  - `packages/asset-requirement-generator/src/extractAssetRequirements.ts`
    （新增：按字段存在性窄化 `visuals.passed`——`'layers' in`→
    VisualScene 收 layer.assetId 入 illustrations；`'expressions' in`→
    CharacterAsset 收 expressions 值与 microAnimations 元素；裸 ImageAsset
    无输出；`audio.passed` 按 kind 分 BGM/voice；failed 全忽略；五数组
    去重字典序）
  - `packages/asset-requirement-generator/src/generateAssetRequirements.ts`
    （新增：薄封装，真实 `loadChapterPack`+`runSchemaValidation`）
  - `packages/asset-requirement-generator/src/extractAssetRequirements.test.ts`
    + `generateAssetRequirements.test.ts`（新增，3+2 测试）
  - `tsconfig.json`（根，references 追加 asset-requirement-generator）
  - `pnpm-lock.yaml`（新增 importer 条目——授权新包后 pnpm 工具链强制
    副作用）
  - `specs/dev/DEV-073/DECISIONS.md`（新增，D1–D5）、`REPORT.md`、
    `INDEX.md`（T001–T002 勾选，Status → READY_FOR_REVIEW）

## 关键点

- **零 AI/LLM 调用**：本节点是纯确定性数据提取（与 DEV-070/071/072 的
  本质区别），无任何网络/协议代码。
- **真实数据路径**：测试对 `chapter-compiler/test-fixtures/valid-minimal`
  真实 fixture 走 `loadChapterPack` + `runSchemaValidation`，断言
  `illustrations:['img-forest']`、`bgm:['bgm-main']`、
  `voice:['amb-forest','voice-guide']`（A10/A11）。
- **不做可达性过滤、不做已生产/未生产比对**（A13）：只遍历
  `visuals.passed`/`audio.passed`，无 storyGraph/图遍历、无生产状态输入。
- **测试**：手写 `SchemaValidationResult` 覆盖 A07（VisualScene×2 跨
  场景 `img-forest` 去重 + CharacterAsset expressions 两项 +
  microAnimations 含重复元素 + BGM 同 id ×2 + SPEECH + AMBIENCE，精确
  匹配去重排序后五数组）、A08（裸 `img-logo` 不出现在任何输出数组）、
  A09（`visuals.failed`/`audio.failed` 含失败条目，不抛错无对应输出）。
- 既有 811 测试 + 新增 5 = 816 全部通过，零回归；六条命令全部退出码 0。

## 范围与残留

- Writable Scope 外零改动：`chapter-compiler/`、`chapter-schema/` 无任何
  改动；`specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、
  `specs/audit/**`、`specs/protocol/**` 均未修改。
- 工作区无残留：Commander dispatch 遗留的 `.tmp_dev073_prompt.txt` 已
  清除（同 DEV-070/071/072 先例）。
- 本 LEDGER 追加行（msg_id 0320，置于历史表格内、`当前待处理` 之前）
  与消息文件**未提交**，留待 Commander/AUDITOR 收尾。
