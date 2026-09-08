# DEV-075 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-075 — Chapter Packager（M7 第六个节点）

## Objective

新建 `packages/chapter-packager`：三个交付物——(1) **资产文件存在性
校验**（CR-006 / PASS 7 Asset「文件存在性」原无归属，DAG.md 第 88 行
改归本节点）：对 `schemaResult.visuals.passed` 中带 `file` 字段的裸
`ImageAsset` 与 `schemaResult.audio.passed` 中带 `file` 字段的
`PREPRODUCED`/`PREGENERATED` 两变体逐一 `existsSync(resolve(rootDir,
file))`（rootDir-relative 解析是**假设**，非 spec 明文，同 `loader.ts`
先例，见 DECISIONS D5）；(2) **可达 `NarrativeBlock` id 计算**（CR-018
§4.4 第 313-319 行对本节点原文用「可达」——与 DEV-073/074 的「全部」
不同，可达性过滤在本节点是明确规定的职责）：Path A（`SceneNode
.interactionId?`/`BossPhase.interactionId` → `choices[].ruleId` →
`ActionDefinition.resultSetId` → `ResultDictionary.entries`，`mapsTo`
一跳同字典解析原样复用 `pass2ActionChain.ts` 既有语义 → `narrativeId`
→ `ResultNarrative` 五档 block 字段）+ Path B（`BossPhase
.narrationBlockIds?` 与 `EndingNode.narrationBlockIds` 直连字段）双
路径，只对 `reachability.reachable` 中的 id 生效；(3) **音频覆盖检查**：
`AudioAssetSchema`/`NarrativeBlockSchema` 均无绑定 NarrativeBlock 与
音频文件的字段（同 `DEV-074/DECISIONS.md` D4 已如实记录，未分配 DEV
编号、格式未定义），故接受调用方传入的 `NarrativeBlockAudioResult[]`
（DEV-074 冻结类型）为唯一输入，不扫描磁盘/不发明绑定格式。
`entryNodeId` 是真实必填 schema 字段（`ChapterManifestSchema.
entryNodeId`），经既有 `runPass3`（barrel 导出自
`@interactive-story/chapter-compiler`）内部真实读取，**不做**任何函数
的调用方参数（与 DEV-074 `voiceId` 不同，见 DECISIONS D4）。

## Allowed Scope

```
packages/chapter-packager/package.json                                        （新增）
packages/chapter-packager/tsconfig.json                                        （新增）
packages/chapter-packager/src/index.ts                                         （新增）
packages/chapter-packager/src/checkAssetFileExistence.ts                       （新增）
packages/chapter-packager/src/checkAssetFileExistence.test.ts                  （新增）
packages/chapter-packager/src/computeReachableNarrativeBlockIds.ts             （新增）
packages/chapter-packager/src/computeReachableNarrativeBlockIds.test.ts        （新增）
packages/chapter-packager/src/checkNarrativeBlockAudioCoverage.ts              （新增）
packages/chapter-packager/src/checkNarrativeBlockAudioCoverage.test.ts         （新增）
packages/chapter-packager/src/generateChapterPackagerReport.ts                 （新增）
packages/chapter-packager/src/generateChapterPackagerReport.test.ts            （新增）
tsconfig.json                                                                    （根，追加一条 references 条目）
pnpm-lock.yaml（自动生成的新增 importer 条目，含对 chapter-compiler 与
audio-production-queue 的 workspace 依赖——新增包被授权后 pnpm 工具链
的强制副作用，同 DEV-070 msg 0310 裁定）
specs/dev/DEV-075/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交；追加行放在历史消息表格
`---` 分隔符之前，不放文件末尾"当前待处理"表格之后）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/chapter-compiler/src/pass1Schema.ts、pass2ActionChain.ts、
pass3GraphModel.ts、pass3Reachability.ts、compile.ts、loader.ts（Read-only）
packages/chapter-schema/src/scene.ts、interaction.ts、action.ts、
result.ts、narrative.ts、boss.ts、endings.ts、manifest.ts、audio.ts（Read-only）
packages/audio-production-queue/src/runAudioProductionQueue.ts（Read-only，
仅取 `NarrativeBlockAudioResult` 类型，不复用其内部逻辑）
packages/chapter-compiler/test-fixtures/valid-minimal/**（Read-only）
```

## Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖除 @interactive-story/chapter-compiler、
@interactive-story/audio-production-queue 外的任何其他既有包
在包内部扫描磁盘/按文件命名约定猜测音频文件与 NarrativeBlock 的
绑定关系（音频覆盖检查必须以调用方传入的 NarrativeBlockAudioResult[]
为唯一输入，不得自行读目录/glob）
发明任何 Bundle/manifest 序列化格式或把打包结果写入任何新文件
发明 rootDir-relative 之外的任何资产路径解析约定
把 mapsTo 解析实现为不同于 pass2ActionChain.ts 既有一跳同字典
quality 匹配语义的任何其他算法
把 entryNodeId 做成任何函数的调用方参数（必须经 runPass3 内部真实
读取 schemaResult.manifest.passed.entryNodeId）
新增除以上两个既有包外的任何第三方/workspace 依赖
```

## Task Order

- [x] T001 节点文档（INDEX / REQUIREMENTS / ACCEPTANCE / DECISIONS / REPORT）
- [x] T002 四个源文件 + 四个测试文件 + 包骨架 + 根 `tsconfig.json` 引用 +
  全量验证（六条命令）+ `REPORT.md`/`DECISIONS.md` 填写 + commit +
  写入（不提交）LEDGER 追加行与 NODE_REPORT 消息文件

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行（历史
消息表格 `---` 分隔符之前）与 NODE_REPORT 消息文件已写入工作区但
**未提交**；工作区不得残留任何施工用临时文件。

## Next Node

由 Claude Commander 裁定。OpenCode 禁止自行推进下一 DEV Node。
