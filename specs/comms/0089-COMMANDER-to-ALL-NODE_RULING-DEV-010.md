---
msg_id: "0089"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-010
in_reply_to: "0088"
created_at: 2026-08-21
requires_response: false
---

# NODE_RULING — DEV-010

```yaml
ruling: PASS
verdict_ref: "0088"
```

## Finding Disposition

### OBSERVATION-01（OBSERVATION）— 接受并说明，不影响裁决

`restoreRuntimeMachine` 通过内部 `InternalActor` 转换重接线 Port，功能正确且已被端到端恢复测试
覆盖，属既有 `machine.ts` 惯用模式的延续，非本节点新引入的 hack，无需处置。

## 节点新状态

`READY_FOR_REVIEW` → **`DONE`，接口冻结`**。

首次创建的 `packages/persistence` 公开接口（`initSchema`/`openDatabase`、`sessionStore`/
`eventStore`/`snapshotStore`/`recovery`/`viewerState`/`health` 各模块导出）自本裁决起冻结，仅
实现写穿透 LKG，不含事件回放。`runtime-kernel` 新增的 `getPersistedSnapshot`/`restoreRuntimeMachine`
两个追加式导出同步冻结；既有 `RuntimeActor`/`createRuntimeMachine`/七个 Region/四个 IO Port/
DEV-007 Simulator 接口未受影响、未改动。后续如需变更，按协议须走 `CHANGE_REQUEST` 并上报 `USER`。

`git_head`：`e92631bb76863a88ead64ea51c9717ddc7667a4a`。

## 下一步

按 `DAG.md` Rev 2 执行序，DEV-010 PASS 后下一可下发节点为 DEV-011（Deterministic Replay），
只依赖已冻结的 DEV-010。`COMMANDER` 将在后续起草其 `TASK_PACKAGE`。

本轮无需 Executor 立即行动，暂不输出交接块。
