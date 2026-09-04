# TASK PACKAGE — DEV-050A

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-050A |
| Node Name | Host Egress Gate |
| Milestone | M5 — AI Host Complete（第二个节点，CR-010） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-002A（DONE，`verdict_ref: "0046"`）——`ForbiddenLexicon` 冻结产物；DEV-050（DONE，`verdict_ref: "0211"`）——G06 第三道防线的姊妹节点 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：`ForbiddenLexicon` 已冻结但从未被任何运行时代码消费；`packages/ai-host` 全仓库尚不存在

`packages/chapter-compiler/src/pass6ForbiddenLexicon.ts`（DEV-002A
冻结）已导出 `ForbiddenLexicon = { bySceneId: Record<sceneId,
string[]>, always: string[] }`——每个可达场景"此刻不该被说出口的
专有名词"（ending 标题/boss 显示名，仅结构化字段来源，不做全文本
扫描）。该文件注释原文明确"normalization / DROP rules are DEV-050A's
job in M5"——本节点是这份数据第一个真正的消费方。`DAG.md` 第
298-333 行 **DEV-050A（CR-010）** 是本节点唯一权威规格来源：
"Egress Gate 先于所有 Host 功能节点施工"，本节点也是全仓库第一次
创建 `packages/ai-host`。

### 范围核对：五道检查全部确定性、零 LLM；C1 的"当前权限档位"由调用方传入，不在本节点内计算

第 39 节"Host Permission"三档（ALLOWED/LIMITED/MUTED）的判定依据
是叙事时刻描述（"Choice Wait"/"Master Narration"等），这些描述在
现有 `runtime-kernel` 里没有对应的具名访问器（`storyPhase`/
`interactionPhase` 是状态机状态名，不是叙事时刻分类）——**判定"此刻
是什么权限档位"不是本节点职责**，本节点的 Gate 只消费一个已经算好
的 `permission: 'ALLOWED'|'LIMITED'|'MUTED'` 参数（`MUTED` 直接丢弃，
"权限判定只此一处"指的是"由权限值决定 ALLOW/DROP 只此一处"，不是
"计算权限值只此一处"）；"此刻该是什么权限"留给未来的 Host
Scheduler（DEV-055）或更后续的编排节点。C3"平台合规"的
denylist——DAG 原文"按平台分文件的配置，非代码"——本节点不发明
配置文件加载机制，`platformDenylist` 作为构造参数注入（正则/字符串
数组），文件从磁盘加载是未来集成节点的职责。`HOST.UTTERANCE_DROPPED`
事件——本节点的 `attempt()` 返回值携带完整的
`{rule, matchedTerm, phase}` 信息，但**不**把它写入
`runtime-kernel` 的事件日志（那需要一个新的"外部注入事件"访问器，
超出本节点范围，留给未来编排节点）。

---

## 2. 架构设计

### 2.1 `packages/ai-host/src/egressGate.ts`（新包首个文件）

```typescript
import type { ForbiddenLexicon } from '@interactive-story/chapter-compiler';

export type HostPermission = 'ALLOWED' | 'LIMITED' | 'MUTED';

export type EgressDropRule =
  | 'PERMISSION'
  | 'HIDDEN_LEXICON'
  | 'PLATFORM_DENYLIST'
  | 'DUPLICATE'
  | 'LENGTH'
  | 'RATE_LIMIT';

export type EgressDecision =
  | { decision: 'ALLOW' }
  | { decision: 'DROP'; rule: EgressDropRule; matchedTerm?: string };

export interface EgressAttemptInput {
  text: string;
  sceneId: string;
  permission: HostPermission;
}

export interface EgressGateConfig {
  forbiddenLexicon: ForbiddenLexicon;
  platformDenylist?: RegExp[];
  recentLinesLimit?: number;
  maxLineLength?: number;
  rateLimit?: { maxLines: number; windowMs: number };
  clock?: { now(): number };
}

export interface EgressGate {
  attempt(input: EgressAttemptInput): EgressDecision;
}

export function createEgressGate(config: EgressGateConfig): EgressGate;
```

