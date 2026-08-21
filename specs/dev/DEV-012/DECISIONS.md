# DEV-012 DECISIONS

## D1 — 装饰器而不是改 action 代码

所有 Presentation 命令目前都在已冻结的 `machine.ts` action（`onSceneEnter`/`onOpen`/
`onResultPlaying`/`presLoading`/`presReady`/`presFailover`）内部直接调用
`context.ports.presentation.send(...)`。若在 action 内部改字面量结构会破坏"仅追加"纪律，且
具体 kind/payload schema 是 DEV-028/030 的职责。因此选择在 `Ports.presentation` 与真实
Renderer 之间加一层 `wrapPresentationPort` 装饰器：拦截每次 `send`，套 `commandSeq` 信封，再
转发；`machine.ts`/`presentationRegion.ts` 零改动（A14 由 git diff 验证）。

## D2 — `PresentationPort.onRendererHello?` 选可选字段

CR-012 要求的 `RENDERER_HELLO`/`REQUEST_RESYNC` 是入站信号，已冻结的 `PresentationPort`
只有出站 `send`，没有入站回调注册点。处置沿用 DEV-002A 对 `hostPublic.ts` SceneDisclosure
的先例：对冻结接口做唯一一次纯新增、**可选**字段。因为可选（`?:`），`noopPresentationPort`
常量字面量无需任何修改仍结构兼容（A07/A11）。只有**一个**入站回调而非 `onHello`/
`onResyncRequest` 两个，体现 CR-012"首次连接与重连走同一条路径"的原则——无论首连还是重连都
触发同一次全量 RESYNC。装饰器用 `inner.onRendererHello?.(...)` 安全接上，未提供的实现不抛错。

## D3 — 已知缺口：互动关闭无信号流向 Presentation

现有冻结的 action 集合里，`onOpen` 发 `INTERACTION_OPEN` 但没有对应的关闭事件流向
Presentation，因此 `PresentationState` 不追踪 `interactionOpen`——追踪一个只会变 `true`
不会变回 `false` 的字段没有意义。修它需要改冻结的 action 代码，超出本节点授权（Non-goals
第 4 条），如实记录，不假装解决。

## D4 — 状态是命令流的只读投影，不另存第二份真相

`getState()` 每次从内存中的已发送命令序列折叠出 `PresentationState`（事件溯源式的折叠），
没有独立维护的第二份状态副本；`commandSeq` 只由 `send` 路径自增。RESYNC 命令本身也走同一
`send` 路径，自然获得连续编号（A08/A10）。

## D5 — 与 DEV-028/030/060A/M4 的范围边界

信封内层 `command` 保持宽松 `unknown`，具体 kind/payload schema 是 DEV-028（Renderer
Shell/WebSocket）与 DEV-030（Audio 命令 schema）的职责；`commandSeq` 跳空检测是接收端/
DEV-020 Renderer Shell 的职责，本节点只保证发送端严格单调；Operator API 属 DEV-060A（M6），
平台（Twitch/YouTube/Bilibili）专用接口属 M4，`AudioPort` 不做同类扩展（DEV-032 的职责）。
本节点纯内存/纯函数，无网络传输、无新依赖。