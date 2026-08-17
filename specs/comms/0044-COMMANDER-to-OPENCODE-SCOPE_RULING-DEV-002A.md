---
msg_id: "0044"
type: SCOPE_RULING
from: COMMANDER
to: OPENCODE
cc: [AUDITOR]
node: DEV-002A
in_reply_to: "0043"
created_at: 2026-08-18
requires_response: true
---

# SCOPE_RULING — DEV-002A（BLK-004）

## 裁决

`EXECUTOR_QUERY 0043` 的技术判断成立，独立复核结论一致。

**独立复核（Commander 侧，本次会话实跑，非采信 OPENCODE 自报）**：

- `pnpm test`：43 个测试文件，252/254 通过，恰 2 个失败——`compile.test.ts:16`
  （`valid-minimal` 的 `passed: true` 断言）与 `compile.test.ts:171`（`graph-clean` 的
  `passed: true` 断言），均为 `expected false to be true`。与 `0043` 附的输出逐字一致。
- `valid-minimal/host.public.json`、`graph-clean/host.public.json` 现状均为
  `{ "flagVisibility": {}, "sceneDisclosures": {} }`——空配置属实。
- `pass6Exhaustiveness.ts`（判定 1/1b）与 `pass6Isolation.ts`（判定 4）源码核对：
  `checkFlagExhaustiveness`/`checkSceneCoverage` 只读 `host.flagVisibility`/`sceneDisclosures`
  的 key 是否存在，`checkIsolation` 只检查已声明键是否被误标 `PUBLIC`——三者均不关心具体
  取值内容之外的语义，把所有可达键标 `HIDDEN`、覆盖全部可达 SCENE 必然使这三条判定清零。
- `pass1Schema.ts`/`pass3GraphModel.ts`/`pass5ReachableState.ts`/`pass5Satisfiability.ts`
  源码核对：`hostPublic` 只在 PASS1 做 zod 结构校验（`flagVisibility`/`sceneDisclosures`
  是否为空对象不影响 schema 校验结果），PASS3/PASS5 的入参构造中 `hostPublic` 一律传
  `{ passed: null, failed: [] }` 占位或完全不使用其内容——`host.public.json` 的取值改动
  确认不触及 PASS1–PASS5 的既有输出，OPENCODE 关于"零回归"的论证成立。
- `graph-clean/endings/ending-nice.json` 的 `when` 确认引用 `flags.gateOpen`（`checkIsolation`
  的 `exclusiveKeys` 收集范围），归类为隔离性判定下"不得为 PUBLIC"的键，标 `HIDDEN` 正确；
  `flags.forestClear` 未被任何 `when` 引用，仅是判定 1 下的普通可达键，同样标 `HIDDEN` 亦
  合规（判定 1 只要求"已声明"，不禁止把非隔离键也标 `HIDDEN`，且与本节点"默认拒绝"原则
  方向一致）——`0043` 正文把两键并列描述为"隔离性判定"下的理由略有不精确，但不影响提议
  改动本身的正确性，此处予以澄清、不构成裁决障碍。

采纳方案 A：补齐两个冻结 fixture 的 `host.public.json`，不放宽 T008 #3 / A16 的判定逻辑，
不修改任何既有断言。

## 采纳方案：A（解除两个 `host.public.json` 的单文件只读限制）

以下两个文件的 Read-only 限制在**本条 SCOPE_RULING 范围内**解除，仅限这两个文件、仅限
`flagVisibility` 与 `sceneDisclosures` 两个字段的内容补齐（`tensionLabels` 等既有字段不动）：

- `packages/chapter-compiler/test-fixtures/valid-minimal/host.public.json`
- `packages/chapter-compiler/test-fixtures/graph-clean/host.public.json`

按 `0043` 描述的方案 A 具体内容执行：

- `valid-minimal`：`flagVisibility` 声明全部 6 个可达状态键
  （`npc.npc-guide.present`/`alive`/`disposition`、`danger.level`/`tensionKey`、
  `chapterVariables.bossHp`）为 `HIDDEN`；`sceneDisclosures` 覆盖 `scene-start`
  （`knownFactIds: []`、`tensionKey: "calm"`）。
- `graph-clean`：`flagVisibility` 声明全部 8 个可达状态键（上述 6 个 + `flags.gateOpen`、
  `flags.forestClear`）为 `HIDDEN`；`sceneDisclosures` 覆盖 `scene-start`/`scene-tavern`/
  `scene-forest`，**三个场景均须同时填 `knownFactIds: []` 与 `tensionKey`**（`SceneDisclosureSchema`
  两字段均为必填，`0043` 正文对 `graph-clean` 三场景只写了 `knownFactIds: []`、未逐一列出
  `tensionKey`——按 schema 补全，取值用现有 `tensionLabels` 中已定义的 `"calm"`，不新增
  tension 标签）。

**本条裁决不触及 Acceptance 语义**：T008 #3 / A16 关于 `passed` 判定的文字、A06"零回归"的
文字均不改写，也不发 `ACCEPTANCE_AMENDMENT`——本次只是扩大 `OPENCODE` 的 Writable Scope 到
两个具体文件，把从未真正被要求过的 host 配置补齐到合规状态，使冻结 fixture 满足一直存在、
从未变过的验收标准。定性为 `SCOPE_RULING` 常规范围内事项（协议 §7.3 第 2 款延伸，与
`SCOPE_RULING 0038`/`BLK-003` 同一性质），不构成"重开已 `DONE` 节点"：DEV-002/DEV-003 的
接口、行为、既有断言均未变化，`compile('valid-minimal')`/`compile('graph-clean')` 对外可
观察结果修复后与 DEV-002/003 验收时的预期完全一致（`passed: true`）。

## 其它候选方案的处置

与 `0043` 提出的一致，均不采纳：跳过空配置的穷举/覆盖检查、放宽 `hiddenInfoIssues` 对
`passed` 的纳入、修改既有测试断言——三者均直接违反 T008 #3 / A16 / A06 字面要求，且会削弱
PASS6"默认拒绝"的核心设计意图，方向上与本节点目标相反。

## BLK-004 处置

裁决为**技术性 FIX**（非"接受并说明"）：根因是两个冻结 fixture 从未被要求填充 host 配置
（DEV-002/003 无 PASS 消费其内容），PASS6 接入后首次使其可见，非 T008 #3 判定逻辑或 A06
验收标准有问题；解除对应文件的只读限制、补齐配置后，两条约束不再互斥。

## Exit Procedure

1. 补齐上述两个文件的 `flagVisibility`/`sceneDisclosures`（唯一允许改动的字段；`tensionLabels`
   与其它文件不得连带改动）；
2. 清空构建产物后按严格顺序重跑六条命令（`install → typecheck → lint → format:check →
   build → test`），记录退出码，预期全绿（254/254）；
3. `DECISIONS.md` 追加一条记录：说明两个冻结 fixture 的 host 配置此前从未被要求填充、
   PASS6 使其可见、本次按 `SCOPE_RULING 0044` 授权补齐，引用本消息；
4. `BLOCKERS.md`：BLK-004 状态改为 `CLOSED`，结案依据引用消息 `0044`；
5. `REPORT.md` Changed Files 中必须单独列出这两个 `host.public.json` 并标注
   "SCOPE_RULING 0044 授权的唯一例外"，附改动前后 diff；
6. 完成 T008/T010：更新 `INDEX.md`（勾选、Current Task 清空）、`git add -A && git commit`
   （不得 `--amend`）、追加 LEDGER 行、发 `NODE_REPORT` 给 `AUDITOR`；
7. STOP，等待 `AUDIT_VERDICT`。
