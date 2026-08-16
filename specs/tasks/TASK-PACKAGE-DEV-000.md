# TASK PACKAGE — DEV-000

> **版本 2**。第 1 版依据被截断的规范编写，错误地把 CI 与 Shared Types 列入 Forbidden Scope。完整规范第 65 节明确 DEV-000 交付物包含 CI 与 Shared Types，本版据此全量重写。第 1 版作废。

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-000 |
| Node Name | Repository Foundation |
| Milestone | M1 — Story Machine Complete |
| Status | ISSUED → 待 OpenCode 施工 |
| Dependencies | 无（DAG 根节点，Dev Spec 第 66 节） |
| Commander | Claude |
| Executor | OpenCode |
| Repo Root | `c:\Users\admin\Music\Aizhibo`（当前目录即仓库根，不再嵌套 `interactive-story/`） |

### Commander 前置判定

- 仓库当前仅有 `AI 自驱动互动绘本直播系统.md` 与 Commander 产出的 `specs/`；无 git、无 `package.json`。
- DEV-000 状态为 **NOT_STARTED**（非 FAIL），故下发完整 Task Package 而非 FIX Package。
- 项目级 Blocker 无（BLK-001 已 CLOSED）。

### 规范原文（第 65 节）

```text
## DEV-000
### Repository Foundation
建立：
Monorepo / pnpm / TypeScript / Lint / Formatter / Vitest / CI / Shared Types
验收：
> 所有 package 可以统一 build/test/typecheck。
```

本包的全部内容是对上述 8 项交付物与 1 条验收线的展开，**不得超出**。

---

## 2. Current Objective

完成本节点后，仓库新增且仅新增以下能力：

> 一个可运行的 pnpm + TypeScript monorepo：含唯一实体包 `packages/shared`，能在仓库根一次性执行 `build` / `test` / `typecheck` / `lint` / `format:check` 并全部通过，且具备等价的 CI 流水线定义与已归档的冻结规范。

不包含任何业务逻辑。`packages/shared` 只承载语言级工具类型与规范第 57 节的 `Health` 契约。

---

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

## 4. Required Skills

### Required

- pnpm workspace
- TypeScript 配置（`strict`、composite project references、`tsc -b`）
- Vitest 配置（含 `expectTypeOf` 类型级断言）
- ESLint flat config + `typescript-eslint`
- Prettier
- GitHub Actions workflow 编写
- Markdown 文档撰写

### Optional

- tsconfig 严格选项自查

### Forbidden / Unnecessary

- Zod / JSON Schema（属 DEV-001）
- XState（属 DEV-009）
- React（属 DEV-020）
- SQLite / Drizzle / Prisma（属 DEV-010）
- Twitch / YouTube / Bilibili SDK（属 DEV-040 / DEV-080 / DEV-081）
- TTS / ElevenLabs / 音频处理（属第三施工组）
- 任何 LLM SDK（AI Host 属 DEV-056，且运行时故事链路永久禁止）
- 第 70 节全部禁止清单
- Turborepo / Nx / changesets / husky / lint-staged / commitlint / Docker / Kubernetes

---

## 5. Inputs

| Input | 说明 |
|---|---|
| Dev Spec 第 65 节 DEV-000 | 交付物清单与验收线（权威） |
| Dev Spec 第 3 节 | 技术栈：TypeScript / pnpm / Node.js / React / XState v5 / SQLite |
| Dev Spec 第 3.2 节 | 禁止第一版引入 Kubernetes / 微服务 / Kafka / Redis Cluster / Service Mesh |
| Dev Spec 第 4 节 | 仓库目录规范（本节点只**记录**布局，仅实体化 `packages/shared`） |
| Dev Spec 第 57 节 | `Health` 类型定义（逐字采用） |
| Dev Spec 第 61 节 | 测试体系；`> 90% core logic coverage` 自 DEV-001 起生效（见第 10 节） |
| Dev Spec 第 66 节 | DEV-000 为根节点，无前置 |
| Dev Spec 第 70 节 | 永久禁止技术清单 |
| `specs/dev/DAG.md` | 节点边界 |
| 外部官方文档 | pnpm workspaces / TypeScript project references / Vitest / ESLint flat config / Prettier / GitHub Actions |

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

