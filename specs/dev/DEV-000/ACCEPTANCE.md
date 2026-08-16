## 12. Acceptance

每条可执行、可判定 PASS / FAIL。任一条 FAIL 则节点 FAIL。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0，0 error / 0 warning | 命令输出 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0，且 `packages/shared/dist/index.d.ts` 存在 | 命令 + 文件检查 |
| A06 | `pnpm test` 退出码 0，2 个测试文件全部通过 | 命令输出 |
| A07 | `specs/baseline/DEV_SPEC_V1.0.md` 的 sha256 与源规范文件一致，两值写入 REPORT | 哈希比对 |
| A08 | 根目录不存在 `AI 自驱动互动绘本直播系统.md` | 文件检查 |
| A09 | `specs/baseline/` 恰 1 个文件 | 文件检查 |
| A10 | workspace 内恰 1 个包，且为 `packages/shared` | `pnpm ls -r --depth -1` |
| A11 | `apps/`、`chapters/`、`assets/`、`scripts/`、`tools/` 均不存在 | 文件检查 |
| A12 | `packages/shared/src/` 恰含 `index.ts`、`brand.ts`、`health.ts`、`health.test.ts` | 文件检查 |
| A13 | `Health` 类型与 Dev Spec 第 57 节逐字一致（字段名 / 字面量 / 可选性） | 文本比对 |
| A14 | `packages/shared` 不含 T005 第 6 条列出的任何禁止标识符 | grep |
| A15 | `packages/shared` 无运行时值导出（仅 type 导出） | 代码检查 |
| A16 | 根 `package.json` 无非空 `dependencies` | 文件检查 |
| A17 | `devDependencies` 仅含第 9 节第 4 条白名单；超出项在 `DECISIONS.md` 有记录 | 文件检查 |
| A18 | `tsconfig.base.json` 含 T004 第 1 条列出的 13 个选项且值正确 | 文件检查 |
| A19 | `.github/workflows/ci.yml` 按顺序含 `pnpm typecheck`/`lint`/`format:check`/`build`/`test`，且不含 `docker`/`publish`/`deploy`/`matrix` | 文本检查 |
| A20 | 未添加禁用 `Math.random()` 的 lint 规则；未配置 coverage threshold | 配置检查 |
| A21 | `specs/dev/DEV-000/` 含 INDEX / REQUIREMENTS / ACCEPTANCE / REPORT 四份文档 | 文件检查 |
| A22 | `INDEX.md` 含原句 `OpenCode 禁止自行推进下一 DEV Node.`，且 T001–T010 全部勾选 | 文本检查 |
| A23 | `git log --oneline` 恰 1 条，首行 `DEV-000: repository foundation`；`git status --porcelain` 为空 | 命令 |
| A24 | `specs/PROJECT_INDEX.md`、`specs/BLOCKERS.md`、`specs/dev/DAG.md`、`specs/tasks/**` 未被修改 | 文件比对 |

---
