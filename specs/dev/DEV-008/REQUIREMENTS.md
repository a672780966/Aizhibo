## 3. Scope

### Writable Scope

```
packages/runtime-kernel/package.json
packages/runtime-kernel/tsconfig.json
packages/runtime-kernel/src/index.ts
packages/runtime-kernel/src/index.test.ts
packages/runtime-kernel/src/event.ts
packages/runtime-kernel/src/event.test.ts
packages/runtime-kernel/src/diceEvent.ts
packages/runtime-kernel/src/diceEvent.test.ts

specs/dev/DEV-008/INDEX.md
specs/dev/DEV-008/REQUIREMENTS.md
specs/dev/DEV-008/ACCEPTANCE.md
specs/dev/DEV-008/REPORT.md
specs/dev/DEV-008/DECISIONS.md      （仅在需要记录决策时创建）
specs/dev/DEV-008/BLOCKERS.md       （仅在出现 blocker 时创建）

tsconfig.json                       （根 tsconfig 的 references 追加一行指向 packages/runtime-kernel）

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
packages/chapter-schema/**          （DEV-001 冻结产物，本节点不引用它，仅明确列为只读防误改）
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts   （DEV-000 冻结基线，不修改）
specs/dev/DEV-000/**、specs/dev/DEV-001/**   （已 DONE 节点的节点文档与 VERDICT，冻结，不得修改）
.claude/**                          （Commander / AUDITOR 工具链目录，不得写入；构建/格式化命令作用范围须排除本目录，DEV-000 F-02 教训）
```

### Forbidden Scope

```
packages/* 除 runtime-kernel 外的任何目录
apps/**
chapters/**
assets/**
scripts/**
tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration
任何网络调用代码
任何 XState 或其它状态机运行时依赖 / 代码
任何 PRNG / 随机数生成算法实现
```

---

## 6. Outputs

1. `packages/runtime-kernel` 包（本阶段仅含事件类型），`pnpm build` 产出 `dist/` 与完整 `.d.ts`
2. `RuntimeEvent` 统一信封：`id`/`sequence`/`timestamp`/`type`/`payload`/`chapterId`/`sessionId`/`visibility`（第 16 节 + CR-008 可见性分类要求）
3. 骰子事件族：`DICE.REQUESTED`/`DICE.ROLLED`/`DICE.PUBLISHED` 三个可辨识联合分支，`ROLLED`/`PUBLISHED` 均携带第 8 节六字段（`seed`/`rollIndex`/`diceType`/`rawValue`/`modifier`/`finalValue`）
4. 每个模块含正例（`.parse()` 成功）与至少一条反例（`.safeParse()` 失败）测试
5. `specs/dev/DEV-008/` 四份（或五份）节点文档

---

## 9. Constraints

1. **零行为逻辑**。本包不得出现任何形如 `emit()`、`dispatch()`、`publish()`、`append()`、`replay()`、`rollDice()`、`generateSeed()` 的函数——全部属于后续节点。
2. **零文件 IO、零网络调用**。不读取任何文件，不使用 `fs`，不发起任何请求。
3. **零跨文件/跨节点校验**。不校验 `actionId` 是否真的存在于某个 Chapter Pack，不引用 `packages/chapter-schema` 的任何类型。
4. **不引入品牌类型**。所有 id 字段（`id`、`chapterId`、`sessionId`、`actionId`）均为 `z.string()`，不使用 `packages/shared` 的 `Brand<T,B>`。
5. **`visibility` 为必填字面量**，不得设为 `.optional()` 或宽松的 `z.string()`——这是 CR-008 要求的类型层防线，宽松会使其失去意义。
6. **`CR-019`（`getHealth()` 自落地起）暂不适用于本包**——本阶段零行为逻辑，无运行时服务，参照 `DEV-001` Constraints 第 7 条的同一豁免理由。`DEV-009` 在同一包内补充真实 Kernel 行为时，`getHealth()` 义务随之生效，不属本节点范围。
7. 依赖最小化：本包 `dependencies` 只允许 `zod`。`devDependencies` 沿用 DEV-000 白名单，不新增。
8. Windows 环境：脚本须 Git Bash 与 PowerShell 均可运行。
9. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`（`blocking: true`），继续其它不受影响 Task，等 `SCOPE_RULING`。
10. **提交纪律**：`INDEX.md` 与 `REPORT.md` 必须在 commit **之前**达到最终态。commit 之后除 LEDGER 追加行与新建的 `NODE_REPORT` 消息文件外，不得再修改任何 Writable Scope 内文件；若必须修改，只能通过新的独立 commit 完成，禁止 `git commit --amend`。

---

## 10. Non-goals / Out-of-scope

- 不实现 PRNG / 随机数生成、不实现"从 `seed` 计算 `rawValue`/`finalValue`"的任何函数——属 `DEV-005`。
- 不实现事件总线、dispatch、观察者模式、任何形式的 pub/sub 运行时——属 `DEV-009`。
- 不实现 Event Store 的追加/读取/序列号分配、不涉及 SQLite——属 `DEV-010`（`event-engine` 职责的接收方，`CR-016`）。
- 不实现 Deterministic Replay 的重建逻辑——属 `DEV-011`。
- 不实现 Snapshot / Checkpoint（第 17 节）、不实现 LKG（第 18 节）——属 `DEV-009` / `DEV-010`。
- 不定义 Dice 之外的任何业务事件（`STORY.*`、`INTERACTION.*`、`RESULT.*`、`SCENE.*` 等）——这些由拥有对应领域的节点（`DEV-004`/`DEV-006`/`DEV-009`/`DEV-033` 等）在各自 Task Package 中基于本节点交付的 `RuntimeEventSchema` 信封自行 `.extend()`，本节点不得代为发明或预留占位类型。
- 不创建 `packages/persistence`、不复活 `packages/event-engine`。
- 不修改 `packages/shared`、`packages/chapter-schema`。
- 不引入品牌类型、不引入 XState 或任何状态机依赖。
- 不实现任何 CI 变更（DEV-000 的 CI 步骤对新包自动生效）。

---
