---
msg_id: "0030"
type: EXECUTOR_QUERY
from: OPENCODE
to: COMMANDER
node: DEV-002
in_reply_to: "0029"
blocking: true
created_at: 2026-08-17
requires_response: true
---

# EXECUTOR_QUERY — DEV-002（FIX-T01 阻塞）

## 受影响的 Task

- **FIX-T01**（`FIX_PACKAGE 0029`）：移除包级 tsconfig references，并在全新状态 + 严格顺序下
  六条命令全部退出码 0（`FIX-A01`）。

## 卡住的具体原因

`FIX_PACKAGE 0029` 采纳的**方案 A（纯移除 references）**已按指示执行（references 已删、根
tsconfig 未动、src 未动），但**在 FIX-A01 要求的全新工作区状态 + T013 §1 严格顺序下，
`pnpm typecheck` 实测失败（退出码 2）**，FIX-A01 无法达成。

**独立复现证据**（清空全部 `packages/*/dist` 与 `*.tsbuildinfo` 后，严格按顺序执行）：

| 步骤 | 结果 |
|---|---|
| `pnpm install` | 退出码 0 |
| `pnpm typecheck` | **退出码 2**：`TS2307: Cannot find module '@interactive-story/chapter-schema' or its corresponding type declarations.`（含 4 条派生 implicit-any 级联） |
| （未继续） | — |

**根因**（已隔离验证，非环境问题，非 BLK-001 的简单复发）：

- `pnpm typecheck` = `tsc -b --noEmit`。在 `--noEmit` 构建模式下，TS **不会发射任何项目产物**，
  因此被依赖包 chapter-schema 的 `dist/index.d.ts` 在全新状态下不存在；chapter-compiler 对
  `@interactive-story/chapter-schema` 的类型解析（workspace 链接 → `exports.types` →
  `dist/index.d.ts`）必然失败。
- 该失败与 references 的存在性无关，只改变失败形态：

| 配置（均为全新状态 + 严格顺序） | `tsc -b --noEmit` 结果 |
|---|---|
| 带包级 references（FIX 前） | `TS6310`（退出码 2） |
| **移除 references（FIX 方案 A）** | **`TS2307`（退出码 2）** |
| 移除 references + `paths`→chapter-schema/src（源解析） | `TS6059`/`TS6307`（`rootDir`/composite 约束，退出码 1） |
| 移除 references + 先 `pnpm build`（颠倒顺序） | 退出码 0（但违反 FIX-A01 严格顺序） |

- `pnpm build`（`tsc -b`，发射型）在全新状态 + 移除 references 下正常（退出码 0，
  `dist/index.d.ts` 与 `chapter-schema/dist/index.d.ts` 均正确产出）——证明根 solution 级
  references 确实驱动了构建顺序与类型解析，但**仅对发射构建成立**；`tsc -b --noEmit`
  不会发射依赖产物，故无法从零解析。

**结论**：`FIX-A01`（全新状态、严格顺序、无额外命令）在当前冻结脚本
（`typecheck = tsc -b --noEmit`）下，**无法仅通过修改 Writable Scope 内文件达成**——
依赖 chapter-schema 的类型必须先被发射（materialize），而发射被 `--noEmit` 禁止、被
FIX-A01 的严格顺序禁止（不得在 typecheck 前插入 `pnpm build`）。`NODE_RULING 0028`
裁定"方案 A 是唯一可合法采纳的解法"所依据的假设（方案 A 即可让全新状态 typecheck 通过）
经实测不成立。

## 需要越界修改的文件

无（全部在 Writable Scope 内的可行配置变体均已实测失败；任何可行解都需要触及根
`package.json` 脚本、根 `tsconfig.json`、冻结的 `chapter-schema` 三者之一，或修订
FIX-A01 验收标准——均超出 OPENCODE 权限，须由 COMMANDER 裁决）。

## OPENCODE 自己倾向的方案（供裁决参考，不自行实施）

1. **方案 A'（根脚本微调，最贴合现有语义）**：修改根 `package.json` 的 `typecheck` 脚本，
   使依赖先被构建再检查——例如 `"typecheck": "tsc -b && tsc -b --noEmit"`（先发射构建保证
   `.d.ts` 就绪，再以 `--noEmit` 复核），或 `"typecheck": "tsc -b --noEmit --force"` 之外更稳妥的
   `pretypecheck` 钩子。这需要授权修改根 `package.json`，且`NODE_RULING 0028` 曾以"需
   ACCEPTANCE_AMENDMENT 且已关闭"为由拒绝过方案 B——但 0028 拒绝的前提（方案 A 可行）已被
   证伪，本请求即为重新裁决的依据。
2. **方案 B'（修订 FIX-A01 验收标准）**：将 FIX-A01 的"全新状态"改为"`pnpm build` 之后的状态"
   （即接受依赖产物先就绪），或以 `CORRECTION`/新 `FIX_PACKAGE` 修订 0029 的验收语义。
3. **方案 C（冻结包例外）**：授权修改 `packages/chapter-schema/package.json` 的
   `exports.types` 指向 `src`（需 `CHANGE_REQUEST` 上报，且触碰 A27 冻结面，风险最高）。

OPENCODE 倾向方案 A'（不改变验收语义、不改冻结包、不修订验收标准，只是把"依赖必须先
构建"这一真实前置显式化到脚本中）。

## 其余验证进度（不受阻塞影响）

`pnpm install` / `pnpm lint` / `pnpm format:check` 在 references 移除后均退出码 0；
`pnpm build`（发射型）退出码 0 且 `dist/index.d.ts` 完整；业务代码（`src/**`）未改动
（FIX Requirement #6 遵守）。

## 处置请求

请在 `SCOPE_RULING` 中裁决：采用上述方案之一，或给出其它解法。OPENCODE 在收到裁决前
**不会自行继续 FIX-T01**，也不会自行结案本 BLOCKER（BLK-002，`BLOCKERS.md` 已登记）。
