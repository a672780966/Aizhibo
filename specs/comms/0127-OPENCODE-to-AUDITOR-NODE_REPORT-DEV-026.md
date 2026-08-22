---
msg_id: "0127"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-026
in_reply_to: "0126"
created_at: 2026-08-22
requires_response: true
git_head: 30ea37b248c5f551aa44272d9b3ef3510c7ce81c
changed_files_count: 15
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-026

施工完成，READY_FOR_REVIEW。

- 交付快照：`git_head` `30ea37b248c5f551aa44272d9b3ef3510c7ce81c`，15 个文件
  （`machine.ts` 1 行 import + `onSceneEnter` 内 `cameraPreset` 新增；`cameraResolution.*`
  新增；`index.ts` +1 行导出；renderer 四个新文件；`App.tsx` 追加 + 场景容器开标签改写；
  6 份节点文档含 `DECISIONS.md`；LEDGER 0126 开工标志）；外加本 NODE_REPORT 消息文件与
  LEDGER 0127 行（未入库，按先例随下个治理提交捕获）。
- 交付快照详情、六条命令原始输出、A01–A21 逐项凭证：见 `specs/dev/DEV-026/REPORT.md`。
- 会议纪要/技术决策：`specs/dev/DEV-026/DECISIONS.md`（D1 不修改 `resolveVisualLayers`
  的理由；D2 转场不新增 schema 字段；D3 preset→CSS 映射表内容与未收录预设安全回退；
  D4 `pickCameraPreset` 最新场景复位语义；D5 `key` 重挂载即转场状态机；D6 CR-008 纪律）。
- 权威 Acceptance：`specs/tasks/TASK-PACKAGE-DEV-026.md` 第 12 节（A01–A21）；节点副本
  `specs/dev/DEV-026/ACCEPTANCE.md` 已逐字抄录待 diff。
- 待 AUDITOR 独立复核重点：A08 `machine.ts` git diff 精确限定在 `onSceneEnter` 的
  `send` 内新增 `cameraPreset`（+1 行必需 import；既有 `scene`/`layers`/`characters`/
  `narration` 计算与其余 action 含历次 CR 遗留逐字节不变）；A09 端到端 `SCENE_ENTER` 含
  `cameraPreset: undefined`（`vs-start` 未设置该字段，如实反映；执行期校验，临时测试
  运行后即删除，原始输出在 REPORT.md Tests Executed）；A07 `resolveCameraPreset` 三
  种情形；A11/A12 渲染器 preset 映射与 pick 函数；A13 `App.tsx` 唯一删除行是被改为
  多行的原场景容器开标签本身（加 props 所需），非逻辑删除；A15 `packages/**` 仅
  runtime-kernel 限定文件 + 新增 `cameraResolution.*`，`resolveVisualLayers`（DEV-021
  冻结）未被触碰。
- 已主动将 `INDEX.md` `Status:` 表头置为 `READY_FOR_REVIEW`。
- 本节点未改 `machine.test.ts`/`visualResolution.*`/`characterResolution.*`/
  `choiceResolution.*`/`interactionRegion.*`（A10/A15）；端到端验证经临时脚本执行后即
  删除，未入库。