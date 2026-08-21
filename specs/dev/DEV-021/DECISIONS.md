# DEV-021 DECISIONS

## D1 — 为什么对冻结的 `onSceneEnter` 发 CR 而不是追加式扩展

「追加式扩展」在此处不够用。`SCENE_ENTER` 命令由 `onSceneEnter` action（DEV-009 冻结）
内部生成，载荷从占位 `{ kind, sceneId }` 丰富为真实 `visualSceneId` + `layers`，必须修改
该 action 的内部逻辑。按 Dev Spec「Renderer 不维护剧情」原则（第 35 节），这条
`visualSceneId → VisualScene → layers → ImageAsset.file` 解析链不能放在
`apps/renderer`（Renderer 不读章节文件、不查内容数据）——Runtime（`machine.ts` 的
`onSceneEnter`，本来就持有 `context.compiled`）是唯一正确位置。这是 `DAG.md` 全局约束
#4 允许的下游 Change Request 机制，为继 DEV-007/010/011/012 四次纯追加扩展之后第一次对
既有 action 内部逻辑的授权修改。

## D2 — 向后兼容性核实结果：不需要改动任何既有测试

逐一核对全部既有测试文件（`machine.test.ts`/`presentationCommand.test.ts`/
`storyRegion.test.ts`/`snapshot.test.ts`）里所有引用 `'SCENE_ENTER'` 字符串的断言：
全部只检查 `kind`/`storyPhase` 是否等于该字符串，**不依赖完整 payload 形状**——audit 核
实证据：

- `machine.test.ts` 第 166/167 行：`presentation.some((c) => c.kind === 'SCENE_ENTER')` /
  `audio.some(...)`——只检查 kind 存在；
- `presentationCommand.test.ts`、`storyRegion.test.ts`、`snapshot.test.ts` 对
  `'SCENE_ENTER'` 的引用均只比较 `kind` 字符串或阶段名（如 `storyPhase === 'SCENE_ENTER'`），
  不构造也不断言完整命令载荷。

因此本次 CR 向后兼容，**不修改任何既有测试文件**（`machine.test.ts` 保持 Read-only）。
新行为的端到端验证全部落在本节点新增的 `visualResolution.test.ts` 内。

## D3 — 已知诚实缺口：图片暂时加载不出来

`ResolvedVisualLayer.file` 是 Chapter Pack 内相对路径（如 `assets/img/forest.png`）。
当前没有任何静态资源服务器把它变成可加载的 URL——那是 DEV-075 Chapter Packager / 部署
管线的职责。因此本节点验证的是**布局与命令数据的正确性**（`layers` 载荷、`z` 排序、
`<img src={file}>` 结构），不是"图片真的显示出来"。不假装解决资源服务问题，如实记录；
`<img>` 渲染在当前阶段对无 `file` 的浏览器请求返回 404/空白是预期行为。

## D4 — parallax 数值透传但不做动画的理由

`parallax` 是视差**系数**，真正的镜头/视差运动（根据鼠标/观众移动计算位移）是
DEV-026 Camera/Transition 的职责。本节点在 `ResolvedVisualLayer` → `RenderableLayer`
中**原样传递** parallax（未提供时不出现该键，`exactOptionalPropertyTypes` 一致性），
保证数据不丢、下游节点有完整输入；不做任何视差动画计算，避免越界实现后续节点内容。

## D5 — `resolveVisualLayers` 的防御性处理

PASS2 引用完整性理论上已保证 `visualSceneId → layer.assetId → ImageAsset` 引用有效，
但按 Task Package 第 2.3 节要求仍写防御：找不到 `VisualScene` 返回 `[]`；某个 `layer`
找不到对应 `ImageAsset` 时**跳过该层**（不抛异常，不中断其余层的渲染）。实现用
`'layers' in value` / `'file' in value` 结构区分 `VisualScene` 与 `ImageAsset`（两者与
`CharacterAsset` 混在同一 `schemaResult.visuals.passed` 集合里，沿用 DEV-002 的既有判别
方式）。

## D6 — `composeLayers` 的排序语义

按 `z` 升序排序（底层先渲染），`z` 相同保持输入顺序（ES2019+ 规范保证 `Array.prototype
.sort` 稳定）；`zIndex` 映射自 `z`；不修改输入数组（先拷贝再排序）。

## D7 — 端到端验证放在 `visualResolution.test.ts`

T003 的 Allowed Files 只有 `machine.ts` 一个文件，CR 后的端到端行为验证（A09：驱动
`valid-minimal` 到 `SCENE_ENTER`，断言 presentation 命令含 `visualSceneId: 'vs-start'`、
`layers` 与 `resolveVisualLayers` 返回值一致）落在本节点新增的 `visualResolution.test.ts`
内——与 DEV-020 的 T005 先例一致（服务端半集成测试落在其 Allowed Files 的
`wsServer.test.ts`），不改动 Read-only 的 `machine.test.ts`。

## D8 — `machine.ts` 的 import 行：CR 的必要组成部分

第 2.2 节授权的 `onSceneEnter` 改动调用了新文件 `visualResolution.ts` 导出的
`resolveVisualLayers`，`machine.ts` 因此新增恰好 1 行 import（`import { resolveVisualLayers }
from './visualResolution.js';`）。这行不在 action 内部，但调用新函数必须导入，属 CR 的直接
附属；`machine.ts` 的 git diff 严格限于这 1 行 + `onSceneEnter` action 内部，其余全部内容
（其它 action、guards、`RootEvent`、`RuntimeContext`、`makeRuntimeMachine` 结构）逐字节
不变，可在 A08 的 diff 中逐行核对。