---
msg_id: "0031"
type: SCOPE_RULING
from: COMMANDER
to: OPENCODE
cc: [AUDITOR]
node: DEV-002
in_reply_to: "0030"
created_at: 2026-08-17
requires_response: true
---

# SCOPE_RULING — DEV-002（BLK-002）

## 裁决

`EXECUTOR_QUERY 0030` 的技术判断成立：`Commander` 已独立复现——`pnpm typecheck`
（`tsc -b --noEmit`）在全新工作区下无论 `chapter-compiler` 是否带包级 `references`，
均因**依赖包 `chapter-schema` 的 `dist/*.d.ts` 尚未物化**而必然失败（`TS6310` 或 `TS2307`，
取决于 `references` 是否存在）；`NODE_RULING 0028` 裁定"方案 A 单独即可解决"所依据的前提
已被证伪。

**本次裁决触及验收机制本身**（"`pnpm typecheck` 实际检查什么"），而非单纯的执行细节；
`ACCEPTANCE_AMENDMENT` 通道已因 `NODE_REPORT`（消息 `0024`）交付而关闭，`Commander` 不具备
单方面裁决此类变更的权限（协议 §7.2 精神：涉及验收语义边界的变更不应由 Commander 自行拍板
并自行验证）。**本次裁决已上报真实 `USER` 并获得明确批准**（采纳下方方案 A'，2026-08-17），
按 `CHANGE_REQUEST` 性质留痕，不是 `Commander` 自主决定。

## 采纳方案：A'（根 `typecheck` 脚本显式声明"先构建后检查"）

`Commander` 已直接修改（该文件从未在任何 Task Package 的 OPENCODE Writable Scope 内，
超出 `OPENCODE` 权限，故由 `Commander` 自行执行，不下发给 `OPENCODE` 施工）：

```diff
- "typecheck": "tsc -b --noEmit",
+ "typecheck": "tsc -b && tsc -b --noEmit",
```

（`package.json`，仓库根）

**未变更**：`build`/`lint`/`format:check`/`test` 脚本、`A02` 判定文本（仍是"`pnpm typecheck`
退出码 0（含全部三包）"）、任何 Acceptance 条目文本、`tsconfig.json`/`tsconfig.base.json`、
`packages/chapter-schema`/`runtime-kernel`/`shared` 冻结产物。`A02` 的验收字面语义不变，
只是"`pnpm typecheck` 内部实际执行的检查步骤"现在显式包含其真实前置（materialize 依赖类型），
不再依赖外部调用者手动排序。

**独立验证**（`Commander` 在清空 `packages/*/dist`、`*.tsbuildinfo` 后，严格按
`install → typecheck → lint → format:check → build → test` 顺序执行，未插入任何额外命令）：

| 命令 | 退出码 |
|---|---|
| `pnpm install` | 0 |
| `pnpm typecheck`（新脚本） | 0 |
| `pnpm lint` | 0 |
| `pnpm format:check` | 0 |
| `pnpm build` | 0 |
| `pnpm test` | 0 |

（过程中另发现 `.codebase-memory/`——`Commander` 工具链本地索引缓存，与 `.claude/**` 同类、
未被追踪——污染 `format:check`；已比照 `.claude/**` 先例追加进 `.gitignore`，非 DEV-002
相关问题，不计入本节点 Findings。）

## 其它候选方案的处置

- **方案 B'（修订 FIX-A01/A02 验收标准文本）**：不采纳。性质与方案 A' 相同（触及已关闭的
  验收语义），但改动面更大（需同时改 Task Package 原文与 FIX_PACKAGE），无额外收益。
- **方案 C（冻结包 `exports.types` 例外）**：不采纳。触碰 `chapter-schema`（`DONE`，接口冻结）
  的已冻结面，风险远高于方案 A'，且方案 A' 已能在不改动任何冻结包的前提下解决问题。

## BLK-002 处置

裁决为**技术性 FIX**（非"接受并说明"）：根因已消除，`OPENCODE` 应据此完成 FIX-T01 的
剩余验证与文档更新，而非继续排查或另寻 Workaround。

## 对 FIX_PACKAGE 0029 的影响

`FIX_PACKAGE 0029`（`DEV-002-FIX-01`）的 Allowed Files、Requirements #1/#3/#4/#5/#6、
Exit Procedure **均不变**——移除包级 `references`（已完成）仍是本 FIX 的一部分；唯一变化是
Requirement #2 的六条命令现在在**新脚本**下于严格顺序中全部退出码 0，`OPENCODE` 需**重新**
在自己的会话中独立执行一次以取得第一手记录（不得以本裁决内的 `Commander` 验证结果替代自己的
执行记录）。

`DECISIONS.md` D10 记录的"旧脚本下 typecheck 依赖先行 build"现象保留（历史真实），追加一条
新决策记录本次根因彻底解决的方式（脚本层面显式化，而非依赖调用顺序）。

`BLOCKERS.md`：BLK-002 状态改为 `CLOSED`，结案依据引用本消息 `0031`；BLK-001 的既有记录不变
（其结案依据已在上一轮指向 `0028`/`0029`，与本次脚本修正是同一条技术脉络的延续，无需改写）。

## Exit Procedure（沿用 FIX_PACKAGE 0029，无新增步骤）

1. 拉取本次 `Commander` 对 `package.json`/`.gitignore` 的改动（已提交）
2. 完成 FIX-T01 剩余工作：清空构建产物后独立重跑六条命令并记录原始输出
3. 更新 `REPORT.md`/`DECISIONS.md`/`BLOCKERS.md`/`INDEX.md`
4. `git add -A && git commit`（不得 `--amend`）
5. 追加 LEDGER 行，发第二轮 `NODE_REPORT` 给 `AUDITOR`
6. STOP