## 7. Task Breakdown

### T001 — 建立当前节点施工索引与节点文档

- **Objective**：创建 DEV-000 节点文档，使任何一次中断后都能从 `INDEX.md` 恢复上下文。
- **Allowed Files**：`specs/dev/DEV-000/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Requirements**：
  1. `INDEX.md` 严格采用本包第 8 节模板，Task Order 列出 T001–T010。
  2. `REQUIREMENTS.md` 逐条抄录本包第 3、6、9、10 节。
  3. `ACCEPTANCE.md` 逐条抄录本包第 12 节 A01–A24，每条含可执行判定方式。
  4. `REPORT.md` 先建为骨架，`Status: IN_PROGRESS`。
  5. 四份文档中不得出现 DEV-001 及之后节点的任何实现计划。
- **Acceptance**：四文件存在；`INDEX.md` 含原句 `OpenCode 禁止自行推进下一 DEV Node.`；Task Order 恰为 T001–T010。

---

### T002 — 归档冻结规范并初始化 git

- **Objective**：把唯一规范来源纳入 `specs/`，建立版本控制基线。
- **Allowed Files**：`specs/baseline/DEV_SPEC_V1.0.md`、`.gitignore`、`AI 自驱动互动绘本直播系统.md`（校验通过后方可删除）
- **Requirements**：
  1. 将 `AI 自驱动互动绘本直播系统.md` **逐字节**复制为 `specs/baseline/DEV_SPEC_V1.0.md`。禁止修正错别字（例如第 39 节 `-普通 Scene 切换` 缺空格）、禁止重排格式、禁止翻译、禁止增删标题。
  2. 计算两文件 sha256 并比对，两个哈希值写入 `REPORT.md`。
  3. `specs/baseline/` 下只允许存在这一个文件，不得添加 README。
  4. 校验通过后删除根目录源文件；不通过则保留源文件、写入 `specs/dev/DEV-000/BLOCKERS.md` 并停止 T002。
  5. `git init`（默认分支 `main`）。`.gitignore` 至少忽略：`node_modules/`、`dist/`、`build/`、`coverage/`、`*.tsbuildinfo`、`*.log`、`.DS_Store`、`*.sqlite`、`*.sqlite-journal`、`.env`、`.env.*`。
- **Acceptance**：归档文件 sha256 与源文件一致；根目录不再存在源文件；`git rev-parse --is-inside-work-tree` 为 `true`；`specs/baseline/` 恰 1 个文件。

---

### T003 — pnpm workspace 与 Node 版本基线

- **Objective**：确立包管理与运行时版本。
- **Allowed Files**：`package.json`、`pnpm-workspace.yaml`、`.npmrc`、`.nvmrc`
- **Requirements**：
  1. 根 `package.json`：`"name": "interactive-story"`、`"private": true`、`"type": "module"`、`"engines": { "node": ">=22" }`、`"packageManager"` 固定到完整 pnpm 版本号。
  2. `pnpm-workspace.yaml` 声明 `packages/*` 与 `apps/*`。**不得**因此创建 `apps/` 目录。
  3. `.nvmrc` 写入具体 Node 主版本；`.npmrc` 设 `engine-strict=true`。
  4. 根 `package.json` 不得有 `dependencies`；工具链只进 `devDependencies`。
- **Acceptance**：`pnpm install` 退出码 0；`apps/` 不存在；根 `package.json` 无非空 `dependencies`。

---

### T004 — TypeScript 严格基线与 project references

- **Objective**：确立全仓库类型严格度，并让根目录一条命令构建所有包。
- **Allowed Files**：`tsconfig.base.json`、`tsconfig.json`、`package.json`（仅追加 devDependencies 与 scripts）
- **Requirements**：
  1. `tsconfig.base.json` 供所有包 `extends`，必须含：`"strict": true`、`"noUncheckedIndexedAccess": true`、`"exactOptionalPropertyTypes": true`、`"noImplicitOverride": true`、`"noFallthroughCasesInSwitch": true`、`"isolatedModules": true`、`"verbatimModuleSyntax": true`、`"composite": true`、`"declaration": true`、`"module": "NodeNext"`、`"moduleResolution": "NodeNext"`、`"target": "ES2023"`、`"skipLibCheck": true`。
  2. 根 `tsconfig.json` 使用 `"references"` 指向 `packages/shared`，`"files": []`。
  3. TypeScript 版本 ≥ 5.6。
  4. scripts：`"build": "tsc -b"`、`"typecheck": "tsc -b --noEmit"`、`"clean": "tsc -b --clean"`。
  5. 若所选 TypeScript 版本拒绝 `tsc -b --noEmit`，改用独立 `tsconfig.typecheck.json` 实现等价语义，并在 `DECISIONS.md` 记录原因与方案。
  6. **禁止**引用不存在的包。
- **Acceptance**：`pnpm build` 退出码 0 且产出 `packages/shared/dist`；`pnpm typecheck` 退出码 0；上述 13 个编译选项逐一存在且值正确。

---

### T005 — packages/shared（Shared Types）

- **Objective**：交付第 65 节要求的 Shared Types，且不侵入任何下游节点的领域模型。
- **Allowed Files**：`packages/shared/package.json`、`packages/shared/tsconfig.json`、`packages/shared/src/index.ts`、`src/brand.ts`、`src/health.ts`
- **Requirements**：
  1. `packages/shared/package.json`：`"name": "@interactive-story/shared"`、`"private": true`、`"type": "module"`、`"main"`/`"types"` 指向 `dist`、`"exports"` 指向 `dist/index.js` 与 `dist/index.d.ts`、`"scripts": { "build": "tsc -b" }`。
  2. `packages/shared/tsconfig.json` extends `../../tsconfig.base.json`，`outDir: dist`、`rootDir: src`。
  3. `src/brand.ts` 导出唯一的语言级工具类型：
     ```ts
     export type Brand<T, B extends string> = T & { readonly __brand: B }
     ```
  4. `src/health.ts` 逐字采用 Dev Spec 第 57 节：
     ```ts
     export type Health = {
       status: "OK" | "DEGRADED" | "DOWN"
       lastSuccessAt?: number
       latencyMs?: number
       error?: string
     }
     ```
     字段名、字面量、可选性不得改动。
  5. `src/index.ts` 只做 re-export。
  6. **本包在 DEV-000 阶段只允许存在上述两个类型。** 明确禁止加入：`ChapterId`、`SceneId`、`ViewerId`、`Platform`、`WorldState`、`ViewerState`、`RuntimeEvent`、`PublicRuntimeState`、`DiceResult`、`ResolveInput`、`ResolveResult`、`PresentationCommand`、任何枚举常量、任何运行时函数。
  7. 本包在 DEV-000 阶段**不得包含任何运行时值导出**（除类型外只允许类型导出；`Brand` 与 `Health` 均为 type-only）。
- **Acceptance**：`packages/shared/src/` 恰含 `index.ts`、`brand.ts`、`health.ts`、`health.test.ts` 四个文件；`Health` 与规范第 57 节逐字一致；`grep` 全包无第 6 条禁止标识符；`pnpm build` 后 `packages/shared/dist/index.d.ts` 存在。

> Commander 说明：`Health` 之所以在 DEV-000 落地，是因为第 57 节声明「每个模块必须提供」，属跨切面冻结契约。DEV-061 Health System 拥有的是健康**系统**（采集/聚合/上报），不是该类型定义。

---

### T006 — Lint 与 Format 基线

- **Objective**：确立静态检查与代码风格。
- **Allowed Files**：`eslint.config.js`、`.prettierrc.json`、`.prettierignore`、`package.json`（仅追加 devDependencies 与 scripts）
- **Requirements**：
  1. ESLint **flat config**，接入 `typescript-eslint`，覆盖 `**/*.ts`；忽略 `node_modules`、`dist`、`coverage`。
  2. Prettier 固定 `printWidth`、`singleQuote`、`semi`、`trailingComma`、`endOfLine`（Windows 环境建议 `"lf"`；若选 `"auto"` 须在 `DECISIONS.md` 说明）。
  3. `.prettierignore` 必须忽略 `specs/baseline/`（冻结规范禁止被格式化）。
  4. scripts：`"lint": "eslint ."`、`"format": "prettier --write ."`、`"format:check": "prettier --check ."`。
  5. **禁止**添加业务语义规则。特别地，**不得**在本节点添加禁用 `Math.random()` 的规则——该约束由 DEV-005 Dice Engine 拥有。
- **Acceptance**：`pnpm lint` 退出码 0 且 0 error / 0 warning；`pnpm format:check` 退出码 0；`specs/baseline/DEV_SPEC_V1.0.md` 未被 Prettier 纳入检查。

---

### T007 — 测试基线（Vitest）

- **Objective**：证明测试链路在根与包两级均可运行。
- **Allowed Files**：`vitest.config.ts`、`tests/unit/toolchain.smoke.test.ts`、`packages/shared/src/health.test.ts`、`package.json`（仅追加 devDependencies 与 scripts）
- **Requirements**：
  1. 单一根 `vitest.config.ts`，`include` 同时覆盖 `tests/**/*.test.ts` 与 `packages/*/src/**/*.test.ts`。**不使用** workspace / projects 多配置（当前仅 1 包，属过度设计）。
  2. `tests/unit/toolchain.smoke.test.ts`：仅验证工具链，≥2 条断言，其中必须有一条断言 `specs/baseline/DEV_SPEC_V1.0.md` 存在。
  3. `packages/shared/src/health.test.ts`：使用 Vitest 的 `expectTypeOf` 做类型级断言，至少验证 `Health["status"]` 的联合成员与 `lastSuccessAt` 为可选。不引入额外依赖。
  4. script：`"test": "vitest run"`。
  5. **禁止**引入任何业务领域测试（无 chapter / dice / scene / interaction / narrative）。
  6. **禁止**配置 coverage threshold（本节点无核心逻辑，第 61 节的 >90% 要求自 DEV-001 起生效）。
- **Acceptance**：`pnpm test` 退出码 0，2 个测试文件全部通过；`tests/` 下恰 1 个测试文件；`packages/shared/src/` 下恰 1 个测试文件。

---

### T008 — CI 流水线

- **Objective**：交付第 65 节要求的 CI，且与本地命令严格等价。
- **Allowed Files**：`.github/workflows/ci.yml`
- **Requirements**：
  1. 触发条件：`push` 与 `pull_request`。
  2. 单 job，`ubuntu-latest`，Node 版本与 `.nvmrc` 一致。
  3. 步骤顺序固定：checkout → 安装 pnpm（版本与 `packageManager` 一致）→ setup-node（启用 pnpm 缓存）→ `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm lint` → `pnpm format:check` → `pnpm build` → `pnpm test`。
  4. **禁止**加入：发布、部署、Docker 构建、多 OS 矩阵、多 Node 版本矩阵、代码覆盖率上传、缓存以外的第三方 action。
  5. 无 GitHub remote 属预期状态；本节点只交付流水线定义，不要求远端执行。
- **Acceptance**：`.github/workflows/ci.yml` 存在；文件内按顺序出现 `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test` 五条命令；不含 `docker`、`publish`、`deploy`、`matrix` 字样。

---

### T009 — README

- **Objective**：记录仓库约定，防止后续节点自行发明布局。
- **Allowed Files**：`README.md`
- **Requirements**：
  1. 项目名称、当前 Milestone（M1 — Story Machine Complete）、当前 Node（DEV-000）。
  2. 抄录 Dev Spec 第 4 节目标目录布局作为**规划参考**，并标注：「目录按 DEV 节点逐步创建，禁止提前建立空包。」
  3. 列出五条命令：`pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm format:check` / `pnpm test`。
  4. 写明施工纪律入口：先读 `specs/PROJECT_INDEX.md`，再读 `specs/dev/DEV-XXX/INDEX.md`；规范正本位于 `specs/baseline/DEV_SPEC_V1.0.md`。
  5. ≤80 行。禁止写产品介绍、架构长文、路线图。
- **Acceptance**：`README.md` 存在，≤80 行，含上述 4 项。

---

### T010 — 全量验证、REPORT 与首个 commit

- **Objective**：证明节点完成并交付审计材料。
- **Allowed Files**：`specs/dev/DEV-000/INDEX.md`、`specs/dev/DEV-000/REPORT.md`
- **Requirements**：
  1. 依次执行并记录输出摘要：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 按本包末尾模板填写 `REPORT.md`，逐条对应 A01–A24。
  3. 更新 `INDEX.md`：T001–T010 全部勾选，`Status: READY_FOR_REVIEW`。
  4. `git add -A && git commit`，提交信息首行：`DEV-000: repository foundation`。
  5. commit 后 **STOP**。不得开始 DEV-001，不得创建 `packages/chapter-schema`。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 八节齐全；`git log --oneline` 恰 1 条；`git status --porcelain` 为空。

---

## 8. Node INDEX Requirements

`specs/dev/DEV-000/INDEX.md` 是 OpenCode 每次继续工作前的**第一读取文件**：

```markdown
# DEV-000 INDEX

