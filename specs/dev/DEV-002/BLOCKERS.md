# DEV-002 BLOCKERS

## BLK-001 — （结案）T002 #3 references 与 A02 typecheck 的 TS6310 现象

**状态**：CLOSED（2026-08-17，裁决依据更新为 `NODE_RULING` 消息 `0028` 与 `FIX_PACKAGE` 消息 `0029`，
不再引用 OpenCode 自行发出的 `CORRECTION 0026` 作为结案依据——该次自行结案已被裁定为未经授权的流程越权）

### 现象

`tsc -b --noEmit`（`pnpm typecheck`）在 chapter-compiler 带包级 `references`、
且被引用项目（chapter-schema）`dist`/`tsbuildinfo` 陈旧或缺失（需重建）时，
报 `TS6310: Referenced project may not disable emit`。

### 处置（Commander 裁决）

`NODE_RULING 0028` 采纳方案 A：删除 chapter-compiler 包级 `references`，仅依赖根 solution 级
references；`FIX_PACKAGE 0029`（`DEV-002-FIX-01`）据此下发。本 BLOCKER 在此裁决下正式结案。

---

## BLK-002 — （结案）方案 A（纯移除 references）在全新状态 + 严格顺序下无法达成 FIX-A01

**状态**：CLOSED（2026-08-17，`SCOPE_RULING` 消息 `0031`：裁决为技术性 FIX，采纳方案 A'——
根 `typecheck` 脚本改为 `tsc -b && tsc -b --noEmit`，USER 已批准，CR 性质留痕；根因已消除）

### 现象（全新工作区、严格按 T013 §1 顺序实测）

| 步骤 | 结果 |
|---|---|
| `pnpm install` | 退出码 0 |
| `pnpm typecheck`（references 已移除，dist/tsbuildinfo 全清） | **退出码 2**：`TS2307: Cannot find module '@interactive-story/chapter-schema' or its corresponding type declarations.` |

### 根因（已隔离验证，非环境问题）

`pnpm typecheck` = `tsc -b --noEmit`。`--noEmit` 模式**不会为依赖产出 `dist/*.d.ts`**；
chapter-compiler 对 `@interactive-story/chapter-schema` 的类型解析（node_modules workspace
链接 → package.json `exports.types` → `dist/index.d.ts`）在全新状态（dist 缺失）下必然失败。
该问题与 references 的存在性无关——只是改变了失败形态：

| 配置 | 全新状态 `tsc -b --noEmit` 结果 |
|---|---|
| 带包级 references（FIX 前） | `TS6310: Referenced project may not disable emit`（退出码 2） |
| 移除 references（FIX 方案 A） | `TS2307: Cannot find module ...`（退出码 2） |
| 移除 references + `paths`→chapter-schema/src | `TS6059`/`TS6307`（`rootDir`/composite 约束，退出码 1） |
| 移除 references + 先 `pnpm build`（颠倒顺序） | 退出码 0（但违反 FIX-A01 严格顺序） |

已确认 `pnpm build`（`tsc -b`，发射型）在全新状态 + 移除 references 下正常工作（退出码 0，
`dist/index.d.ts` 正确产出），证明根 solution 级 references 确实驱动了构建顺序与类型解析——
但仅对**发射构建**成立，对 `tsc -b --noEmit` 不成立。

### 处置（Commander 裁决，消息 `0031`）

`NODE_RULING 0028` 采纳方案 A（移除包级 references）的前提（方案 A 即可让全新状态
typecheck 通过）被实测证伪；`SCOPE_RULING 0031` 因此采纳方案 A'：根 `package.json` 的
`typecheck` 脚本改为 `tsc -b && tsc -b --noEmit`（先发射构建物化依赖产物，再以 `--noEmit`
复核），由 `Commander` 直接改动（超出本节点 Writable Scope），USER 批准，CR 性质留痕。
根因消除后，本节点在清空产物 + 严格顺序下独立重跑六条命令全部退出码 0（见 REPORT
Tests Executed 与 DECISIONS D11）。本 BLOCKER 正式结案。
