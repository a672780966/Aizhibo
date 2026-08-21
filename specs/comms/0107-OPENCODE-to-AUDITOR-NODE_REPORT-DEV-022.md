---
msg_id: "0107"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-022
in_reply_to: "0106"
created_at: 2026-08-21
requires_response: true
git_head: 29099672b7fcfefff606a61570c7313bce29fc82
changed_files_count: 13
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-022

## 概要

DEV-022 Character Renderer（M2 第三个节点，第二次对 `onSceneEnter` 发窄范围 CR）施工完成，
节点 `READY_FOR_REVIEW`。本节点对 DEV-009 已冻结、DEV-021 已 CR 过一次的 `onSceneEnter`
action 再发 CR #2：`SCENE_ENTER` 命令载荷追加 `characters` 字段（角色站位解析结果）。解析链
严格按任务包 2.3 节**三跳引用**实现（`characterId → NPCDefinition.characterAssetId →
CharacterAsset → ImageAsset`）——`characterId` 不在 `visuals.passed` 里是正常的，第一跳必须先
查 `schemaResult.npc.passed`。按 Dev Spec §35「Renderer 不维护剧情」原则，解析在 Runtime 侧
完成，`apps/renderer` 不读任何章节文件，只做五档 slot 定位布局与通用呼吸微动。

- 新增纯函数 `resolveCharacterPlacements`（`characterResolution.ts`）：三跳解析，防御性处理
  （`NPCDefinition`/`CharacterAsset`/表情不在 `expressions`/`ImageAsset` 任一缺失即跳过该角色，
  不抛异常不中断）；`expressionKey = placement.expression ?? defaultExpression`；`visible` 原样
  透传（是否绘制交 Renderer）。
- `machine.ts` 仅改 `onSceneEnter` 内新增两处（`characters` 局部变量 + `send` 参数追加
  `characters,`）+ 实现该 CR 必需的 1 行 import，DEV-021 遗留的 `scene`/`layers` 计算、
  `audio.send`、`storyMove` 返回及全部其它 action 逐字节不变（A08 可逐行核对）。
- `index.ts` 仅追加 2 行导出。
- `apps/renderer` 新增 `composeCharacters`（过滤 `visible:false`，五档 slot → `leftPercent`
  固定映射 `LEFT:10, CENTER_LEFT:30, CENTER:50, CENTER_RIGHT:70, RIGHT:90`，
  `animated = (microAnimations?.length ?? 0) > 0`）；`App.tsx` 仅追加 `pickSceneCharacters`
  纯函数 + 角色 `<img>` 渲染组（`left%` 定位、`zIndex:1000` 固定高于背景层、`animated` 加
  `character-animated` class 触发通用 `@keyframes breathe` 呼吸动画），既有 HELLO/调试列表/
  场景层逻辑原样保留。
- **已知简化如实记录（D3）**：不按具体动画名区分微动效果，`animated` 一律套用同一种通用 CSS
  呼吸/缩放脉动——无真实动画资产支撑，真正按名字驱动留到有真实动画资产定义时再做。
- **向后兼容已核实**：本 CR 只给 `SCENE_ENTER` 载荷追加一个字段，DEV-021 遗留的
  `visualSceneId`/`layers` 仍在命令中（端到端断言复核），既有全部测试（含 `machine.test.ts`/
  `visualResolution.test.ts`）无需改动，保持 Read-only（A10）。

## 验证

六条命令严格按顺序全部退出码 0：

- `pnpm install`（Already up to date，零新增依赖，`pnpm-lock.yaml` 无 diff）
- `pnpm typecheck`（`tsc -b && tsc -b --noEmit` + renderer 独立 `tsc --noEmit`）
- `pnpm lint`（`eslint .`，含新增 `.tsx`）
- `pnpm format:check`（3 个新增文件经 prettier 归一化后全过）
- `pnpm build`（`tsc -b`）
- `pnpm test`：89 Test Files / 465 Tests 全部通过（DEV-021 基线 87/448，新增 2 文件/17 条，
  既有零回归，含未改动的 `machine.test.ts`/`visualResolution.test.ts`）

关键验证：真实 `valid-minimal` fixture 端到端——`createRuntimeMachine` 驱动至 `SCENE_ENTER`，
presentation 命令 `kind==='SCENE_ENTER'`、`characters` 与 `resolveCharacterPlacements` 返回值
逐字一致（`[{characterId:'npc-guide', slot:'CENTER', visible:true,
file:'assets/img/guide-smile.png', microAnimations:[]}]`），且 DEV-021 遗留
`visualSceneId:'vs-start'`/`layers` 仍在命令中；`resolveCharacterPlacements` 对省略 expression
回退 `defaultExpression:'neutral'` → `assets/img/guide-neutral.png`，四类缺失引用各自防御性跳过；
`composeCharacters` 五档 slot 映射/不可见过滤/animated 三态判定全过。

详细逐条验收证据见 `specs/dev/DEV-022/REPORT.md`（A01–A20），设计决策（五档 slot 百分比映射、
角色 z-index 固定高于背景层理由、微动效果只做通用呼吸不按名字区分的简化理由、三跳引用核实、
防御性处理、microAnimations 键缺席语义、测试落点、machine.ts import 行说明）见
`specs/dev/DEV-022/DECISIONS.md`（D1–D9，已随提交入库；`git_head=2909967...`）。
