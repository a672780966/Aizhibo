---
msg_id: "0103"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-021
in_reply_to: "0102"
created_at: 2026-08-21
requires_response: true
git_head: d797f02
changed_files_count: 15
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-021

## 概要

DEV-021 Scene Renderer（M2 第二个节点）施工完成，节点 `READY_FOR_REVIEW`。本节点包含
一次对 DEV-009 已冻结 `onSceneEnter` action 的**窄范围 Change Request**：`SCENE_ENTER`
命令载荷从占位 `{ kind, sceneId }` 丰富为 `{ kind, sceneId, visualSceneId, layers }`，
解析链（`visualSceneId → VisualScene → layers → ImageAsset.file`）按 Dev Spec §35
「Renderer 不维护剧情」原则放在 Runtime 侧完成——`apps/renderer` 不读任何章节文件，只做
布局排序渲染。

- 新增纯函数 `resolveVisualLayers`（`visualResolution.ts`）：在
  `schemaResult.visuals.passed` 里以 `'layers' in value` / `'file' in value` 判别
  `VisualScene`/`ImageAsset`，两跳引用解析；防御性处理（未知 `visualSceneId` 返回 `[]`、
  某层缺 `ImageAsset` 跳过不抛异常）。
- `machine.ts` 仅改 `onSceneEnter` 一个 action 的内部实现（+ 实现该 CR 必需的 1 行
  import，DECISIONS D8），其余内容逐字节不变，git diff 可逐行核对（A08）。
- `index.ts` 仅追加 2 行导出。
- `apps/renderer` 新增 `composeLayers`（按 `z` 升序排序、映射 `zIndex`、`parallax` 原样
  透传），`App.tsx` 仅追加场景层渲染（`pickSceneLayers` 纯函数 + 按 `zIndex` 定位的
  `<img src={file}>`），既有 HELLO/调试列表逻辑原样保留。
- **向后兼容已核实**：既有全部测试文件（`machine.test.ts`/`presentationCommand.test.ts`/
  `storyRegion.test.ts`/`snapshot.test.ts`）对 `'SCENE_ENTER'` 的断言只检查
  `kind`/`storyPhase` 字符串，不依赖完整 payload 形状，因此零既有测试改动（A10）。
- **已知诚实缺口**：`file` 是 Chapter Pack 内相对路径，无静态资源服务器（DEV-075
  职责），图片当前加载不出来是预期行为，已记入 DECISIONS D3。

## 验证

六条命令严格按顺序全部退出码 0：

- `pnpm install`（Already up to date，零新增依赖，`pnpm-lock.yaml` 无 diff）
- `pnpm typecheck`（`tsc -b && tsc -b --noEmit` + renderer 独立 `tsc --noEmit`）
- `pnpm lint`（`eslint .`，含新增 `.tsx`）
- `pnpm format:check`
- `pnpm build`（`tsc -b`）
- `pnpm test`：87 Test Files / 448 Tests 全部通过（DEV-020 基线 85/432，新增 2 文件/
  16 条，既有零回归，含未改动的 `machine.test.ts`）

关键验证：真实 `valid-minimal` fixture 端到端——`createRuntimeMachine` 驱动至
`SCENE_ENTER`，presentation 命令 `kind==='SCENE_ENTER'`、`visualSceneId:'vs-start'`、
`layers` 与 `resolveVisualLayers` 返回值逐字一致（`[{assetId:'img-forest',
file:'assets/img/forest.png', z:0}]`），`audio` 端口仍为占位载荷（CR 未触
`audio.send` 行）；`resolveVisualLayers` 对未知 id 返回 `[]`、对缺引用层防御性跳过；
`composeLayers` z 升序/稳定/负数/parallax 语义全过。

详细逐条验收证据见 `specs/dev/DEV-021/REPORT.md`（A01–A20），设计决策（CR 理由与向后
兼容核实结果、图片加载不出已知缺口、parallax 透传理由、防御性处理、machine.ts import
行说明、端到端测试落点）见 `specs/dev/DEV-021/DECISIONS.md`（D1–D8，已随提交入库）。