# DEV-060A DECISIONS

本文件记录 DEV-060A（Operator API，M6 第一个/优先节点）执行过程中的
工程决策与依据。权威范围依据：`specs/tasks/TASK-PACKAGE-DEV-060A.md`
第 6 节、Dev Spec V1.0 第 1899-1951 行（第 53-54 节）、CR-013
（`specs/dev/DAG.md` 第 398 行 / `specs/audit/SPEC-AUDIT-001.md`
第 361 行）、USER 2026-09-07 裁决（11 个 action 中 8 个目标子系统
不存在，不发 CR、诚实占位）。

## D1：不发 CR 改冻结的 runtime-kernel，8 个未接通 action 诚实占位

- **决策**：`PAUSE`/`RESUME`/`CLOSE_INTERACTION`/`FORCE_RESOLVE`/
  `REPLAY_CURRENT_AUDIO`/`RESTART_SCENE`/`SWITCH_OBS_FAILOVER`/
  `EMERGENCY_STOP` 这 8 个 action 的 dispatch 一律返回 `ok:false` +
  各自**点名具体原因**的 `detail`，不假装生效、不产生任何真实副作用；
  其中 6 个（PAUSE/RESUME/CLOSE_INTERACTION/FORCE_RESOLVE/
  REPLAY_CURRENT_AUDIO/RESTART_SCENE）的原因明确写
  "requires a new <ACTION> RootEvent on the frozen runtime-kernel machine;
  deferred pending future CR"，SWITCH_OBS_FAILOVER 写 "OBS integration
  not yet built (planned DEV-064/DEV-065)"，EMERGENCY_STOP 写 "SAFETY
  region not yet built beyond placeholder (planned DEV-063/DEV-067)"。
- **依据**：runtime-kernel 的状态机当前冻结（M 系列里程碑冻结纪律），
  `RootEvent` 联合类型里没有对应事件变体（`packages/runtime-kernel/src/
  machine.ts`），OBS 与 SAFETY 子系统尚不存在或只是占位
  （`placeholderRegions.ts` 的 `safetyRegion`）。要真接通这些 action 必须
  先改冻结的 runtime-kernel 或新建目标子系统，那属于需要窄范围 CR 的
  未来工作。USER 2026-09-07 已明确裁决：不发 CR、诚实占位——占位原因
  逐条点名而不是笼统一句，是"诚实"的可审计形态（A12 靠它区分 8 个
  action 不是共享同一句通用文案）。等真正需要某个 action 时再针对它发
  窄范围 CR，而非现在一次开 8 条战线。

## D2：OPERATOR_OVERRIDE 对全部 11 个 action 无条件记录

- **决策**：`dispatchOperatorAction` 先跑语义分发（`runAction`），随后
  **无论 `ok:true` 还是 `ok:false`** 都无条件追加一条 `OPERATOR_OVERRIDE`
  持久化事件；`detail` 用语义分发返回的真实 detail（占位时即占位原因）。
- **依据**：审计记录的对象是"Operator 的一次操作意图/尝试"，不是
  "一次成功的状态变更"。被占位拒绝的 8 个 action 恰恰是最需要留痕的
  人工干预——证明有人试图 EMERGENCY_STOP / SWITCH_OBS_FAILOVER 而被拒，
  与证明一次 MUTE_HOST 真实生效，对事后审计同样重要。若只在 ok:true 时
  记录，8 个占位 action 会静默消失于审计日志，Operator 面板上"点了没
  反应"将无从追责。Dev Spec 第 54 节的审计纪律覆盖"尝试执行"本身。

## D3：直接构造 RuntimeEvent + appendEvents 旁路，不新增 RootEvent 变体

- **决策**：`appendOperatorOverrideEvent` 读取该 sessionId 已持久化事件
  的最大 `sequence`，+1 后直接构造一条 `RuntimeEvent`
  （`type:'OPERATOR_OVERRIDE'`、`visibility:'HIDDEN'`、`payload` 含
  action/detail、`id: op-<seq>`）并调用 `appendEvents` 落库。
- **依据**：runtime-kernel 冻结，RootEvent 没有 OPERATOR_OVERRIDE 变体，
  也不该有——OPERATOR_OVERRIDE 是"发生在 actor 之外"的旁路审计事件，
  进入 actor 状态机反而会污染故事事实流。直接复用持久化层既有导出
  （`appendEvents`/`loadEvents`）即可完成落库，零改动冻结包。
  `visibility:'HIDDEN'` 与 CR-008/DEV-050 `getPublicState()` 投影
  "隐藏事实不外泄"的既有纪律一致——这是内部审计，不是要展示给观众的
  事实。`id` 前缀 `op-` 与 machine.ts 的 `ev-` 前缀区分，审计时一眼
  看出事件来源是 Operator API 旁路而非 actor 内存；旁路事件只会出现在
  持久化 `runtime_events` 表，不会出现在存活 actor 内存的
  `getEventLog()` 结果里，如实记录（D6 同源）。

