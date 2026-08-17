---
msg_id: "0035"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-003
created_at: 2026-08-18
requires_response: true
---

# TASK_PACKAGE — DEV-003

## 指针

授权内容全文位于：

`specs/tasks/TASK-PACKAGE-DEV-003.md`

该文件是本次施工的**唯一授权范围**。

## 前置状态

- DEV-000/DEV-001/DEV-008/DEV-002 均已 `DONE`，接口冻结（`git_head 75f2554`）
- 权威规范输入：Dev Spec 第 24 节 + 现有 `packages/chapter-compiler` 源码（直接消费其 `SchemaValidationResult`）+ `SPEC-ADDENDUM-001.md` §A6/§A11/§A12/§A13

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`（附录 A 近期更新：Allowed Files 逐一真实改动强约束；审核员优先直调 `project-auditor`，报错才降级）
2. `specs/tasks/TASK-PACKAGE-DEV-003.md`——**第 3 节的 Scope 划分比以往更细**：同一个包（`chapter-compiler`）内，DEV-002 的 PASS1/PASS2 源文件是 Read-only（`git diff` 必须为空），`types.ts`/`compile.ts`/`compile.test.ts`/`index.ts` 只允许追加式修改（只加行，不改/删已有行）。这条边界会被 AUDITOR 逐行核对，务必先读懂。
3. `specs/PROJECT_INDEX.md`

## 范围要点

本节点新增 PASS 3（图可达性/死路/环检测）与 PASS 5（状态可达性/可满足性）。核心设计原则是"保守过近似"——不确定时一律放行，不得因为实现简单就误杀合法内容。不实现任何运行时 Condition 求值逻辑（那是 DEV-004）。

## 节点状态

`ISSUED` → OpenCode（Codex）开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
