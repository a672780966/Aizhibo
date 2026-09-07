# TASK PACKAGE — DEV-062

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-062 |
| Node Name | Error Registry |
| Milestone | M6 — Operations（第三个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | 新建 `packages/error-registry`；零依赖（不 import 任何既有包） |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：Dev Spec 第 62 节（`specs/baseline/DEV_SPEC_V1.0.md` 第 2726-2727 行）只有标题，零正文；`specs/dev/DAG.md` 第 400 行备注栏也是空的——唯一权威依据是第 56 节"故障等级"

第 56 节（第 1968-2025 行）定义了四个故障等级 `L1`–`L4`，每级都举了
几个**示例**错误类别与一句处理方针：

```
L1 非关键：Host LLM error / Host TTS error / Viewer memory error
   → 忽略，故事继续。
L2 演出降级：Story TTS unavailable / Visual minor asset missing
   → Subtitle / 固定音频 / fallback asset。
L3 Runtime 可恢复：Renderer crash / Twitch disconnect / Runtime process restart
   → 自动恢复。
L4 Chapter Integrity failure
   → Failover Scene + Operator intervention。
```

"Error Registry"这个节点名，结合第 56 节，唯一站得住脚的职责就是：
**提供一个可以把发生的错误按这四个等级记录下来、可以读回的通用
原语**。第 56 节每一级后面的"处理"方针（忽略/降级/自动恢复/
Failover+Operator）都是**未来节点的职责**（L2 降级已有 DEV-023
Subtitle 存在；L3 自动恢复是 DEV-063 Watchdog；L4 Failover 是
DEV-065/DEV-066/DEV-067）——本节点**只记录、不处理**，同 DEV-061
"Health Registry 只聚合、不驱动"一脉相承。

### 范围裁决：`category` 是自由文本，不是封闭枚举——第 56 节每级列出的错误类别是举例（"非关键：Host LLM error / ..."），不是穷尽的分类清单

同 DEV-053 `HostMood.label`"不发明封闭取值集合"的取舍：第 56 节
用"："后跟几个例子的写法（不是"仅限于以下"），未来任何模块都可能
产生一个当前清单里没列出的新错误类别，把 `category` 写成封闭枚举
会立刻过时。`level`（`L1`–`L4`）本身是 Dev Spec 明确给出的封闭
四值集合，可以做成字面量类型；但"哪个 category 具体属于哪个
level"是调用方（未来集成节点）的判断，本节点不做任何映射表去
"自动推断"某个 category 应该是哪个 level——同 DEV-055 只实现
明确规则、不发明未定义组合逻辑的精神一致。

### 范围裁决：纯内存记录，不接入 persistence，不新建任何 HTTP 端点

同 DEV-061 的现实约束：仓库里没有任何生产入口进程可以把这个
registry 的真实错误来源（Host LLM/TTS、Renderer、Twitch 连接等）
接进来长期运行，本节点只交付通用原语。

---

## 2. 架构设计

### 2.1 `packages/error-registry`（新包）

```typescript
export type ErrorLevel = 'L1' | 'L2' | 'L3' | 'L4';

export interface ErrorRecordInput {
  level: ErrorLevel;
  category: string;
  message: string;
}

export interface ErrorRecord extends ErrorRecordInput {
  id: string;
  timestamp: string;
}

export interface ErrorRegistry {
  record(input: ErrorRecordInput): ErrorRecord;
  list(): readonly ErrorRecord[];
}

export function createErrorRegistry(): ErrorRegistry {
  const records: ErrorRecord[] = [];
  let counter = 0;
  return {
    record(input) {
      counter += 1;
      const record: ErrorRecord = {
        ...input,
        id: `err-${counter}`,
        timestamp: new Date().toISOString(),
      };
      records.push(record);
      return record;
    },
    list() {
      return records.slice();
    },
  };
}
```

- `ErrorLevel`：Dev Spec 第 56 节明确给出的封闭四值集合
  （`L1`/`L2`/`L3`/`L4`），可以做成字面量联合类型——这不是发明，
  是抄录规范原文的封闭集合。
- `category`/`message`：均为自由文本 `string`，不做封闭枚举、不做
  "category→level 自动推断"映射表（见上方范围裁决）。
