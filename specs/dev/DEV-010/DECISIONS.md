# DEV-010 DECISIONS

## D1 — 写穿透 LKG，不做本节点事件回放

每次新增 `RuntimeEvent` 后立即保存同一序号的完整 XState persisted snapshot。这样 LKG 与最新
事件同步，崩溃恢复只需加载最新 snapshot，不存在本节点必须回放的间隙。按职责边界，DEV-011
负责从 Event Log 重建 Runtime；本节点不实现另一套 replay 机制，也不把输出型 RuntimeEvent
误当成可重新喂给机器的输入事件。

## D2 — Snapshot 保持不透明

`runtime-kernel` 只追加 `getPersistedSnapshot(actor): unknown` 与
`restoreRuntimeMachine(...)`。`persistence` 对 persisted 值只做 `JSON.stringify`/`JSON.parse`，
不读取 XState context、Region 或内部 snapshot 字段，保持 DEV-009 CR-008 的信息隐藏边界。

## D3 — Chapter Version 缺口使用 chapterId

Dev Spec 第 18 节要求 LKG 包含 Chapter Version，但当前 `chapter-schema` 的 manifest 没有可供
本节点消费的 runtime version 字段。为避免修改冻结的 `chapter-schema`，`runtime_snapshots.chapter_id`
记录现有 `chapterId` 作为最接近替代，并如实保留这一缺口，未来有正式版本字段时再迁移。

## D4 — node:sqlite

Node v24.18.0 已提供稳定的内置 `node:sqlite`/`DatabaseSync`，足以完成 `exec`、`prepare`、`run`
与 `all`。不引入 `better-sqlite3` 等原生依赖，避免编译工具链和额外供应链；当前 schema 只需
`CREATE TABLE IF NOT EXISTS`，不提前加入 ORM、连接池或迁移框架。

## D5 — getHealth 的 Date.now 红线适用范围

`getHealth()` 只执行运维遥测查询与延迟计时，不写入 Runtime Event Log、不参与游戏状态转移、
不进入 DEV-011 Replay，因此可直接使用 `Date.now()`。runtime-kernel 中进入游戏状态/事件的时间仍
必须走 `ClockPort`；本节点没有把这个运维例外扩散到状态机。

## D6 — 四张表，六张表延后

本节点只创建有真实消费者或被明确指派的 `runtime_sessions`、`runtime_events`、
`runtime_snapshots`、`viewer_states`。`audio_cache` 延后 DEV-036；`platform_events` 延后
M4 DEV-040–046；`errors` 延后 DEV-062；`chapter_runs` 待定；`host_viewer_memory` 与
`host_running_jokes` 延后 DEV-054。后两者当前没有冻结的 shape，提前建表会猜测字段。

## D7 — ViewerState 平台键与时间列

`ViewerState` 的平台类型在当前仓库尚未单独冻结，因此持久化接口使用 string，同时保持
`platform + viewerId` 复合主键。`created_at`/`last_seen_at` 用 ISO 文本时间；业务字段严格
对应第 15 节，upsert 不添加额外 ViewerState 字段，首次插入保留 `created_at`，每次调用刷新
`last_seen_at`。