- 检查顺序 C1→C5，**第一个命中的规则立即 DROP**（短路，不叠加判定）：
  1. **C1 Permission**：`permission === 'MUTED'` → `DROP{rule:'PERMISSION'}`。
     `LIMITED`/`ALLOWED` 都放行到下一关（本节点不区分 `LIMITED` 的
     额外限制——Dev Spec 未给出 `LIMITED` 专属规则，不发明）。
  2. **C2 Hidden 词表**：把 `text` 规范化（`trim().toLowerCase()`），
     对 `forbiddenLexicon.always` 与
     `forbiddenLexicon.bySceneId[sceneId] ?? []` 里每个词同样规范化后
     做子串匹配（`normalizedText.includes(normalizedTerm)`），命中
     任一 → `DROP{rule:'HIDDEN_LEXICON', matchedTerm: 原始词}`。
  3. **C3 平台合规**：`config.platformDenylist`（缺省 `[]`）逐条
     `RegExp.test(text)`，命中 → `DROP{rule:'PLATFORM_DENYLIST',
     matchedTerm: 命中的 pattern.source}`。
  4. **C4 重复与刷屏**：内部维护一个最近 `recentLinesLimit`（缺省
     20）条**已放行**文本的环形缓冲（规范化后比较），命中 →
     `DROP{rule:'DUPLICATE'}`。
  5. **C5 长度与频率**：`text.length > maxLineLength`（缺省 200）→
     `DROP{rule:'LENGTH'}`；否则用 `config.clock`（缺省
     `Date.now`）+ `rateLimit`（缺省 `{maxLines:5, windowMs:60000}`）
     维护一个滑动窗口时间戳数组，窗口内已放行条数达到上限 →
     `DROP{rule:'RATE_LIMIT'}`。
  - 全部通过 → `{decision:'ALLOW'}`，并把这次的时间戳/文本计入 C4
    环形缓冲与 C5 时间戳数组（只有真正 ALLOW 的才计入，DROP 的不算
    "已放行"，避免攻击者用大量必被拒的消息把频率窗口占满从而误伤
    后续合法消息）。
- **不改写文本**（不做任何字符串替换/脱敏，命中即整条丢弃）；**不
  重试**；**判定结果只有 `ALLOW`/`DROP` 两种**，不返回除
  `rule`/`matchedTerm` 外的其他诊断信息。
- **零 LLM**：全部检查是确定性字符串/正则/计数操作。

---

## 3. Scope

### Writable Scope

```
packages/ai-host/package.json                （新增，模仿 platform-core 结构）
packages/ai-host/tsconfig.json                （新增）
packages/ai-host/src/index.ts                 （新增）
packages/ai-host/src/egressGate.ts            （新增）
packages/ai-host/src/egressGate.test.ts       （新增）
tsconfig.json（根，references 追加 ai-host，排在 chapter-compiler 之后）
pnpm-workspace.yaml（若需要显式列出包路径，先核实是否已用 glob 覆盖，只在必要时改动）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-050A/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 7）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/chapter-compiler/src/pass6ForbiddenLexicon.ts（DEV-002A 冻结，只读取 ForbiddenLexicon 形状）
packages/chapter-compiler/src/index.ts（Read-only，核对 ForbiddenLexicon 从此导出）
packages/platform-core/package.json/tsconfig.json（Read-only，新包结构参照）
其余同既有节点惯例
```

### Forbidden Scope

```
修改 packages/chapter-compiler/**、packages/runtime-kernel/**（含 DEV-050 刚交付的 publicState.ts）
把 Egress Gate 接入 runtime-kernel 事件日志（HOST.UTTERANCE_DROPPED 写入日志留给未来节点）
计算/推断当前 Host Permission 档位（第 39 节判定逻辑，留给未来 Host Scheduler）
实现文本改写/脱敏/重试
加载真实平台配置文件（denylist 作为构造参数注入，不发明文件格式）
接入 DEV-046 Send Chat / DEV-057 Host TTS（尚未创建/尚未轮到，未来集成节点职责）
新增除 ai-host 外的任何新包
新增第三方 npm 依赖
```

---

## 4. Required Skills

### Required

- 纯函数式确定性字符串/正则匹配、环形缓冲、滑动窗口频率限制

### Forbidden / Unnecessary