- `record()`：追加式写入，自动分配 `id`（格式 `err-${序号}`，序号
  从 1 开始严格递增，同一个 registry 实例内不重复）与 `timestamp`
  （`new Date().toISOString()`，同 `operatorOverrideLog.ts` 的既有
  写法，不注入 clock——本节点不需要在测试里精确控制时间点，只需要
  验证时间戳字段存在且格式正确）。返回刚写入的完整 `ErrorRecord`。
- `list()`：返回当前全部记录的**副本数组**（`.slice()`），按
  `record()` 调用顺序排列，不做任何按 `level`/`category` 过滤——
  Dev Spec 未定义任何查询/过滤需求，不发明。
- **纯内存、零依赖**：不 import 任何既有 workspace 包（甚至不需要
  `@interactive-story/shared`，因为 `ErrorLevel`/`ErrorRecord` 是
  本节点自定义的独立类型，不复用 `Health`）。不接入
  `persistence`，不新建任何 HTTP 端点，不接入 `operator-api`。
  不实现第 56 节任何一级的"处理"方针（忽略/降级/自动恢复/
  Failover+Operator）。

---

## 3. Scope

### Writable Scope

```
packages/error-registry/package.json            （新增）
packages/error-registry/tsconfig.json            （新增）
packages/error-registry/src/index.ts             （新增）
packages/error-registry/src/errorRegistry.ts       （新增）
packages/error-registry/src/errorRegistry.test.ts  （新增）
tsconfig.json                                       （根，追加一条 references 条目）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-062/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
（本节点不需要读取任何既有包源码作为实现依据，第 56 节本身即权威依据）
```

### Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
接入 packages/persistence（不做落库）
新建任何 HTTP 端点或接入 packages/operator-api
实现第 56 节任何一级的"处理"方针（忽略/降级/自动恢复/Failover+Operator intervention）
把 category 做成封闭枚举，或实现任何 category→level 自动推断逻辑
新增第三方 npm 依赖
```

---

## 4. Required Skills

### Required

- 纯 TypeScript，追加式内存数组记录 + 自增 id，无外部依赖

### Forbidden / Unnecessary

- 任何持久化/网络/框架依赖
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 1968-2025 行（第 56 节 故障等级） | `L1`–`L4` 封闭四值集合与"记录不处理"范围裁定的唯一权威来源 |
| `specs/dev/DAG.md` 第 400 行（DEV-062，备注为空） | 确认 Dev Spec/DAG 均未给出任何额外范围约束 |

---

## 6. Outputs

1. `ErrorLevel`/`ErrorRecordInput`/`ErrorRecord`/`ErrorRegistry`/
   `createErrorRegistry`（`errorRegistry.ts`）
2. `specs/dev/DEV-062/DECISIONS.md`，至少覆盖：为何 `category` 是
   自由文本不是封闭枚举、为何本节点只记录不处理（第 56 节四级的
   "处理"方针留给未来节点）、为何不接入 `persistence`/不建 HTTP
   端点、为何 `id`/`timestamp` 用自增序号+`Date.toISOString()`
   而不注入 clock

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-062/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T002。

---

### T002 — `error-registry` 包 + 测试 + 根 tsconfig 引用 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/error-registry/{package.json,tsconfig.json,src/index.ts,src/errorRegistry.ts,src/errorRegistry.test.ts}`、根 `tsconfig.json`、`specs/dev/DEV-062/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2.1 节实现；`package.json`（`name:
  "@interactive-story/error-registry"`，**零** `dependencies`
  字段或空对象——不依赖任何 workspace 包）/`tsconfig.json` 结构
  对齐 `packages/health-registry/`；根 `tsconfig.json` 的
  `references` 数组末尾（`health-registry` 之后）追加
  `{ "path": "./packages/error-registry" }`。
- **Acceptance（功能部分）**：
  - `record({level:'L1', category:'Host LLM error', message:'...'})` 返回的 `ErrorRecord` 包含全部输入字段原样保留 + 新增 `id`（非空字符串）+ `timestamp`（合法 ISO 时间字符串，可用 `new Date(x).toISOString() === x` 验证格式）。
  - 连续调用 `record()` 三次，三次返回的 `id` 两两不同。
  - `list()` 在任何 `record()` 调用之前返回空数组 `[]`。
  - 连续 `record()` 两次后，`list()` 返回长度为 2 的数组，且顺序与调用顺序一致（第一次调用的记录在数组更靠前的位置）。
  - `list()` 返回的数组是副本：对其返回值做 `.push()`（或任何变更）不影响下一次 `list()` 调用的结果。
  - 对四个等级 `L1`/`L2`/`L3`/`L4` 各 `record` 一次，`list()` 返回的四条记录 `level` 字段与输入逐一对应（证明四值类型全部可用）。
- **Requirements（回归部分）**：`pnpm test` 全量跑通，既有全部包测试零改动通过。
- **Requirements（验证部分）**：
  1. `index.ts` 导出 `errorRegistry.ts` 的全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. **写入（不提交）** `specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-062.md` 消息文件与 `specs/comms/LEDGER.md` 追加行（msg_id 取当前最大序号 + 1）。
  7. `git add`（仅本节点 Writable Scope 内文件，**不包含** LEDGER.md 与刚写的 NODE_REPORT 消息文件）`&& git commit`，首行：`DEV-062: error registry (record-only, L1-L4 closed level type, free-text category, no handling logic)`，**恰 1 条提交**。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交；**工作区不得残留任何本次施工产生的临时/草稿文件**。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-062 INDEX

Status: IN_PROGRESS

## Current Node

DEV-062 — Error Registry

## Objective

新建 `packages/error-registry`：`ErrorLevel`（`L1`–`L4`，第 56 节
封闭四值集合）+ `record`/`list` 记录原语。第 62 节本身零正文，
DAG.md 备注为空，唯一权威范围来自第 56 节"故障等级"——本节点只
记录、不处理（忽略/降级/自动恢复/Failover 是未来节点的职责）。
`category` 为自由文本，不做封闭枚举/自动推断。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 error-registry 包 + 测试 + 根 tsconfig 引用 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**；工作区不得残留任何
施工用临时文件。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **只记录，不实现任何处理逻辑**——第 56 节四级的"处理"方针一律
   不在本节点实现。
2. **`category` 为自由文本**，不做封闭枚举或 category→level 自动
   推断映射。
3. **不接入 `persistence`，不新建任何 HTTP 端点**。
4. **零 workspace 依赖**，不新增任何第三方 npm 依赖。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
7. **T002 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不
   要再提交**——写入工作区即可，留给 Commander 收尾统一提交；
   **提交后不得在工作区留下任何额外的临时/草稿文件**。

---

## 10. Non-goals / Out-of-scope

- 第 56 节四级的任何"处理"行为（忽略/Subtitle 降级/自动恢复/
  Failover+Operator intervention）——分别是既有 DEV-023 与未来
  DEV-063/065/066/067 的职责。
- `category`→`level` 自动分类/推断。
- 持久化、HTTP 端点、与 `operator-api`/`health-registry` 的任何
  集成（未来生产装配节点的职责）。

---

## 11. Tests

### Unit tests

T002：`record()` 返回值字段完整性（输入字段透传 + `id`/
`timestamp` 自动生成）、`id` 唯一性、`list()` 空/非空场景、
`list()` 返回副本（防止外部变更影响内部状态）、四个 `level`
取值全部可用。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归（新增独立包，
根 `tsconfig.json` 仅追加一条 reference）。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包 `error-registry` 真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `record()` 返回值输入字段透传 + `id` 非空 + `timestamp` 合法 ISO 字符串 | 测试检查 |
| A08 | 连续三次 `record()` 的 `id` 两两不同 | 测试检查 |
| A09 | 未调用 `record()` 前 `list()` 返回空数组 | 测试检查 |
| A10 | 连续两次 `record()` 后 `list()` 长度为 2 且顺序与调用顺序一致 | 测试检查 |
| A11 | `list()` 返回值是副本，外部变更不影响内部状态 | 测试检查 |
| A12 | `L1`/`L2`/`L3`/`L4` 四个等级各记录一次均可用，`level` 字段逐一对应 | 测试检查 |
| A13 | 未新增第三方 npm 依赖，`package.json` 无 workspace 依赖 | 文件检查 |
| A14 | 除本节点 Writable Scope 外任何既有文件均未被修改 | git diff 比对 |
| A15 | 未实现第 56 节任何一级的处理逻辑；`category` 非封闭枚举；未接入 `persistence`/HTTP | 代码检查 |
| A16 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A17 | `specs/dev/DEV-062/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-062: error registry (record-only, L1-L4 closed level type, free-text category, no handling logic)` | 命令 |
| A19 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交**；工作区无任何额外残留文件 | 命令 + `git status` 检查 |
| A20 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT →
自行核实完成三要素、工作区无残留临时文件 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A20。
