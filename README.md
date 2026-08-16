# AI 自驱动互动绘本直播系统

- Milestone: M1 — Story Machine Complete
- Current Node: DEV-000 — Repository Foundation
- 规范正本：`specs/baseline/DEV_SPEC_V1.0.md`（冻结，禁止修改与格式化）

## 技术栈

pnpm workspace + TypeScript（strict + project references）+ Vitest + ESLint（flat config）+ Prettier + GitHub Actions CI。

## 目标目录布局（规划参考，Dev Spec 第 4 节）

```text
interactive-story/
├── apps/            runtime / renderer / operator
├── packages/        chapter-schema / shared / …（共 19 个包）
├── chapters/
├── assets/
├── scripts/
├── specs/
├── tests/           unit / integration / simulation / replay / soak
└── tools/
```

目录按 DEV 节点逐步创建，禁止提前建立空包。

## 常用命令

| 命令                | 作用                 |
| ------------------- | -------------------- |
| `pnpm build`        | 全仓构建（`tsc -b`） |
| `pnpm typecheck`    | 全仓类型检查         |
| `pnpm lint`         | ESLint               |
| `pnpm format:check` | Prettier 格式检查    |
| `pnpm test`         | Vitest 测试          |

## 施工纪律

1. 先读 `specs/PROJECT_INDEX.md`，确认当前节点与状态；
2. 再读 `specs/dev/DEV-XXX/INDEX.md`，确认当前 Task 与边界；
3. 规范正本位于 `specs/baseline/DEV_SPEC_V1.0.md`；
4. 通信与验收按 `specs/protocol/COMMS-PROTOCOL-V1.md` 执行。
