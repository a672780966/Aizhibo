# DEV-075 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-075.md` 逐字抄录关键要求。
权威版本是 Task Package，不是本副本（协议 §1.4）。

1. 新建 `packages/chapter-packager`，恰两个 workspace 依赖：
   `@interactive-story/chapter-compiler`、
   `@interactive-story/audio-production-queue`，无第三方依赖。
2. `src/checkAssetFileExistence.ts`：纯函数 `checkAssetFileExistence
   (schemaResult: SchemaValidationResult, rootDir: string):
   AssetFileExistenceResult[]`——遍历 `schemaResult.visuals.passed`
   （`VisualScene`/`ImageAsset`/`CharacterAsset` 混合联合类型，同
   DEV-073 `extractAssetRequirements.ts` 手法）用 `'file' in value` 只
   挑出裸 `ImageAsset`；遍历 `schemaResult.audio.passed`
   （`PREPRODUCED`/`PREGENERATED`/`RUNTIME_TTS` 三变体联合）同样用
   `'file' in value` 只挑出带 `file` 的两变体。对每个挑中的资产
   `existsSync(resolve(rootDir, value.file))` 产出
   `{assetId, file, exists}`；`.failed` 忽略不抛错；结果按 `assetId`
   字典序排序。路径解析约定是**本节点自行做出的假设**（Dev Spec/CR
   未定义 `file` 相对哪个根目录），采用与 `loader.ts` 加载 Chapter
   Pack 相同的"相对 rootDir"约定，措辞为"假设"写入 DECISIONS.md。
3. `src/computeReachableNarrativeBlockIds.ts`：纯函数
   `computeReachableNarrativeBlockIds(schemaResult, graphModel,
   reachability): Set<string>`，实现须精确对应 Path A + Path B 两条
   独立链路，不得遗漏 `BossPhase` 同时具备两条路径这一点：
   - Path A（互动链）：对 `reachability.reachable` 中每个
     `graphModel.nodes.get(id) === 'SCENE'` 的 id，取对应
     `SceneNode.interactionId`（可选）；每个 `=== 'BOSS'` 的 id，取
     对应 `BossNode.phases[]` 里每个 `BossPhase.interactionId`（必填）
     ——都经 `InteractionNode.choices[].ruleId → ActionDefinition
     .resultSetId → ResultDictionary` 到
     `ResultDictionary.entries[]`，`mapsTo` 条目按 `quality` 在**同一
     个** entries 数组内只跳一跳查目标（原样复用 `pass2ActionChain.ts`
     已实现并验证过的一跳同字典语义，不得另行发明），`unreachable:
     true` 条目跳过，然后按 `narrativeId` → `ResultNarrative` 收集
     `primaryBlockId`/`supportBlockIds?`/`urgencyBlockId?`/
     `transitionBlockId?`/`prefixBlockId?` 五档 block 字段。
   - Path B（直连字段）：对每个可达 `BOSS` id 的
     `boss.phases[].narrationBlockIds ?? []`，以及每个可达 `ENDING`
     id 的 `EndingNode.narrationBlockIds`（必填），直接 `blockIds.add`
     收集，不经过任何互动链。
   - 两条路径都只对 `reachability.reachable` 里的 id 生效。
4. `src/checkNarrativeBlockAudioCoverage.ts`：纯函数
   `checkNarrativeBlockAudioCoverage(reachableBlockIds: Set<string>,
   audioResults: NarrativeBlockAudioResult[]):
   NarrativeBlockAudioCoverageResult[]`——对 `reachableBlockIds`（按 id
   字典序遍历）逐一判断 `covered = audioResults.some((r) => r.blockId
   === id && r.ok === true)`；**不**扫描磁盘、**不**按命名约定猜测——
   `audioResults` 由调用方提供（例如某次真实
   `generateAudioProductionQueue` 调用的返回值）是唯一输入源。
5. `src/generateChapterPackagerReport.ts`：薄封装，串联真实
   `loadChapterPack`/`runSchemaValidation`/`runPass3`（同 DEV-073/074
   手法），`entryNodeId` 经既有 `runPass3` 内部真实读取
   `schemaResult.manifest.passed.entryNodeId`，**不**做成任何函数的
   调用方参数。返回 `{ assetFileExistence,
   narrativeBlockAudioCoverage }` 内存校验报告结构体。
6. `src/index.ts` barrel（四个源文件四行 export）。
7. **不产出任何 Bundle/manifest 文件、不落盘任何打包产物**（Dev Spec
   全篇只给"Chapter Packager"标题、从未有正文定义"打包"要产出什么
   文件——发明格式超出本节点职责）。
8. 节点文档（INDEX/REQUIREMENTS/ACCEPTANCE/DECISIONS/REPORT）齐全，
   INDEX T001–T002 勾选、Status = READY_FOR_REVIEW；六条验证命令全部
   退出码 0、零回归；LEDGER 追加行置于历史消息表格 `---` 分隔符之前，
   NODE_REPORT 消息文件 seq 0328、from OPENCODE、to AUDITOR，二者写入
   但不提交。
9. 详见 Task Package 第 1、2、6、12 节。