Status: IN_PROGRESS

## Current Node

DEV-000 — Repository Foundation

## Objective

建立 pnpm + TypeScript monorepo 基础设施（含 Shared Types 与 CI），使所有 package 可统一 build/test/typecheck。不含任何业务实现。

## Allowed Scope

（抄录 Task Package 第 3 节 Writable Scope）

## Read-only Scope

（抄录 Task Package 第 3 节 Read-only Scope）

## Forbidden Scope

（抄录 Task Package 第 3 节 Forbidden Scope）

## Task Order

- [ ] T001 节点文档
- [ ] T002 规范归档 + git init
- [ ] T003 pnpm workspace
- [ ] T004 TypeScript 基线 + project references
- [ ] T005 packages/shared（Shared Types）
- [ ] T006 Lint / Format
- [ ] T007 Vitest 基线
- [ ] T008 CI 流水线
- [ ] T009 README
- [ ] T010 全量验证 + REPORT + commit

## Current Task

T001

## Exit Criteria

`pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm format:check` / `pnpm test` 五条命令全部退出码 0；
`specs/baseline/DEV_SPEC_V1.0.md` 与源规范 sha256 一致；
workspace 内恰含 `packages/shared` 一个包，且其只导出 `Brand` 与 `Health`；
`.github/workflows/ci.yml` 与本地命令集等价；
REPORT.md 完成且 Status = READY_FOR_REVIEW。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

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

