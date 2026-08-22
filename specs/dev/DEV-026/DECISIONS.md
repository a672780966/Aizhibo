# DEV-026 DECISIONS

## D1 — 不修改 `resolveVisualLayers`（DEV-021 冻结）

`resolveCameraPreset` 与 `resolveVisualLayers` 都要先在
`schemaResult.visuals.passed` 里找到 `id === visualSceneId && 'layers' in value` 的
`VisualScene` 条目——存在约三行重复查找。**故意不合并**：保持每个函数单一职责、不
打开一个已冻结函数（DEV-021）的返回值形状（给 `ResolvedVisualLayer[]` 塞一个
`cameraPreset` 会是破坏性接口变更），比省一次查找更重要。这是任务包第 2.2 节明示的
决策，照章实施。

## D2 — 转场不新增 schema 字段

核对全部 `chapter-schema` 源码后确认**不存在**"转场预设"字段；`cameraPreset` 是
唯一与"镜头"相关的字段。处置：转场不是章节作者可配置的数据，而是 Renderer 每次收到
新场景（`SCENE_ENTER`，`sceneId` 变化）时统一套用的**一种**内置过渡效果（CSS
`@keyframes fadeIn`）。不新增 schema 字段、不需要额外的 CR 传递"用哪种转场"——这是
"不做镜头 DSL"精神的延伸：转场效果本身也不该被过度参数化。若未来需要多种转场类型，
那是新的产品决策，走 CHANGE_REQUEST，不由本节点发明。

## D3 — preset → CSS 映射表内容与"未收录预设安全回退"

内置小映射表（本节点唯一收录的两个键）：

| preset 键 | transform |
|---|---|
| `closeup` | `scale(1.15)` |
| `wide` | `scale(0.9)` |
| 其他一切（含 `undefined`、空串、未来新键） | `scale(1)` |

任务包第 2.3 节明确：`undefined` 或**任何未收录的字符串**一律回退到 `scale(1)`（安全
默认值，不抛异常）。理由：章节作者未来可能用到映射表暂未收录的新预设名（schema
`z.string().optional()` 不限取值），防御性处理是必需的而非可选的。新增 preset 键是
`PRESET_TRANSFORMS` 的纯增量扩展，不改任何接口。

## D4 — `pickCameraPreset` 的"最新场景"语义：无 preset 的新场景复位为 `undefined`

渲染器侧 `pickCameraPreset` 对每一条 `SCENE_ENTER` 都会更新 preset：当次载荷
`cameraPreset` 为字符串则取它，非字符串/缺失则置为 `undefined`。这样"上一场景是
`closeup`、新场景未设置 preset"时镜头恢复中性 `scale(1)`，不会把旧场景的镜头残留到
新场景（否则与 `pickSceneEnterKey` 的"最新一条 SCENE_ENTER 为准"语义不一致）。

## D5 — `key` 触发重挂载 = 转场状态机

场景切换时的淡入过渡不引入任何过渡状态机：`pickSceneEnterKey` 取最近一条
`SCENE_ENTER` 的 `commandSeq` 作为场景容器 React 元素的 `key`——`key` 变化触发 React
重新挂载该元素，天然重放一次 CSS `@keyframes fadeIn`。命令流不重放时（同场景内新增
其他命令）`key` 不变，不会重复淡入。零新依赖、零状态机。

## D6 — 渲染器不读章节文件（CR-008 纪律延续）

`pickCameraPreset`/`pickSceneEnterKey` 只从已接收的 `PresentationCommand[]` 挑选
数据；preset 键本身就是展示信息（字符串），由 Runtime 侧 `resolveCameraPreset` 在
`onSceneEnter` 中解析完毕后随 `SCENE_ENTER` 下发，渲染器不接触章节文件/`WorldState`。
未收录键由 `resolveCameraPresetStyle` 兜底（D3），整个链路无异常路径。