- 任何 LLM/AI SDK 依赖
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/dev/DAG.md` 第 298-333 行 | DEV-050A 唯一权威规格（五道检查、ALLOW\|DROP、事件字段） |
| `packages/chapter-compiler/src/pass6ForbiddenLexicon.ts`（Read-only，冻结） | `ForbiddenLexicon` 形状 |
| `packages/platform-core/package.json`/`tsconfig.json`（Read-only） | 新包结构参照（同类"纯类型/纯函数、零外部依赖"新包先例） |

---

## 6. Outputs

1. `packages/ai-host` 新包：`createEgressGate`/`EgressGate`/
   `EgressGateConfig`/`EgressAttemptInput`/`EgressDecision`/
   `HostPermission`/`EgressDropRule`
2. `specs/dev/DEV-050A/DECISIONS.md`，至少覆盖：为何权限档位由调用方
   传入而非本节点计算、为何不接入 runtime-kernel 事件日志、C4/C5
   参数缺省值选择理由、为何只对已放行文本计入频率窗口

---

## 7. Task Breakdown

### T001 — 新包骨架 + 节点文档

- **Allowed Files**：`packages/ai-host/package.json`、`tsconfig.json`、
  `src/index.ts`（占位）、根 `tsconfig.json`（追加 references）、
  `specs/dev/DEV-050A/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Requirements**：`package.json` 参照 `platform-core` 结构，
  `name: "@interactive-story/ai-host"`；依赖里加
  `"@interactive-story/chapter-compiler": "workspace:*"`（仅为取
  `ForbiddenLexicon` 类型）；根 `tsconfig.json` 的 `references`
  数组里 `ai-host` 排在 `chapter-compiler` 之后（与 DEV-042 教训
  一致：被依赖方必须排在前面）。
- **Acceptance**：`pnpm install` 后 `pnpm -F @interactive-story/ai-host
  build` 能跑通空壳（`src/index.ts` 先放一行占位导出或空文件）；四份
  节点文档存在；`INDEX.md` 含 Task Order T001–T003。

---

### T002 — `egressGate.ts` 实现 + 测试

- **Allowed Files**：`packages/ai-host/src/egressGate.ts`、`.test.ts`
- **Requirements**：按第 2.1 节实现，C1→C5 顺序短路判定。
- **Acceptance（功能部分）**：
  - `permission:'MUTED'` → 恒定 `DROP{rule:'PERMISSION'}`，即使文本
    完全无害。
  - `permission:'ALLOWED'`，文本包含 `forbiddenLexicon.always` 里的
    词（大小写/前后空白容错）→ `DROP{rule:'HIDDEN_LEXICON',
    matchedTerm}`；包含 `bySceneId[sceneId]` 里的词同理；不在这两个
    列表里的词不触发。
  - `platformDenylist` 命中某正则 → `DROP{rule:'PLATFORM_DENYLIST'}`；
    未命中且未配置时不影响放行。
  - 连续放行两条完全相同（含大小写/空白差异后规范化相同）的文本 →
    第二条 `DROP{rule:'DUPLICATE'}`；两条不同文本均放行。
  - 超过 `maxLineLength` → `DROP{rule:'LENGTH'}`。
  - 用注入 `clock` 快进/控制时间：窗口内放行条数达到 `rateLimit.
    maxLines` → 下一条 `DROP{rule:'RATE_LIMIT'}`；超过
    `windowMs` 后时间戳过期，恢复放行。
  - 被 DROP 的尝试不计入 C4 环形缓冲/C5 频率窗口（用"先制造多条必被
    拒绝的重复内容，确认它们不会把频率窗口占满导致后续合法消息被
    误伤"的场景验证）。
  - 五项检查的短路顺序：构造一个同时会触发 C2 与 C5（比如既超长
    又含禁词）的输入，断言返回的 `rule` 是 **C2**（顺序在前的先
    命中）。
  - `EgressGateConfig` 全部可选字段缺省值符合第 2.1 节所写（20/200/
    5 条每 60 秒）。
- **Requirements（回归部分）**：`pnpm test` 全量跑通，既有全部包
  测试零改动通过。

---

