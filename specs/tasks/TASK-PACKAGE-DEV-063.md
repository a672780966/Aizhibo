# TASK PACKAGE — DEV-063

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-063 |
| Node Name | Watchdog |
| Milestone | M6 — Operations（第四个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | 新建 `packages/watchdog`；零依赖（不 import 任何既有包） |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：Dev Spec 第 63 节（`specs/baseline/DEV_SPEC_V1.0.md` 第 2731-2732 行）只有标题，零正文；`specs/dev/DAG.md` 第 401 行备注栏也是空的——唯一权威依据是第 56 节 L3"Runtime 可恢复"

第 56 节（第 2001-2014 行）：

```
L3 Runtime 可恢复：Renderer crash / Twitch disconnect / Runtime process restart
   → 自动恢复。
```

"Watchdog"这个节点名，结合第 56 节 L3，唯一站得住脚的职责就是：
**对这三种具体命名的 Runtime 可恢复场景，判断应该采取什么动作**。
L1（忽略）/L2（Subtitle 降级，已有 DEV-023）/L4（Failover+Operator，
未来 DEV-065/066/067）都有各自专属的处理路径，L3 的"自动恢复"就是
本节点唯一的管辖范围。

### 范围裁决（USER 2026-09-08 已裁决）：L3 这三个例子当作封闭集合处理，不像 DEV-062 error-registry 的 `category` 那样开放

DEV-062 的 `category` 必须是自由文本，因为第 56 节 L1/L2/L4 各级
列出的错误类别是"未来任何模块都可能产生一个当前清单里没列出的
新错误类别"这种开放性场景（面向全仓库所有模块的错误分类）。
**L3 不同**：它是 Watchdog 这个节点自己的管辖边界本身——Dev Spec
恰好给了 3 个具体命名的场景，这 3 个场景定义了"Watchdog 到底
在看什么"，不是"某个模块产生的、事后需要归类的错误"。USER 已
就此裁决：本节点把这 3 个场景做成封闭字面量类型，写真实的
判断分支（不是一句通用 noop）：

- **`TWITCH_DISCONNECT`**：`platform-twitch` 早在 DEV-045 就已经
  实现了指数退避自动重连（`specs/dev/DAG.md` 第 193 行）。Watchdog
  对这个场景的诚实结论是"已经被处理，不需要额外动作"
  （`ALREADY_HANDLED`）——**不重新实现**一份重复的重连逻辑。
- **`RENDERER_CRASH`** / **`RUNTIME_PROCESS_RESTART`**：仓库里
  没有任何 Renderer 崩溃检测/重启机制，也没有任何长期运行的
  生产入口进程可供"重启"（同 DEV-060A/061 反复确认的现实约束）。
  Watchdog 对这两个场景诚实返回"机制尚未建成"
  （`NOT_YET_WIRED`），不假装生效、不发明真实的进程管理/崩溃
  检测代码。

### 范围裁决：不依赖 `error-registry`/`health-registry`，零耦合

`WatchdogTrigger` 是本节点自己管辖范围内的封闭类型，不是从
`error-registry` 的自由文本 `category` 字段做字符串匹配推断出来的
（那样会在两个包之间建立一个脆弱的、基于魔法字符串的隐性耦合）。
调用方未来如果想把 `error-registry` 记录的 L3 错误接到 Watchdog，
是集成节点的职责，不是本节点的职责。

---

## 2. 架构设计

### 2.1 `packages/watchdog`（新包）

```typescript
export type WatchdogTrigger = 'RENDERER_CRASH' | 'TWITCH_DISCONNECT' | 'RUNTIME_PROCESS_RESTART';

export type WatchdogActionKind = 'ALREADY_HANDLED' | 'NOT_YET_WIRED';

export interface WatchdogDecision {
  trigger: WatchdogTrigger;
  action: WatchdogActionKind;
  detail: string;
}

export function decideWatchdogAction(trigger: WatchdogTrigger): WatchdogDecision {
  switch (trigger) {
    case 'TWITCH_DISCONNECT':
      return {
        trigger,
        action: 'ALREADY_HANDLED',
        detail:
          'platform-twitch already implements exponential-backoff reconnect (DEV-045); no additional watchdog action needed',
      };
    case 'RENDERER_CRASH':
      return {
        trigger,
        action: 'NOT_YET_WIRED',
        detail: 'no renderer crash detection/restart mechanism exists yet',
      };
    case 'RUNTIME_PROCESS_RESTART':
      return {
        trigger,
        action: 'NOT_YET_WIRED',
        detail: 'no production process exists yet that could be restarted',
      };
  }
}
```

- `WatchdogTrigger`：第 56 节 L3 给出的封闭三值集合，逐字对应
  "Renderer crash / Twitch disconnect / Runtime process restart"。
- `WatchdogActionKind`：只有两个取值——`ALREADY_HANDLED`（已有别处
  机制覆盖，Watchdog 不需要做任何事）与 `NOT_YET_WIRED`（机制尚
  不存在，诚实占位）。**没有第三个"真的执行了恢复动作"的取值**，
  因为本节点不实现任何真实的恢复动作本身（不重启进程、不检测
  Renderer 崩溃）。
