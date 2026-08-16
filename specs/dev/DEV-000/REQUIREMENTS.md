## 3. Scope

### Writable Scope

```
.gitignore
.npmrc
.nvmrc
package.json
pnpm-workspace.yaml
tsconfig.base.json
tsconfig.json
vitest.config.ts
eslint.config.js
.prettierrc.json
.prettierignore
README.md
.github/workflows/ci.yml

packages/shared/package.json
packages/shared/tsconfig.json
packages/shared/src/index.ts
packages/shared/src/brand.ts
packages/shared/src/health.ts
packages/shared/src/health.test.ts

tests/unit/toolchain.smoke.test.ts

specs/baseline/DEV_SPEC_V1.0.md
specs/dev/DEV-000/INDEX.md
specs/dev/DEV-000/REQUIREMENTS.md
specs/dev/DEV-000/ACCEPTANCE.md
specs/dev/DEV-000/REPORT.md
specs/dev/DEV-000/BLOCKERS.md      （仅在出现 blocker 时创建）
specs/dev/DEV-000/DECISIONS.md     （仅在需要记录决策时创建）
```

允许删除：`AI 自驱动互动绘本直播系统.md`（**仅在**其内容已逐字节写入 `specs/baseline/DEV_SPEC_V1.0.md` 且哈希校验通过之后）。

### Read-only Scope

```
AI 自驱动互动绘本直播系统.md   （迁移前只读；不得改写、补全、翻译、重排格式）
specs/PROJECT_INDEX.md          （Commander 独占）
specs/BLOCKERS.md               （Commander 独占）
specs/dev/DAG.md                （Commander 独占）
specs/tasks/**                  （Commander 独占）
```

### Forbidden Scope

```
packages/*  除 packages/shared 外的任何目录
apps/**
chapters/**
assets/**
scripts/**
tools/**
tests/integration/**
tests/simulation/**
tests/replay/**
tests/soak/**
任何 Dockerfile / docker-compose.*
任何数据库文件 / migration
```

---

## 6. Outputs

1. pnpm workspace 根配置，workspace 内恰含 1 个包：`packages/shared`。
2. `tsconfig.base.json`，`strict: true` 且额外开启：`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitOverride`、`noFallthroughCasesInSwitch`、`isolatedModules`、`verbatimModuleSyntax`。
3. Composite project references，使根目录 `tsc -b` 可统一构建全部包。
4. `packages/shared` — Shared Types 包，可 build 出 `dist/` 与 `.d.ts`。
5. 五条根级 script：`build`、`typecheck`、`lint`、`format:check`、`test`，全部退出码 0。
6. 通过的测试：根 smoke 测试 + `packages/shared` 类型级测试。
7. `.github/workflows/ci.yml`，步骤与本地五条命令**一一对应**。
8. `specs/baseline/DEV_SPEC_V1.0.md` — 冻结规范归档，与源文件逐字节一致。
9. `specs/dev/DEV-000/` 四份节点文档。
10. 已初始化的 git 仓库（分支 `main`）与首个 commit。

---

## 9. Constraints

1. **零业务代码**。不得出现 chapter / scene / dice / interaction / narrative / world / viewer / host / platform 相关的类型、函数或文件。唯一例外是 `Health`（第 57 节跨切面契约）。
2. **单包原则**。workspace 内只允许 `packages/shared`。不得为"以后方便"预建其它包。
3. **冻结规范只读**。`specs/baseline/DEV_SPEC_V1.0.md` 写入即冻结，禁止格式化、禁止改错别字。
4. **依赖最小化**。`devDependencies` 只允许：`typescript`、`vitest`、`eslint`、`@eslint/js`、`typescript-eslint`、`prettier`、`@types/node` 及其必需 peer。任何额外依赖须先写入 `DECISIONS.md` 说明为何本节点不可缺少。
5. **禁止引入**：Kubernetes、Docker、微服务、Kafka、Redis、Turborepo/Nx、changesets、husky/lint-staged/commitlint、任何生成器脚手架，以及第 70 节全部禁止清单。
6. **禁止**联网抓取模板仓库整包复制。
7. Windows 环境：所有 script 须在 Git Bash 与 PowerShell 下均可运行，不得使用 shell 专有语法（如 `rm -rf`）。
8. 遇到必须修改 Writable Scope 之外文件才能推进的情况：**停止该 Task**，写入 `specs/dev/DEV-000/BLOCKERS.md`，继续其它不受影响的 Task，由 Commander 决定是否扩大 Scope。

---

## 10. Non-goals / Out-of-scope

本节点**明确不做**：

- 不实现 Chapter Schema、不引入 Zod、不写任何 JSON Schema（DEV-001）。
- 不创建 `packages/chapter-schema` 及其它任何包（DEV-001 及之后）。
- 不创建 `apps/runtime`、`apps/renderer`、`apps/operator`。
- 不创建 `chapters/`、`assets/`、`scripts/`、`tools/`。
- 不在 `packages/shared` 中定义任何领域类型（`WorldState` 属 DEV-004、`RuntimeEvent` 属 DEV-008、`PublicRuntimeState` 属 DEV-050、`PresentationCommand` 属 DEV-028、`Platform` 属 DEV-040 组）。
- 不添加禁用 `Math.random()` 的 lint 规则（DEV-005）。
- 不配置 coverage threshold（第 61 节 >90% 要求自 DEV-001 起逐包生效）。
- 不搭建 SQLite / Persistence（DEV-010）。
- 不引入 XState、React、平台 SDK、TTS、任何 LLM SDK。
- 不配置发布 / 部署 / 版本管理流程。
- 不撰写产品文档、架构文档、路线图。
- 不推进到 DEV-001。

---
