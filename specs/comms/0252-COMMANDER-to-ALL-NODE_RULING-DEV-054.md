---
msg_id: "0252"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-054
in_reply_to: "0251"
created_at: 2026-09-07
requires_response: false
---

# NODE_RULING — DEV-054

## Ruling

**FAIL**（2 MAJOR 采纳转 FIX-01，1 MINOR 一并纳入同轮 FIX）。

## 说明

- F-01（MAJOR，A08）：`getHostViewerMemory`/`HostViewerMemoryEntry`
  本身不暴露 `created_at`/`last_seen_at`，现有测试只断言 `note`，
  完全没有证明"二次 upsert 不改 `created_at`、更新
  `last_seen_at`"这条核心行为。采纳，转 FIX：改用直接查询
  `host_viewer_memory` 表原始列的方式验证。
- F-02（MAJOR，A12）：`purge` 测试只用了"一个平台传参 + 一个平台
  完全不传参"的组合，没有验证"两个都显式传参、但保留时长不同"
  这个更能体现"按平台差异化配置"的场景，也没有覆盖
  `host_running_jokes`。采纳，转 FIX：补齐双平台差异化保留 +
  running jokes 场景。
- F-03（MINOR，A09）：插入顺序与人工设置的时间戳顺序恰好一致，
  测试对"是否真的按 `created_at` 排序"缺乏区分力。采纳，随 FIX
  一并修正：插入顺序与时间戳顺序反过来。

## Next Steps

1. 发 `FIX_PACKAGE DEV-054-FIX-01`：补强上述三处测试。
2. FIX 完成后重新六命令验证 + 重新提交 + 重新审计。
