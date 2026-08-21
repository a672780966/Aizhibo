# DEV-022 DECISIONS

## D1 — 五档 slot → leftPercent 固定映射

ADDENDUM-001 §A9 / D06 已冻结「固定五档 slot、同屏上限 5 角色」产品决策。`composeCharacters`
（`apps/renderer/src/render/composeCharacters.ts`）把 `slot` 一对一映射到水平位置百分比，
五档等距：

```
LEFT: 10, CENTER_LEFT: 30, CENTER: 50, CENTER_RIGHT: 70, RIGHT: 90
```

收口在唯一的 `SLOT_LEFT_PERCENT` 查找表里，一处修改即整链生效。本节点不做自由坐标定位、不
做超过 5 个角色的特殊处理——`SceneNode.characters` 来自已编译数据（PASS1/2 已保证合法性），
同屏上限 5 由内容合规保证，不需要额外防御（Task Package §10 Non-goals 明确列出）。

## D2 — 角色 z-index 固定高于所有背景层

角色必须永远画在场景层之上（D06 的产品直觉：角色是前景主体，背景 `visuals` 层是衬托）。
渲染时角色 `<img>` 统一 `zIndex: 1000`，高出 DEV-021 `composeLayers` 按真实 `z` 映射的背景
层任意值，从而无需与具体背景 z 值耦合比较——只要背景层的 z 不超过 1000，角色就一定在上。
后续若引入镜头/视差（DEV-026）或前景遮挡需求，再在彼时调整该常数；本节点不做预言，只在
`App.tsx` 里以注释标明理由。

## D3 — 微动效果只做通用呼吸、不按具体动画名区分

`microAnimations` 目前只有名字列表（如 `["breathe"]`），没有任何真实动画资产/骨骼数据
（内容工厂 M7 尚未产出）。Name-driven 微动画（不同名字对应不同动作参数）没有资产可驱动，
若现在假装支持就是无真实输入的欺骗性实现。因此本节点：

- `composeCharacters` 只输出布尔 `animated = (microAnimations?.length ?? 0) > 0`；
- Renderer 对 `animated === true` 一律套用一种通用 CSS `@keyframes breathe`（`transform:
  scale(1) ↔ scale(1.04)`，3s ease-in-out infinite），不检查动画名。

真正按名字区分微动效果，留给有真实动画资产定义时再做（如实记入 REPORT Future Considerations
与 Task Package §10 Non-goals）。本节点验证的是「有微动画声明就套呼吸、没有就不套」这条逻辑
的正确性，不假装支持任意命名的动画。

## D4 — 三跳引用核实（T002 关键风险点）

任务包 2.1 节标注本节点最易踩坑处：核对 `chapter-schema/npc.ts` 与真实 `valid-minimal`
fixture 后确认 `CharacterPlacement.characterId` 是**三跳引用**，不是直接指向 `CharacterAsset`：

```
characterId         → NPCDefinition.id           （compiled.schemaResult.npc.passed）
characterAssetId    → CharacterAsset.id          （schemaResult.visuals.passed，'expressions' in value）
expressions[key]    → ImageAsset.id              （schemaResult.visuals.passed，'file' in value）
file                → 实际文件路径
```

真实数据链逐跳核实通过：`scene-start.characters[0].characterId='npc-guide'` →
`npc/npc-guide.json.characterAssetId='char-guide'` → `visuals/char-guide.json`（
`expressions:{smile:'img-guide-smile',neutral:'img-guide-neutral'}`,
`defaultExpression:'neutral'`）→ `visuals/img-guide-smile.json.file`。实现严格按此顺序第一跳查
`npc.passed`；`characterId` 在 `visuals.passed` 找不到匹配项是正常现象，不是缺陷。

## D5 — `resolveCharacterPlacements` 的防御性处理

PASS2 引用完整性理论上已保证每跳有效，但按 Task Package 2.3 节要求仍写防御（与
`resolveVisualLayers` 同一原则）：对每个 `placement`，任何一跳找不到——`NPCDefinition`、
`CharacterAsset`、`expressionKey` 不在 `expressions` 里、或 `ImageAsset`——**跳过该角色**，
不抛异常、不中断其余角色解析。实现沿用 `'expressions' in value` / `'file' in value` 结构判别
（`VisualScene`/`CharacterAsset`/`ImageAsset` 混在同一 `visuals.passed` 集合，沿用 DEV-002 既
有判别方式）。`visible` 在原样透传保留，不在本层过滤——是否绘制交给 Renderer 侧决定（2.4 节）。

## D6 — microAnimations 键的缺席语义

`CharacterAsset.microAnimations` 是可选字段。当它**存在**（包括空数组 `[]`，如 fixture 的
`char-guide`）时原样透传进 `ResolvedCharacterPlacement.microAnimations`；当它**缺席**时结果
对象不含该键（与 DEV-021 parallax 的 `exactOptionalPropertyTypes` 一致性先例一致）。测试分别
覆盖「存在且非空 / 存在但为空 / 缺席」三种情形（`composeCharacters` 的 `animated` 判定与
`resolveCharacterPlacements` 的键缺席各有断言）。

## D7 — 端到端验证落在 `characterResolution.test.ts`

T003 的 Allowed Files 只有 `machine.ts` 一个文件，CR #2 后的端到端行为验证（A09：驱动
`valid-minimal` 到 `SCENE_ENTER`，断言命令含 `characters` 且与 `resolveCharacterPlacements`
返回值一致）落在本节点新增的 `characterResolution.test.ts` 内——与 DEV-021 的 D7 先例一致
（端到端落在新增授权测试文件，不改动 Read-only 的 `machine.test.ts`）。同时在该断言里复核
DEV-021 遗留的 `visualSceneId`/`layers` 仍在命令中，证明 CR 只追加、不改既有字段。

## D8 — `machine.ts` 的 import 行：CR #2 的必要组成部分

第 2.2 节授权的 `onSceneEnter` 改动调用了新文件 `characterResolution.ts` 导出的
`resolveCharacterPlacements`，`machine.ts` 因此新增恰好 1 行 import。这行不在 action 内部，
但调用新函数必须导入，属 CR 的直接附属（与 DEV-021 D8 完全一致）。`machine.ts` 的 git diff
严格限于这 1 行 + `onSceneEnter` 内新增两处（`characters` 局部变量 + `send` 参数追加
`characters,`），DEV-021 遗留的 `scene`/`layers` 计算、`audio.send`、`storyMove` 返回及其余
全部 action 逐字节不变，可在 A08 的 diff 中逐行核对。

## D9 — `index.ts` 仅追加、`App.tsx` 仅追加、测试落点

`index.ts` 在文件末尾追加 2 行导出（`resolveCharacterPlacements` + 类型），只增不删。`App.tsx`
纯新增——`import` 行重写为多行以并入新类型导入、新增 `pickSceneCharacters` 纯函数、渲染区新增
角色 `<img>` 组与内联 `@keyframes breathe` CSS，DEV-020/021 既有 HELLO/调试列表/场景层逻辑
逐字保留（A12）。T006 的 `pickSceneCharacters` 纯逻辑测试放在 `composeCharacters.test.ts`
（Writable Scope 内唯一授权的测试文件），`App.test.ts` 保持零改动（DEV-021 D7 同款先例）；
不做 DOM 渲染测试（DEV-020/021 先例）。