### T003 — `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/ai-host/src/index.ts`、`pnpm-lock.yaml`、
  `specs/dev/DEV-050A/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：
  1. `index.ts` 导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  5. 更新 `INDEX.md`：T001–T003 全部勾选，`Status:` 从 `IN_PROGRESS` 改为 `READY_FOR_REVIEW`。
  6. `git add`（仅本节点 Writable Scope 内文件，不要用 `git add -A`）
     `&& git commit`，提交信息首行：
     `DEV-050A: host egress gate (write-side safety boundary)`。
     **恰 1 条提交**。
  7. **不要**再单独提交 LEDGER 追加行或自己的 NODE_REPORT 消息文件——
     写入工作区留给 Commander 收尾统一提交。
  8. 追加 LEDGER 行、写好
     `NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-050A.md` 消息文件——
     都不要提交，只是写入工作区。
  9. **在结束前自行核实**：`git log -1` 只看到步骤 6 那一条提交、
     NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  10. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-050A INDEX

Status: IN_PROGRESS

## Current Node

DEV-050A — Host Egress Gate

## Objective

新建 `packages/ai-host` 首个文件 `egressGate.ts`：五道确定性检查
（C1 权限档位由调用方传入/C2 Hidden 词表消费 DEV-002A 的
`ForbiddenLexicon`/C3 平台 denylist 注入/C4 重复去重/C5 长度与频率）
短路判定 `ALLOW|DROP`。不改写不重试；不计算权限档位本身；不接入
`runtime-kernel` 事件日志；不加载真实平台配置文件；不接入
`DEV-046`/`DEV-057`（未来集成节点职责）。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 新包骨架 + 节点文档
- [ ] T002 egressGate.ts 实现 + 测试
- [ ] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **五道检查按 C1→C5 顺序短路判定**，第一个命中的规则即为结果，不
   叠加/不重新排序。
2. **不计算/推断 Host Permission 档位本身**——`permission` 是调用方
   传入的既定值。
3. **不改写文本、不重试**，判定结果只有 `ALLOW`/`DROP`。
4. **只有真正 ALLOW 的尝试才计入 C4/C5 的历史状态**。
5. **不接入 `runtime-kernel` 事件日志**（`HOST.UTTERANCE_DROPPED`
   写入日志留给未来编排节点）。
6. **不新增除 `ai-host` 外的任何新包，不新增第三方 npm 依赖**。
7. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
8. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
9. **T003 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不
   要再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- 不计算当前 Host Permission 档位（第 39 节判定逻辑，未来 Host
  Scheduler 职责）。
- 不加载真实平台 denylist 配置文件（作为构造参数注入）。
- 不接入 `runtime-kernel` 事件日志/`DEV-046`/`DEV-057`。
- 不实现文本改写/脱敏/重试。

---

## 11. Tests

### Unit tests

T002：C1-C5 各自的 DROP 场景 + 全部通过的 ALLOW 场景 + 短路顺序
验证 + DROP 不计入历史状态 + 缺省值验证。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归（本节点是纯新增
包，不修改任何既有文件除根 `tsconfig.json` 追加 references）。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `permission:'MUTED'` 恒定 DROP（PERMISSION），与文本内容无关 | 测试检查 |
| A08 | 命中 `forbiddenLexicon.always`/`bySceneId` → DROP（HIDDEN_LEXICON），大小写/空白容错 | 测试检查 |
| A09 | 命中 `platformDenylist` → DROP（PLATFORM_DENYLIST） | 测试检查 |
| A10 | 重复文本（规范化后相同）第二次 → DROP（DUPLICATE） | 测试检查 |
| A11 | 超长文本 → DROP（LENGTH） | 测试检查 |
| A12 | 频率超限 → DROP（RATE_LIMIT），窗口过期后恢复放行 | 测试检查 |
| A13 | 被 DROP 的尝试不计入 C4/C5 历史状态 | 测试检查 |
| A14 | 同时触发多条规则时按 C1→C5 顺序返回最先命中的 rule | 测试检查 |
| A15 | 全部通过 → `{decision:'ALLOW'}` | 测试检查 |
| A16 | 可选配置项缺省值符合第 2.1 节（20/200/5-per-60000ms） | 测试检查 |
| A17 | `packages/chapter-compiler/**`、`packages/runtime-kernel/**` 未被修改 | git diff 比对 |
| A18 | 未接入 runtime-kernel 事件日志/DEV-046/DEV-057 | 源码检查 |
| A19 | 未新增第三方 npm 依赖；未创建 `ai-host` 外的新包 | 文件检查 |
| A20 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A21 | `specs/dev/DEV-050A/` 节点文档齐全，`INDEX.md` T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A22 | `git log` 新增恰 1 条提交，首行 `DEV-050A: host egress gate (write-side safety boundary)` | 命令 |
| A23 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A24 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT →
自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A24。