## 11. Tests

### Unit tests

- `tests/unit/toolchain.smoke.test.ts` — 工具链可运行 + 冻结规范存在。
- `packages/shared/src/health.test.ts` — `Health` 契约的类型级断言。

### Contract tests

不适用。第 61 节 Contract Test 目标（Chapter Schema / Platform Adapter / Public State / Runtime Event / Presentation Command）在本节点全部不存在。

### Integration / Simulation / Replay / Fuzz / Soak tests

不适用（第 61–62 节，属后续节点）。

### Regression tests

不适用（无前置节点）。

### 工具链验证（等同测试，必须执行并记录）

```
pnpm install
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test
```

---

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

## 13. Exit Procedure

1. 更新 `specs/dev/DEV-000/INDEX.md`，勾选 T001–T010。
2. 运行第 11 节六条验证命令。
3. 无前置节点，regression 记为 `N/A`。
4. 按下方模板填写 `REPORT.md`，逐条对应 A01–A24。
5. `INDEX.md` 与 `REPORT.md` 的 Status 均设为 `READY_FOR_REVIEW`。
6. 执行 T010 的 git commit。
7. **STOP**。

不得开始 DEV-001。不得修改 `specs/PROJECT_INDEX.md` 或 `specs/dev/DAG.md`。

---

## REPORT.md 模板

```markdown
# DEV-000 REPORT

## Status

READY_FOR_REVIEW

## Implemented

（实际完成内容）

## Changed Files

（全部新增 / 修改 / 删除文件）

## Tests Executed

| 命令 | 结果 | 关键输出 |
|---|---|---|
| pnpm install | PASS/FAIL | |
| pnpm typecheck | PASS/FAIL | |
| pnpm lint | PASS/FAIL | |
| pnpm format:check | PASS/FAIL | |
| pnpm build | PASS/FAIL | |
| pnpm test | PASS/FAIL | |

## Acceptance Results

| # | 结果 | 证据 |
|---|---|---|
| A01 | PASS/FAIL | |
| ... | | |
| A24 | PASS/FAIL | |

## Scope Deviations

NONE / 逐条说明

## Known Issues

NONE / 逐条说明

## Blockers

NONE / 逐条说明

## Future Considerations

（仅建议，禁止在本节点实现）
```
