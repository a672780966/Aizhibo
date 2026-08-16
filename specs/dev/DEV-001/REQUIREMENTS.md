## 3. Scope

### Writable Scope

```
packages/chapter-schema/package.json
packages/chapter-schema/tsconfig.json
packages/chapter-schema/src/index.ts
packages/chapter-schema/src/manifest.ts
packages/chapter-schema/src/manifest.test.ts
packages/chapter-schema/src/worldState.ts
packages/chapter-schema/src/worldState.test.ts
packages/chapter-schema/src/stateRules.ts
packages/chapter-schema/src/stateRules.test.ts
packages/chapter-schema/src/scene.ts
packages/chapter-schema/src/scene.test.ts
packages/chapter-schema/src/interaction.ts
packages/chapter-schema/src/interaction.test.ts
packages/chapter-schema/src/action.ts
packages/chapter-schema/src/dice.ts
packages/chapter-schema/src/action.test.ts
packages/chapter-schema/src/dice.test.ts
packages/chapter-schema/src/result.ts
packages/chapter-schema/src/result.test.ts
packages/chapter-schema/src/narrative.ts
packages/chapter-schema/src/narrative.test.ts
packages/chapter-schema/src/npc.ts
packages/chapter-schema/src/npc.test.ts
packages/chapter-schema/src/visuals.ts
packages/chapter-schema/src/visuals.test.ts
packages/chapter-schema/src/audio.ts
packages/chapter-schema/src/audio.test.ts
packages/chapter-schema/src/boss.ts
packages/chapter-schema/src/boss.test.ts
packages/chapter-schema/src/endings.ts
packages/chapter-schema/src/endings.test.ts
packages/chapter-schema/src/recovery.ts
packages/chapter-schema/src/recovery.test.ts
packages/chapter-schema/src/hostPublic.ts
packages/chapter-schema/src/hostPublic.test.ts
packages/chapter-schema/src/metadata.ts
packages/chapter-schema/src/metadata.test.ts
packages/chapter-schema/src/chapterPack.ts
packages/chapter-schema/src/chapterPack.test.ts

specs/dev/DEV-001/INDEX.md
specs/dev/DEV-001/REQUIREMENTS.md
specs/dev/DEV-001/ACCEPTANCE.md
specs/dev/DEV-001/REPORT.md
specs/dev/DEV-001/DECISIONS.md      （仅在需要记录决策时创建）
specs/dev/DEV-001/BLOCKERS.md       （仅在出现 blocker 时创建）

tsconfig.json                       （根 tsconfig 的 references 追加一行指向 packages/chapter-schema）

specs/comms/LEDGER.md               （仅追加行）
specs/comms/NNNN-OPENCODE-to-*.md   （仅自己发出的消息）
```

### Read-only Scope

```
specs/baseline/DEV_SPEC_V1.0.md
specs/audit/**
specs/protocol/**
specs/PROJECT_INDEX.md
specs/dev/DAG.md
specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
packages/shared/**                  （DEV-000 冻结产物，只读引用，不修改）
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts   （DEV-000 冻结基线，不修改）
```

### Forbidden Scope

```
packages/* 除 chapter-schema 外的任何目录
apps/**
chapters/**
assets/**
scripts/**
tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration
任何网络调用代码
```

---

## 6. Outputs

1. `packages/chapter-schema` 包，`pnpm build` 产出 `dist/` 与完整 `.d.ts`
2. 覆盖 Chapter Pack 全部 19 个内容分类（5 根文件 + 14 子目录，见 Dev Spec 第 19 节）的 Zod schema + 推导类型
3. 每个 schema 模块含正例（`.parse()` 成功）与至少一条反例（`.safeParse()` 失败）测试
4. `chapterPack.ts` 聚合导出：一个把全部文件级 schema 按 Dev Spec 第 19 节目录路径映射起来的类型，供 DEV-002 Compiler 直接消费
5. `specs/dev/DEV-001/` 四份（或五份）节点文档

---

## 9. Constraints

1. **零行为逻辑**。本包不得出现任何形如 `evaluate()`、`apply()`、`resolve()`、`compile()`、`parseChapterPack()`、`loadChapter()` 的函数——它们全部属于后续节点。本包只导出 Zod schema 与推导类型。
2. **零文件 IO**。不读取任何 `.json` 文件，不使用 `fs`。测试中的"正例/反例"一律是手写的 JS 对象字面量，不是从磁盘加载的 fixture 文件。
3. **零跨文件校验**。`.refine()` 只允许约束**同一 schema 内部**的字段关系（如 `min <= max`）；任何需要"查另一个文件是否存在"的校验一律不实现。
4. **不引入品牌类型**。所有 id 字段（`sceneId`、`chapterId`、`actionId` 等）均为 `z.string()`，不使用 `packages/shared` 的 `Brand<T,B>`。ADDENDUM-001/002 冻结的类型签名均以 `string` 声明 id，追加品牌类型需要改动已批准的签名，本节点无权自行决定。
5. **`Quality` 单一权威定义**，见 T009——不得在多个文件重复声明六等级字面量联合。
6. **每个模块同步导出 schema 与类型**（`XxxSchema` + `type Xxx = z.infer<typeof XxxSchema>`），不得手写脱离 Zod 推导的独立 `interface`。
7. **`CR-019`（getHealth 自落地起）不适用于本包**——见 `ADDENDUM-002 §6`，纯数据包无运行时服务可报告健康状态。`AUDITOR` 不应将缺少 `getHealth()` 判为缺陷。
8. Windows 环境：脚本须 Git Bash 与 PowerShell 均可运行。
9. 依赖最小化：本包 `dependencies` 只允许 `zod`。`devDependencies` 沿用 DEV-000 白名单，不新增。
10. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`（`blocking: true`），继续其它不受影响 Task，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现 Chapter Compiler 的任何 PASS（1–8），不实现引用校验、图可达性、Coverage 检查、Hidden Information 检查——全部属 DEV-002 / DEV-002A / DEV-003 / DEV-006。
- 不实现 Condition 求值函数或 StateEffect 应用函数——属 DEV-004。
- 不实现骰子随机数生成或 `finalValue → quality` 查表逻辑——属 DEV-005。
- 不实现叙事块拼装逻辑——属 DEV-033。
- 不创建任何示例/参考 Chapter Pack（`chapters/` 目录、完整的多文件 JSON 示例）——留给需要真实内容验证自身的后续节点（如 DEV-002 或 DEV-007）按需构建，本节点的测试 fixture 仅为内联 JS 对象。
- 不实现 `ForbiddenLexicon`（DEV-002A 的运行时产物，不是作者输入）。
- 不实现 `ViewerState` 的 Zod schema（不在 Chapter Pack 目录结构内，延后到实际需要它的节点）。
- 不修改 `packages/shared`。
- 不引入品牌类型、不引入表达式语言、不引入新状态容器（沿用 ADDENDUM-001 起草纪律）。
- 不为镜头设计 DSL（D07）。
- 不为 Boss 设计独立战斗系统字段（D08）。
- 不实现任何 CI 变更（DEV-000 的 CI 步骤对新包自动生效，因为它们跑的是根级命令）。

---
