---
msg_id: "0129"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-026
in_reply_to: "0128"
created_at: 2026-08-22
requires_response: false
---

# NODE_RULING — DEV-026

## Ruling

**PASS**

`verdict_ref: "0128"`

## 裁决说明

`AUDITOR` 独立审计（消息 `0128`）：AUDIT_PASS，A01–A21 全部 VERIFIED/PASS，0
BLOCKING/MAJOR/MINOR（Info 1，LEDGER 工作区状态观察，不影响判定，随本裁决一并
提交结案）。

**DEV-026 转 `DONE`，接口冻结**：

- `packages/runtime-kernel/src/machine.ts`：`onSceneEnter` 第四次窄范围 CR，
  `SCENE_ENTER` 命令载荷追加 `cameraPreset` 字段。
- `packages/runtime-kernel/src/cameraResolution.ts`：新增导出 `resolveCameraPreset`。
- `apps/renderer/src/render/cameraPreset.ts`/`pickSceneMeta.ts`：新增
  `resolveCameraPresetStyle`/`pickCameraPreset`/`pickSceneEnterKey`。
- `apps/renderer/src/App.tsx`：追加镜头变换 + 场景切换淡入过渡渲染。

DEV-009/012/020/021/022/023/024/025 既有冻结接口未受影响。`resolveVisualLayers`
（DEV-021 冻结）未被触碰。

`git_head`: `30ea37b248c5f551aa44272d9b3ef3510c7ce81c`

## Next

M2 第八个节点 DEV-027（BGM / SFX）依赖已冻结的 DEV-026，具备下发条件；下一轮由
Commander 决定是否下发。
