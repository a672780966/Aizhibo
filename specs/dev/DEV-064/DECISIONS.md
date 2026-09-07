# DEV-064 DECISIONS

本文件记录 DEV-064（OBS Control，M6 第五个节点）施工中做出并落库
的决策。Task Package 第 6 节要求覆盖五个"为何"要点，逐条以真实
理由说明如下。

## D1 — 为何建真实的 OBS WebSocket v5 客户端，而不是接口 + noop 占位

USER 2026-09-08 的裁决与 DEV-040/041 的先例是同一个判断：**当一个
外部集成目标的协议是具体、稳定、有公开文档的，就建真实客户端；
只有当协议本身未指定（像 DEV-056 的 Host LLM Provider——Dev Spec
没说是哪家厂商、哪个协议）才退回接口 + noop 占位。**

OBS WebSocket v5（`obs-websocket` 5.x）正是前者：它是公开的、版本
化的、逐帧规定好的外部规范——Op 0 Hello / Op 1 Identify / Op 2
Identified 握手、可选 SHA256 挑战-响应鉴权（
`base64(sha256(base64(sha256(password + salt)) + challenge))`）、
Op 6 Request / Op 7 RequestResponse 的 requestId 关联，全部有官方
文档可查，不存在"今天不知道明天要接谁"的不确定性。这跟 DEV-040
（Twitch OAuth，协议是公开的 OAuth2 授权码流）、DEV-041
（EventSub WebSocket，协议是公开的 Twitch EventSub 帧规范）走的
是同一条路：**外部协议确定了，客户端就值得写真的**，因为它的每一
行都是对一份稳定规范的直接翻译，不是对未来需求的猜测。

反过来，如果本节点也像 DEV-056 那样只交一个接口加一个"恒定诚实
失败"的 noop，等于把"怎么跟 OBS 说话"这份已知的翻译工作推给未来
的集成节点重做一遍——那时 DEV-065 需要切场景，却要先去发明一套
握手与鉴权。协议已知却不实现，才是真正的浪费。

同时，真实客户端的测试性没有被牺牲：`webSocketImpl` 注入字段 + 
测试专用 devDependency `ws` 让测试用假 OBS server 完整演练
Hello/Identify/Identified 与 Request/RequestResponse，不需要任何
真实 OBS 实例（同 DEV-041 注入式 WebSocket 实现的先例）。

## D2 — 为何零自动重连逻辑

不做重连不是遗漏，是边界划分的结果。DAG.md 第 403 行 + CR-020 已
明确：**"什么时候该重连 OBS 控制连接 / 什么时候该 failover"的决策
权全部在未来的 SAFETY region（DEV-065）**，OBS 与 PRESENTATION
都是执行端。

"该不该重连、什么时候重连、重试几次、退避多久"本身就是一个决策：
它假设了"断线应当被自动恢复"这个目标。但 OBS 控制连接断开后是否
值得恢复，取决于当时整个系统的状态——是不是正在 failover、主播
端是否还活着、下次重试会不会撞上另一个恢复动作——这些信息本节点
（一个纯执行客户端）一概没有。自己发明一套重连策略，就是在没有
决策上下文的地方替 SAFETY region 做决策，正好踩中 CR-020 划出的
边界。这与 DEV-045（Twitch 断线重连）不同：DEV-045 的重连目标是
明确且单一的（保住聊天连接本身，第 56 节 L3 也把它算作
ALREADY_HANDLED 的既有机制），而 OBS 控制连接"该不该恢复"没有
独立目标，混在 failover 决策里。

所以本客户端的语义是：`createObsControlProvider` 内部发起**恰好一
次**共享的"就绪"Promise（连接 + 握手 + 鉴权都在这一次内完成），
它被 eager 启动、被所有 `switchScene`/`getHealth` 共享；一旦握手
失败它就**永久 rejected**。之后的每一次调用都会收到同一个诚实的
失败原因（超时/拒绝），直到调用方创建一个新的 provider 实例——
重连/重建实例的决定权同样留给 DEV-065。

## D3 — 为何零"何时该切场景"的判断逻辑

`switchScene(scene)` 是一个**纯请求转发原语**：把
`SetCurrentProgramScene` 这个 op 6 请求发给 OBS，按 requestId 等
回 op 7，把 `requestStatus` 翻译成 `{ok:true}` 或
`{ok:false, reason}`。它不判断当前该不该切、不维护"当前场景"状态
机、不读任何系统状态来推断"现在是不是该切到 RECONNECTING"。

