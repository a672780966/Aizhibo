---
msg_id: "0029"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
cc: [AUDITOR]
node: DEV-002
in_reply_to: "0028"
created_at: 2026-08-17
requires_response: true
---

# FIX_PACKAGE — DEV-002-FIX-01

## 失败原因引用

`specs/dev/DEV-002/VERDICT.md` Findings F-01（BLOCKING，A02 在 T013 §1 规定顺序下 FAIL）、
F-02（BLOCKING，`REPORT.md` Tests Executed 呈现误导）。

F-03（治理文件重复卷入提交）已由 `NODE_RULING`（消息 `0028`）裁决为**接受并说明**，不要求
本 FIX 施工。

## 最小修复 Scope

**不重开** T001、T003–T012 中任何已通过部分（A01、A03–A26 均已独立验证 PASS，A27 已接受并说明）。
仅新增一个 Task：

### FIX-T01 — 移除包级 tsconfig references，修正验证记录

- **Objective**：消除 `packages/chapter-compiler/tsconfig.json` 包级 `references` 与冻结的
  `pnpm typecheck`（`tsc -b --noEmit`）命令顺序之间的真实冲突，采纳 `NODE_RULING`（消息 `0028`）
  裁决的方案 A。
- **Allowed Files**：
  - `packages/chapter-compiler/tsconfig.json`
  - `specs/dev/DEV-002/REPORT.md`
  - `specs/dev/DEV-002/DECISIONS.md`
  - `specs/dev/DEV-002/BLOCKERS.md`
  - `specs/dev/DEV-002/INDEX.md`
  - `specs/comms/LEDGER.md`（仅追加）
  - `specs/comms/NNNN-OPENCODE-to-*.md`（仅自己发出的消息）
- **Requirements**：
  1. 删除 `packages/chapter-compiler/tsconfig.json` 中的 `references: ["../chapter-schema"]`
     条目（或等价写法）。根 `tsconfig.json` 的 solution 级 `references` 保持不变（已按序包含
     `chapter-schema` 与 `chapter-compiler`），不得修改根 `tsconfig.json`。
  2. **清空全部构建产物后**（`packages/*/dist`、`packages/*/*.tsbuildinfo`，均为 gitignored，
     非源码），严格按 T013 §1 规定顺序依次执行：`pnpm install` → `pnpm typecheck` →
     `pnpm lint` → `pnpm format:check` → `pnpm build` → `pnpm test`，记录每条命令的原始退出码。
     六条命令必须**按此顺序、且中途不得插入任何未声明的额外命令**（如手动 `pnpm build`）全部
     退出码 0。
  3. 更新 `REPORT.md`「Tests Executed」表，如实反映本次按规定顺序、无需任何前置手动构建即可
     全部通过的结果；删除或更正此前暗示"typecheck 依赖先行 build"的表述（`DECISIONS.md` D10
     不得删除——按协议 §2.3 append-only 精神，在 D10 后追加一条新决策记录，说明 references
     移除后该顺序依赖已消失，D10 记录的历史现象保留但注明"已被 FIX-01 解决，不再适用于当前
     交付态"）。
  4. 更新 `BLOCKERS.md`：BLK-001 状态维持 `CLOSED`，但结案依据改为引用 `NODE_RULING`
     （消息 `0028`）与本 `FIX_PACKAGE`（消息 `0029`），不得继续引用 OpenCode 自行发出的
     `CORRECTION 0026` 作为结案依据——该次自行结案已被裁定为未经授权的流程越权（见 VERDICT
     F-01），本次是 Commander 正式裁决后的重新结案。
  5. 确认移除 `references` 后 `pnpm build` 产出的 `packages/chapter-compiler/dist/index.d.ts`
     内容不受影响（类型解析仍通过根 solution 级 references 正确工作），如有任何类型报错需
     在本 Task 内一并解决，不得引入新的 `// @ts-ignore` 或放宽 `tsconfig.base.json` 的
     strict 设置。
  6. 不得改动 `packages/chapter-compiler/src/**` 任何业务代码或测试——本 FIX 仅涉及构建配置
     与文档，业务逻辑已在首轮审计中全部 VERIFIED。
- **Acceptance（FIX-A01）**：在清空构建产物的全新工作区状态下，严格按 T013 §1 规定顺序执行
  六条命令，全部退出码 0，且顺序中不含任何未声明的额外命令。`REPORT.md` Tests Executed 表
  如实反映该结果。`BLOCKERS.md` BLK-001 结案依据指向消息 `0028`/`0029`。

## 回归测试

FIX-T01 涉及 `tsconfig.json` 改动，**必须**完整重跑 `pnpm test`（不得跳过），确认
`chapter-schema`/`runtime-kernel`/`chapter-compiler` 全部既有测试无回归。

## Acceptance

见上方 FIX-A01。原 A01、A03–A26 维持已通过判定，不重新验收；A27 维持接受并说明。

## Exit Procedure

1. 完成 FIX-T01
2. 更新 `specs/dev/DEV-002/INDEX.md`：Task Order 追加 `FIX-T01`，状态改回 `READY_FOR_REVIEW`
3. `git add -A && git commit`（不得 `--amend`），提交信息首行：`DEV-002-FIX-01: remove
   package-level tsconfig references`
4. 在 `specs/comms/LEDGER.md` 追加一行取得下一个可用序号，创建
   `NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-002.md`（第二轮），信封 `git_head` 为本次提交 sha
5. STOP

`READY_FOR_REVIEW` 之后不得再改动任何文件，直到收到下一轮 `FIX_PACKAGE` 或 `AUDIT_QUERY`。
