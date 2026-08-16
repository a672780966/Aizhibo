# DEV-000 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-000 — Repository Foundation

## Objective

建立 pnpm + TypeScript monorepo 基础设施（含 Shared Types 与 CI），使所有 package 可统一 build/test/typecheck。不含任何业务实现。

## Allowed Scope

Writable（Task Package 第 3 节 + 消息 0002 修订 1）：

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

specs/comms/LEDGER.md                                  （仅追加行，不得修改他方已有行）
specs/comms/NNNN-OPENCODE-to-*.md                      （仅自己发出的消息）
```

允许删除：`AI 自驱动互动绘本直播系统.md`（仅在其内容已逐字节写入 `specs/baseline/DEV_SPEC_V1.0.md` 且哈希校验通过之后）。

## Read-only Scope

（Task Package 第 3 节 + 消息 0002 修订 2）

```
AI 自驱动互动绘本直播系统.md   （迁移前只读；不得改写、补全、翻译、重排格式）
specs/PROJECT_INDEX.md          （Commander 独占）
specs/BLOCKERS.md               （Commander 独占）
specs/dev/DAG.md                （Commander 独占）
specs/tasks/**                  （Commander 独占）
specs/protocol/**               （Commander 独占）
specs/audit/**                  （Commander 独占）
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

## Forbidden Scope

（Task Package 第 3 节）

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

## Task Order

- [x] T001 节点文档
- [x] T002 规范归档 + git init
- [x] T003 pnpm workspace
- [x] T004 TypeScript 基线 + project references
- [x] T005 packages/shared（Shared Types）
- [x] T006 Lint / Format
- [x] T007 Vitest 基线
- [x] T008 CI 流水线
- [x] T009 README
- [x] T010 全量验证 + REPORT + commit

## Current Task

T010（已完成，待 AUDITOR 审核）

## Exit Criteria

`pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm format:check` / `pnpm test` 五条命令全部退出码 0；
`specs/baseline/DEV_SPEC_V1.0.md` 与源规范 sha256 一致；
workspace 内恰含 `packages/shared` 一个包，且其只导出 `Brand` 与 `Health`；
`.github/workflows/ci.yml` 与本地命令集等价；
REPORT.md 完成且 Status = READY_FOR_REVIEW。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