## D4：HostPermissionState 只取 ALLOWED/MUTED 两个值，不复用 egressGate 三值 HostPermission

- **决策**：`packages/ai-host/src/hostPermission.ts` 定义
  `HostPermissionState = 'ALLOWED' | 'MUTED'`（两值），
  `createHostPermissionStore` 默认 `ALLOWED`。
- **依据**：11 个 action 里与 Host 说话许可相关的只有 Mute Host /
  Unmute Host 两个，语义恰好是两值的开/关。egressGate.ts 的三值
  `HostPermission` 含 `LIMITED`，那是 egress 门控语义的第三态，不在
  任何 operator action 语义内——为"可能有一天要用"发明第三态违反
  只定义用得上的状态的纪律（同 DEV-058 D2 精神）。且 operator-api
  按任务指令**不得 import** `@interactive-story/ai-host`（dispatch 内
  用本地结构类型 `HostPermissionPort` 镜像 `setPermission`），若把三值
  类型搬进本节点反而会强制 operator-api 表达它不需要的 LIMITED。

## D5：用 node:http 原生模块，不引入任何 HTTP 框架

- **决策**：`operatorHttpServer.ts` 只用 Node 内置 `node:http`
  （`createServer`），单一路由 `POST /operator/action`，手写
  `extractBearerToken`/`readBody`/`sendJson`/`isRequestBody` 四个小
  工具函数。
- **依据**：A15 要求零新增第三方依赖。端点只有一个、方法只有
  POST/GET 两种判别、响应只有固定几种 JSON 形状——express/fastify/
  koa 在这里解决的全部问题（路由表、body 解析、JSON 序列化）加起来
  不到 40 行手写代码能覆盖。单一路由 + body 里 `action` 字段即可表达
  全部 11 个动作，不需要 11 条独立路径的路由表。状态码语义明确：
  方法/路径不对 → 404；鉴权失败 → 401；非法 JSON / 未知 action →
  400；走到 dispatch 后统一 200（HTTP 层"请求处理成功"与语义层
  "action 是否真的生效"是两个独立判断，后者在响应体 `ok` 字段表达）。

## D6：鉴权用简单 Bearer token 精确比较，未配置时默认拒绝

- **决策**：`createOperatorAuthProvider(expectedToken)` 做字符串精确
  比较（缺失 → 'missing operator token'，不匹配 → 'invalid operator
  token'，匹配 → ok:true）；`createOptionalOperatorAuthProvider(env)`
  在 `env.OPERATOR_API_TOKEN` 未设置时返回 `noopOperatorAuthPort`
  ——对**任意** token（含 undefined）一律 `{ok:false,
  reason:'no OPERATOR_API_TOKEN configured'}`。
- **依据**：单机本地 operator 控制端点的威胁模型是"知道共享 token 的
  人才能发指令"，简单常量时间字符串比较已足够，不需要 OAuth/会话/
  HMAC 的复杂度（也没有多用户、无刷新、无 scope 概念）。安全默认值
  是**拒绝**不是放行：未配置 token 时端点宁可 401 全部拒绝，也不可
  退化为"裸奔可调"——这与 DEV-040 TwitchAuth "允许降级为不可用"的
  语义相反，是刻意为之（A09/A14 都断言这一点：默认拒绝，且 HTTP 层
  未配置时任意请求 401）。精确比较而非前缀/模糊匹配，避免把
  'token-evil' 误放行成 'token'。

## D7：Restore LKG 止于"从持久化重建并报告"，不做"热替换进程中的 actor"

- **决策**：`dispatchOperatorAction` 的 `RESTORE_LKG` 分支先调
  `loadLatestSnapshot(db, sessionId)` 确认存在快照（无快照 → `ok:false`
  + 'no persisted snapshot found for this session'，不抛异常），存在则
  调 `restoreSession(db, { sessionId, chapterRootDir, seed })` 重建后
  返回 `ok:true`。整个过程在 dispatcher 内部完成，没有也不可能有"把
  某个正在运行的 RuntimeActor 实例热替换成快照状态"的机制。
- **依据**：repo 目前**不存在**任何长驻生产的入口点——没有能"正在跑
  某个 actor 且持续对外服务"的进程（renderer/console 尚未接管），所以
  "热替换一个运行中的 actor"没有可作用的对象。任务包 Forbidden Scope
  明确禁止实现热替换机制。本节点能诚实交付的是持久化侧的"重建"能力：
  snapshotStore/recovery 的既有导出（loadLatestSnapshot/restoreSession）
  就是未来接入点——等真正出现长驻 actor 的宿主时，把"重启 actor +
  注入恢复后的快照"接到这个分支即可，本节点先把语义与落库审计
  （D2 无条件记录）钉住。
