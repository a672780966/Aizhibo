---
seq: 0327
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-075
in_reply_to: "0326"
status: ISSUED
---

# TASK_PACKAGE — DEV-075 (Chapter Packager)

见 `specs/tasks/TASK-PACKAGE-DEV-075.md` 完整内容。

## Summary

M7 第六个节点。三个交付物：

1. **资产文件存在性校验**（CR-006，PASS 7 改归本节点）：对带
   `file` 字段的 `ImageAsset`/`AudioAsset` 两个变体逐一检查磁盘
   文件是否存在，rootDir-relative 路径解析（假设，非 spec 明文，
   同 `loader.ts` 先例）。
2. **可达 `NarrativeBlock` id 计算**（CR-018 §4.4 对本节点原文用
   "可达"，与 DEV-073/074 不同——那两个节点的 CR-018 原文用"全部"，
   均裁定不做过滤；本节点是真实规定的职责，不是发明）：两条独立
   路径缺一不可——Path A（`SceneNode`/`BossPhase.interactionId`
   →`choices[].ruleId`→`ActionDefinition.resultSetId`→
   `ResultDictionary.entries`，`mapsTo` 一跳同字典查找复用既有
   `pass2ActionChain.ts` 语义，不发明新解析→`ResultNarrative`
   五档 block 字段）与 Path B（`BossPhase.narrationBlockIds?`/
   `EndingNode.narrationBlockIds` 直连字段，绕过互动链）。两条
   路径都只对 `reachability.reachable` 中的 id 生效。
3. **音频覆盖检查**：`AudioAssetSchema`/`NarrativeBlockSchema`
   均无字段绑定 NarrativeBlock 与音频文件（同 `DEV-074/DECISIONS.md`
   D4 已如实记录），故接受调用方传入的 `NarrativeBlockAudioResult[]`
   （DEV-074 冻结类型）为唯一输入，不扫描磁盘/不发明 manifest 格式。

`entryNodeId` 是真实必填 schema 字段
（`ChapterManifestSchema.entryNodeId`），经既有 `runPass3`（barrel
导出自 `@interactive-story/chapter-compiler`）内部真实读取，**不**
做任何函数的调用方参数——与 DEV-074 的 `voiceId`（真的没有对应
schema 字段）不是同一种情况，不要混淆处置。

恰两项 workspace 依赖：`@interactive-story/chapter-compiler`、
`@interactive-story/audio-production-queue`。不产出任何 Bundle/
manifest 文件（Dev Spec 全篇未定义"打包"产出格式，超出本节点职责）。

## Scope

见 Task Package 第 3 节。新建 `packages/chapter-packager`。

## Definition of Done

见 Task Package 第 7 节：六条命令全绿 + 26 项 Acceptance + 节点
文档齐全 + LEDGER/NODE_REPORT 写入不提交。

## 下一步

OpenCode 执行 T001–T002，完成后回复 NODE_REPORT，转 AUDITOR。