- `decideWatchdogAction()`：纯函数，`switch` 覆盖全部 3 个字面量，
  TypeScript 的 `noFallthroughCasesInSwitch` + 返回值类型即可保证
  分支完整性（不需要 `default` 分支，3 个 `case` 已经穷尽整个
  联合类型）。
- **零依赖**：不 import `error-registry`/`health-registry`/
  `platform-twitch`/`runtime-kernel`/`renderer` 任何一个。不新建
  任何 HTTP 端点，不接入 `operator-api`。

---

## 3. Scope

### Writable Scope

```
packages/watchdog/package.json            （新增）
packages/watchdog/tsconfig.json            （新增）
packages/watchdog/src/index.ts             （新增）
packages/watchdog/src/watchdog.ts            （新增）
packages/watchdog/src/watchdog.test.ts       （新增）
tsconfig.json                                （根，追加一条 references 条目）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-063/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
（本节点不需要读取任何既有包源码作为实现依据；DEV-045 的自动重连事实见 specs/dev/DAG.md 第 193 行，作范围裁定的背景参考）
```

### Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖 packages/error-registry、packages/health-registry、packages/platform-twitch、packages/runtime-kernel、packages/operator-api、packages/renderer 任何一个
新建任何 HTTP 端点或接入 packages/operator-api
实现任何真实的 Renderer 崩溃检测逻辑、进程重启/管理逻辑、或重新实现 Twitch 重连逻辑
新增第三方 npm 依赖
```

---

## 4. Required Skills

### Required

- 纯 TypeScript 判别联合类型 + 穷尽 `switch`，无外部依赖

### Forbidden / Unnecessary

- 任何进程管理/子进程/崩溃检测框架
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 2001-2014 行（第 56 节 L3） | `WatchdogTrigger` 封闭三值集合与"自动恢复"范围裁定的唯一权威来源 |
| `specs/dev/DAG.md` 第 193 行（DEV-045 摘要） | 证明 `TWITCH_DISCONNECT` 已有既有自动重连机制的背景参考 |
| USER 2026-09-08 裁决 | 确认 L3 三个场景当作封闭集合处理、写真实分支，而不是像 error-registry 的 category 一样开放 |

---

## 6. Outputs

1. `WatchdogTrigger`/`WatchdogActionKind`/`WatchdogDecision`/
   `decideWatchdogAction`（`watchdog.ts`）
2. `specs/dev/DEV-063/DECISIONS.md`，至少覆盖：为何 L3 的三个场景
   当作封闭集合而不像 error-registry 的 `category` 那样开放（本
   节点自己的管辖边界 vs 全仓库开放分类的性质不同）、为何
   `TWITCH_DISCONNECT` 返回 `ALREADY_HANDLED` 而不是重新实现重连
   逻辑、为何 `RENDERER_CRASH`/`RUNTIME_PROCESS_RESTART` 诚实返回
   `NOT_YET_WIRED`、为何不依赖 `error-registry`/`health-registry`
   （避免基于魔法字符串的脆弱耦合）

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-063/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T002。

---

### T002 — `watchdog` 包 + 测试 + 根 tsconfig 引用 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/watchdog/{package.json,tsconfig.json,src/index.ts,src/watchdog.ts,src/watchdog.test.ts}`、根 `tsconfig.json`、`specs/dev/DEV-063/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2.1 节实现；`package.json`（`name:
  "@interactive-story/watchdog"`，**省略** `dependencies` 字段，
  同 `error-registry` 的零依赖惯例）/`tsconfig.json` 结构对齐
  `packages/error-registry/`；根 `tsconfig.json` 的 `references`
  数组末尾（`error-registry` 之后）追加
  `{ "path": "./packages/watchdog" }`。
- **Acceptance（功能部分）**：
  - `decideWatchdogAction('TWITCH_DISCONNECT')` 返回 `action:
    'ALREADY_HANDLED'`，`detail` 中提到既有自动重连机制。
  - `decideWatchdogAction('RENDERER_CRASH')` 返回 `action:
    'NOT_YET_WIRED'`，`detail` 具体点名 Renderer 崩溃检测机制
    不存在（不是一句通用文案）。
  - `decideWatchdogAction('RUNTIME_PROCESS_RESTART')` 返回
    `action: 'NOT_YET_WIRED'`，`detail` 具体点名没有生产进程可
    重启（与上一条 `RENDERER_CRASH` 的 `detail` 文案不同，证明
    不是复制粘贴同一句话）。
  - 对三个 trigger 各调用一次，`decideWatchdogAction` 返回值的
    `trigger` 字段与传入值逐一对应。
  - 纯函数幂等性：同一个 trigger 连续调用两次，两次返回值深度
    相等（`toEqual`）。
- **Requirements（回归部分）**：`pnpm test` 全量跑通，既有全部包测试零改动通过。
- **Requirements（验证部分）**：
  1. `index.ts` 导出 `watchdog.ts` 的全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. **写入（不提交）** `specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-063.md` 消息文件与 `specs/comms/LEDGER.md` 追加行（msg_id 取当前最大序号 + 1）。
  7. `git add`（仅本节点 Writable Scope 内文件，**不包含** LEDGER.md 与刚写的 NODE_REPORT 消息文件）`&& git commit`，首行：`DEV-063: watchdog (closed 3-trigger L3 recovery decision, honest already-handled/not-yet-wired outcomes)`，**恰 1 条提交**。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交；**工作区不得残留任何本次施工产生的临时/草稿文件**（在提交前先跑一次 `git status` 检查干净）。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-063 INDEX

Status: IN_PROGRESS

## Current Node

DEV-063 — Watchdog

## Objective

新建 `packages/watchdog`：`WatchdogTrigger`（第 56 节 L3 封闭三值
集合：`RENDERER_CRASH`/`TWITCH_DISCONNECT`/
`RUNTIME_PROCESS_RESTART`）+ `decideWatchdogAction` 判断函数。
第 63 节本身零正文，DAG.md 备注为空，唯一权威范围来自第 56 节
L3"自动恢复"。`TWITCH_DISCONNECT` 已由 DEV-045 处理，返回
`ALREADY_HANDLED`；其余两个诚实返回 `NOT_YET_WIRED`（USER
2026-09-08 已裁决：L3 当作封闭集合写真实分支，不像 error-registry
的 category 那样开放）。零依赖，不接入 error-registry/
health-registry/platform-twitch。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 watchdog 包 + 测试 + 根 tsconfig 引用 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

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

1. **`WatchdogTrigger` 恰好三个字面量值**，不多不少，逐字对应
   第 56 节 L3 原文。
2. **`TWITCH_DISCONNECT` 不得重新实现重连逻辑**——只返回
   `ALREADY_HANDLED`。
3. **`RENDERER_CRASH`/`RUNTIME_PROCESS_RESTART` 不得返回
   `ALREADY_HANDLED` 或任何"已生效"的结果**——诚实返回
   `NOT_YET_WIRED`，不假装机制存在。
4. **不 import `error-registry`/`health-registry`/
   `platform-twitch`/`runtime-kernel`/`operator-api`/`renderer`
   任何一个**。
5. **不新增任何第三方 npm 依赖**。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
8. **T002 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不
   要再提交**——写入工作区即可，留给 Commander 收尾统一提交；
   **提交前用 `git status` 自查工作区是否干净，不得留下任何额外
   的临时/草稿文件**（DEV-061 的 MAJOR-01 先例）。

---

## 10. Non-goals / Out-of-scope

- 任何真实的 Renderer 崩溃检测/自动重启机制。
- 任何真实的 Runtime 进程管理/重启机制（没有真实生产进程可重启）。
- 重新实现 Twitch 断线重连（DEV-045 已实现）。
- L1/L2/L4 的处理逻辑（分别是既有 DEV-023 与未来
  DEV-065/066/067 的职责）。
- 与 `error-registry`/`health-registry`/`operator-api` 的任何
  集成（未来集成节点的职责）。

---

## 11. Tests

### Unit tests

T002：三个 trigger 各自的 `action`/`detail` 正确性（`detail`
两两不同、非通用文案）、`trigger` 字段透传、纯函数幂等性
（同输入两次调用结果深度相等）。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归（新增独立包，
根 `tsconfig.json` 仅追加一条 reference）。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包 `watchdog` 真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `TWITCH_DISCONNECT` 返回 `ALREADY_HANDLED`，`detail` 提及既有自动重连机制 | 测试检查 |
| A08 | `RENDERER_CRASH` 返回 `NOT_YET_WIRED`，`detail` 具体点名 | 测试检查 |
| A09 | `RUNTIME_PROCESS_RESTART` 返回 `NOT_YET_WIRED`，`detail` 具体点名且与 `RENDERER_CRASH` 的 `detail` 不同 | 测试检查 |
| A10 | 三个 trigger 的返回值 `trigger` 字段与传入值逐一对应 | 测试检查 |
| A11 | 同一 trigger 连续两次调用结果深度相等（纯函数） | 测试检查 |
| A12 | 未新增第三方 npm 依赖，`package.json` 无 workspace 依赖 | 文件检查 |
| A13 | 未 import `error-registry`/`health-registry`/`platform-twitch`/`runtime-kernel`/`operator-api`/`renderer` 任何一个 | 代码检查 |
| A14 | 除本节点 Writable Scope 外任何既有文件均未被修改 | git diff 比对 |
| A15 | 未实现任何真实 Renderer 崩溃检测/进程重启/Twitch 重连逻辑 | 代码检查 |
| A16 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A17 | `specs/dev/DEV-063/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-063: watchdog (closed 3-trigger L3 recovery decision, honest already-handled/not-yet-wired outcomes)` | 命令 |
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