"何时切"是需要全局上下文的决策——此刻 runtime 处于什么阶段、哪
条链路断了、failover 该走哪条路径——这些只存在于未来的 SAFETY
region（DEV-065）里。本节点（DEV-064）与 DEV-065 的分工在 DAG.md
第 402-403 行写得很清楚：DEV-064 是"怎么跟 OBS 说话"的执行层，
DEV-065 是"什么时候让 OBS 说话"的决策层。把判断塞进本节点，等于
在纯执行端预支决策权，会让 DEV-065 无法独立裁决 failover。六个封
闭场景（BOOT/LIVE/RECONNECTING/MAINTENANCE/ERROR/ENDING，Dev
Spec 第 49 节原文）在本节点只是 `ObsScene` 字面量类型——可以被
调用、可以被转发，但没有任何一个值被本节点自己"决定"去调用。

## D4 — 为何生产代码零依赖（只用 `node:crypto` + 原生全局 WebSocket）

鉴权计算是官方算法规定的两步 SHA256 + 两次 base64——Node 内置的
`node:crypto` 的 `createHash('sha256')` 就是干这个的，第三方的
crypto 库（bcrypt 等）不仅多余，还引入了与官方算法不一致的风险
面。WebSocket 客户端同理：Node ≥22 自带原生全局 `WebSocket`
（浏览器同款 API），一个 `new WebSocket(url)` + `message`/`error`/
`close` 事件监听就覆盖了整个协议需求，没有理由为它拉一个 npm
依赖（同 DEV-041 `eventSubClient.ts` 对原生 WebSocket 的使用先例，
本仓库 engines 已声明 `node: >=22`）。

生产代码因此只有两条 import：`node:crypto` 与同包的
`./obsControlPort.js`（类型 + noop 单例），`dependencies` 字段在
`package.json` 中整体省略——延续仓库零依赖包的既有惯例
（error-registry/audio-engine/shared/platform-core 等均无该字段，
DEV-063 同款）。零依赖意味着零传递漏洞面、零版本协商，且新包不会
进任何下游的依赖解析图。

## D5 — 为何 `ws`/`@types/ws` 只作为 devDependencies 出现

这两个包的唯一用途是**在测试里起一个假 OBS server**：
`WebSocketServer`（`{port: 0}` 随机端口）扮演 OBS 端，按协议脚本
收发 Hello/Identify/Identified/Request/RequestResponse 帧，让测试
无需任何真实 OBS 实例就能完整验证握手、鉴权、请求关联与全部失败
路径。它们写在 `package.json` 的 `devDependencies`（版本对齐
`apps/renderer` 已有用法，`ws@^8.21.3` / `@types/ws@^8.18.1`），
`pnpm install` 只为开发/测试安装，**不进 `dependencies`，不参与
`dist/` 构建产物，绝不出现在任何生产运行路径**——生产代码（D4）
从 import 层面就保证碰不到它们。版本对齐是刻意的：仓库里
`apps/renderer` 已在用同版本 ws 起真实端口测试（DEV-012
`wsServer.test.ts` 先例），测试基建无需第二套版本。

## D6 — 为何每条连接与每个请求都有显式超时

真实世界里任何一端都可能不回应：OBS 没开、端口黑洞、鉴权后服务端
静默、请求发出后服务端宕机。没有超时的 Promise 会无限悬挂，把"对
方没回应"变成"本进程永久卡死"。因此本节点给每一个可能等待的点都
上了显式超时：

- 连接 + 握手（Hello 到 Identified）共用一个 `connectTimeoutMs`
  （默认 5000ms，测试传短值）——覆盖连接建立失败与"服务端要求鉴
  权后不再理你"两类静默；
- 每个 op 6 请求各带独立的 `requestTimeoutMs`（默认 5000ms，测试
  传 50ms）——覆盖"握手成功但请求石沉大海"。

两条超时一旦触发都会从 pending 表清理并 settle 对应 Promise，绝不
double-resolve/double-reject（settled 标志 + 每个 pending entry 的
resolve/reject 包装都先清自己的定时器）。结果是没有一条调用路径
能无限期悬挂，无论真 OBS 还是假 server 做什么或不做什么——这正是
测试里"错误密码 / 需要鉴权但未配置密码 / 请求不回复 / 端口不存在"
四类场景能在几百毫秒内诚实收尾、而不是等默认 5 秒或永远等下去的
原因。诚实失败永远比悬挂好：悬挂是 bug，`{ok:false, reason}` 是
可被 DEV-065 消费的信号。
