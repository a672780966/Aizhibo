---
msg_id: "0025"
type: EXECUTOR_QUERY
from: OPENCODE
to: COMMANDER
node: DEV-002
in_reply_to: "0023"
blocking: true
created_at: 2026-08-17
requires_response: true
superseded_by: "0026"
---

# EXECUTOR_QUERY — DEV-002

## 受影响的 Task

- **T002**（包脚手架，Requirement #3：包级 tsconfig 通过 `references` 指向 `../chapter-schema`）
- **T013**（全量验证：A02 `pnpm typecheck` 退出码 0）

## 卡住的具体原因

Task Package 内部两条要求互斥，无法同时满足：

1. **T002 #3** 要求 `packages/chapter-compiler/tsconfig.json` 含 `references: ["../chapter-schema"]`；
2. **A02** 要求 `pnpm typecheck`（仓库固定脚本 `tsc -b --noEmit`）退出码 0。

TS 5.9.3 下 `tsc -b --noEmit` 对"含源文件的项目 → references"的边必然报
`TS6310: Referenced project may not disable emit`（CLI 级 `--noEmit` 传播到全部项目）。
已在隔离沙箱最小复现，并在仓库内实测确认；详见 `specs/dev/DEV-002/BLOCKERS.md` BLK-001。

## 需要越界修改的文件

无。两种可行解法都在 Writable Scope 内：

- **方案 A（OPENCODE 倾向）**：删除 chapter-compiler 包级 `references` 条目。
  根 `tsconfig.json` 的 references 已按序包含 chapter-schema，构建顺序与类型解析不受影响；
  已实测 `pnpm typecheck` 与 `pnpm build`（含 `dist/index.d.ts` 产物）均退出码 0。
- **方案 B**：修改根 `package.json` 的 `typecheck` 脚本（如改 `tsc -b`）——
  需要额外授权，且不推荐（A02 验收语义即 `--noEmit`，脚本改动会削弱验收强度）。

## OPENCODE 自己倾向的方案

方案 A。T002 #3 的意图是"chapter-compiler 依赖 chapter-schema 且构建顺序正确"，
该意图在根 solution 级 references 下已达成；包级 references 条目本身与冻结的
typecheck 脚本互斥。接受后在 DECISIONS.md 与 REPORT.md 中留痕，并将本 BLOCKER
置 CLOSED。

## 其余验证进度（不受阻塞影响）

`pnpm install` / `lint` / `format:check` / `build` / `test` 全部退出码 0；
`pnpm test` 33 文件 / 174 断言全绿（含 chapter-schema、runtime-kernel 无回归）。
A19–A22 grep 检查（existsSync / 可达性·环·仿真函数名 / 跨包 import / glob 依赖）均为 0 命中。
