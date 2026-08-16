## 3. Scope

### Writable Scope

```
packages/chapter-compiler/package.json
packages/chapter-compiler/tsconfig.json
packages/chapter-compiler/src/index.ts
packages/chapter-compiler/src/types.ts
packages/chapter-compiler/src/types.test.ts
packages/chapter-compiler/src/loader.ts
packages/chapter-compiler/src/loader.test.ts
packages/chapter-compiler/src/pass1Schema.ts
packages/chapter-compiler/src/pass1Schema.test.ts
packages/chapter-compiler/src/pass1Uniqueness.ts
packages/chapter-compiler/src/pass1Uniqueness.test.ts
packages/chapter-compiler/src/referenceIndex.ts
packages/chapter-compiler/src/referenceIndex.test.ts
packages/chapter-compiler/src/pass2StoryGraph.ts
packages/chapter-compiler/src/pass2StoryGraph.test.ts
packages/chapter-compiler/src/pass2ActionChain.ts
packages/chapter-compiler/src/pass2ActionChain.test.ts
packages/chapter-compiler/src/pass2NpcVisuals.ts
packages/chapter-compiler/src/pass2NpcVisuals.test.ts
packages/chapter-compiler/src/pass2BossRecovery.ts
packages/chapter-compiler/src/pass2BossRecovery.test.ts
packages/chapter-compiler/src/compile.ts
packages/chapter-compiler/src/compile.test.ts
packages/chapter-compiler/test-fixtures/**

specs/dev/DEV-002/INDEX.md
specs/dev/DEV-002/REQUIREMENTS.md
specs/dev/DEV-002/ACCEPTANCE.md
specs/dev/DEV-002/REPORT.md
specs/dev/DEV-002/DECISIONS.md      （仅在需要记录决策时创建）
specs/dev/DEV-002/BLOCKERS.md       （仅在出现 blocker 时创建）

tsconfig.json                       （追加一行 references 指向 packages/chapter-compiler）

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
packages/shared/**           （冻结）
packages/chapter-schema/**   （DEV-001 冻结产物，只读引用，不修改）
packages/runtime-kernel/**   （DEV-008 冻结产物；本节点不依赖它，也不得修改）
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

### Forbidden Scope

```
packages/* 除 chapter-compiler 外的任何目录
apps/**
chapters/**    （真实内容目录，不得在此创建测试用途的示例章节；测试 fixture 一律放
                 packages/chapter-compiler/test-fixtures/）
assets/**
scripts/**
tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration
任何网络调用代码
```

---

## 6. Outputs

1. `packages/chapter-compiler`，`pnpm build` 产出完整 `.d.ts`
2. `loadChapterPack(rootDir: string): RawChapterPack`——从磁盘加载，JSON 语法错误转为结构化 `LoadIssue[]`，不 throw
3. `runPass1(raw: RawChapterPack): Pass1Result`——逐项 Zod 校验 + 集合内 id 去重
4. `runPass2(raw: RawChapterPack, pass1: Pass1Result): Pass2Result`——仅对 PASS1 通过的条目建立引用索引并校验交叉引用
5. `compile(rootDir: string): CompileResult`——串联以上三步的便捷入口
6. 覆盖全部 19 个内容分类的测试 fixture（1 份最小合法 Chapter Pack + 若干针对性损坏 fixture）
7. `specs/dev/DEV-002/` 四份（或五份）节点文档

---

## 9. Constraints

1. **零 Graph/Coverage/Hidden Information/Simulation 逻辑**——不得出现可达性分析、环检测、六等级覆盖枚举、`host.public` 穷举校验、随机仿真循环。这些字面上"顺手就能加"，但都是下游节点的冻结职责边界。
2. **零文件写入**。`compile()` 及其全部子函数只读文件系统，不写任何文件（不产出 Bundle 文件、不写缓存、不写日志文件）。
3. **零资产文件存在性检查**。不得调用 `fs.existsSync` 检查图片/音频/字幕等真实文件是否存在——那是 DEV-075。本节点只检查"引用的 id 在对应内容集合里有没有被声明"。
4. **PASS2 只处理 PASS1 通过的条目**，避免级联噪音（T011 Requirement #3）。
5. **`zod` 版本必须与 `chapter-schema` 完全一致**。
6. **不引入 glob 库**，用 `node:fs`/`node:path` 手写遍历。
7. **`packages/chapter-compiler` 不得依赖 `packages/runtime-kernel` 或 `packages/shared`**——编译期校验与运行时事件模型是两个关注点，没有理由耦合。
8. `CR-019`（getHealth 自落地起）不适用于本包——同 `chapter-schema`，纯批处理函数库，无运行时服务。
9. Windows 环境：脚本须 Git Bash 与 PowerShell 均可运行；路径拼接一律用 `path.join`，不得手写 `/` 分隔符字符串拼接。
10. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`（`blocking: true`），继续其它不受影响 Task，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现 PASS 3（图可达性、死路检测、环检测、Ending/Boss 可达性）——DEV-003。
- 不实现 PASS 4（六等级 Rule Coverage 模拟）——DEV-006。
- 不实现 PASS 5（State Path 是否声明/可创建的可达性分析）——DEV-003。**本节点明确不检查 `StatePath` 引用的 flag/chapterVariables/npc/danger 键是否存在**，这需要全局状态可达集合，属图分析范畴，非简单存在性查找。
- 不实现 PASS 6（`host.public.json` 白名单穷举、时序性、隔离性）——DEV-002A。
- 不实现 PASS 7 资产文件存在性——DEV-075。
- 不实现 PASS 8 仿真——DEV-007。
- 不组装"最终 Validated Runtime Bundle"（跨节点开放问题，见第 2 节）。
- 不实现 Compile–Repair Loop（第 26 节 AI Draft → Compiler → AI Repair 循环）——那是内容生产管线节点（DEV-072），本节点只负责被调用、产出结构化错误。
- 不创建 `chapters/` 目录或任何真实产品内容。
- 不修改 `packages/chapter-schema`、`packages/runtime-kernel`、`packages/shared`。
- 不引入并发/流式 IO、不引入 glob 库、不引入 CLI 入口（`scripts/` 禁止）。
