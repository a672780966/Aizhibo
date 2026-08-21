---
msg_id: "0106"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-022
created_at: 2026-08-21
requires_response: true
---

# TASK_PACKAGE — DEV-022

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-022.md`

## 前置状态

DEV-021 已 `DONE`（接口冻结）。本节点是 M2 第三个节点，第二次对 `onSceneEnter` 发窄
范围 CR（延续 DEV-021 建立的模式）。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-022.md`——**第 2.1 节务必先读**：核对
   `chapter-schema/npc.ts` 与真实 fixture 后发现 `CharacterPlacement.characterId`
   是**三跳引用**（`characterId → NPCDefinition.characterAssetId → CharacterAsset →
   ImageAsset`），不是直接指向 `CharacterAsset`。这是本任务包与其它同类节点相比容易
   踩坑的地方，严格按第 2.3 节的解析顺序实现，不要假设两跳。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

只做角色站位渲染（固定五档 slot，ADDENDUM §A9/D06 已冻结产品决策）+ 通用呼吸类微动
效果（不按具体动画名区分，无真实动画资产支撑）。不做字幕/选择/骰子/镜头动画。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库；本节点需要记录五档 slot 百分比映射、角色
z-index 固定高于背景层的理由、微动效果简化理由。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
