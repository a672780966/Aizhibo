# TASK PACKAGE — DEV-058

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-058 |
| Node Name | Host Avatar |
| Milestone | M5 — AI Host Complete（第十个/最后一个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | 无新增依赖，`ai-host` 包已存在 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：CR-014 已把 Host Avatar 的范围砍定为"静态 PNG + 口型/呼吸微动"，不做 Live2D/VRM

`specs/dev/DAG.md` 第 339 行（M5 exec 表）与
`specs/audit/SPEC-AUDIT-001.md` 第 362 行（CR 清单）一致记载：
**CR-014（P3）："Host Avatar 砍掉 Live2D / VRM，保留静态 PNG + 微动"**。
Dev Spec 第 2707-2710 行（第五施工组 DEV-058）原文"可以借鉴
AITuber OnAir 的 PNG / Live2D / voice integration 思路"——CR-014
已经把其中 Live2D 部分排除，本节点只做"PNG + 微动"这条路径。

### 现实核对：CR-014 与 Dev Spec 都没有定义任何具体的动画驱动参数（张嘴/闭嘴切换间隔、呼吸周期时长等）——USER 已裁决只定义状态形状，不实现驱动逻辑

"口型微动"意味着说话时有张嘴/闭嘴的切换，"呼吸微动"意味着有某种
周期性的呼吸相位变化——但无论是 Dev Spec 原文还是 CR-014 的裁决
记录，都没有给出任何具体的切换频率、呼吸周期时长、或"多少帧算一
个周期"这类实现参数。这些是纯粹的创作/表演节奏决策，不是工程
决策。USER 已于 2026-09-07 就此现实核对裁决：**本节点只定义
`HostAvatarState` 这个状态数据形状本身 + 一个中性的静止默认值，
不实现任何带具体时间参数的驱动/切换逻辑**——同 DEV-052（Host
Persona，只搭数据形状不发明人设创作内容）、DEV-053（Host Mood，
只搭存储原语不发明推导算法）一脉相承的取舍精神。真正"多快切一次
嘴型""呼吸周期多长"这类参数，留给未来集成真实 PNG 素材与渲染管线
时的产品/创作决策。

### 范围核对：不接入 `renderer`/Presentation 层，不涉及任何真实 PNG 资源路径

本节点产出的是"Avatar 当前处于什么视觉状态"这个数据结构本身，不
是真实的渲染/资源加载逻辑——把 `HostAvatarState` 映射成具体要显示
哪张 PNG 图片、怎么在画面上渲染，是未来某个尚未建造的 Presentation
层集成节点的职责（类似 M2 `Character Renderer`，DEV-022，但那是
针对 Story 角色的既有实现，本节点不改动、不接入它）。本节点不
import `renderer` 相关任何模块，不定义任何真实资源文件路径。

---

## 2. 架构设计

### 2.1 `packages/ai-host/src/hostAvatar.ts`（新文件）

```typescript
export type HostAvatarMouthState = 'open' | 'closed';
export type HostAvatarBreathingState = 'inhale' | 'exhale';

export interface HostAvatarState {
  mouth: HostAvatarMouthState;
  breathing: HostAvatarBreathingState;
}

export const idleHostAvatarState: HostAvatarState = {
  mouth: 'closed',
  breathing: 'exhale',
};
```

- `HostAvatarMouthState`：口型微动的两种状态（张嘴/闭嘴），对应
  未来"说话时张嘴、静默时闭嘴"的口型同步（CR-014 的"口型微动"
  部分）。
- `HostAvatarBreathingState`：呼吸微动的两种相位（吸气/呼气），
  对应未来周期性呼吸动画（CR-014 的"呼吸微动"部分）。
- `idleHostAvatarState`：唯一的静止默认值——嘴巴闭合、呼气相位，
  代表"没有任何外部驱动信号时"的中性静止画面。**不发明任何具体
  切换时间/周期的驱动函数**——本节点只产出状态形状与一个静止
  默认值，怎么随时间/音频信号变化到不同状态是未来集成节点的职责。
- **零依赖**：不 import `runtime-kernel`/`platform-core`/
  `renderer`/`egressGate.ts`/`commentPipeline.ts`/`hostPersona.ts`/
  `hostMood.ts`/`hostScheduler.ts`/`hostLLMProvider.ts`/
  `hostTtsProvider.ts`。
- **不接入** 任何真实渲染/资源加载/Presentation 层逻辑（未来
  集成节点职责）。

---

## 3. Scope

### Writable Scope

```
packages/ai-host/src/hostAvatar.ts        （新增）
packages/ai-host/src/hostAvatar.test.ts   （新增）
packages/ai-host/src/index.ts             （追加导出）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-058/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 6）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts、hostLLMProvider.ts、hostTtsProvider.ts（Read-only，不 import）
其余同既有节点惯例
```

### Forbidden Scope

```
修改 packages/platform-core/**、packages/platform-twitch/**、packages/runtime-kernel/**、packages/renderer/**、packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts、hostLLMProvider.ts、hostTtsProvider.ts
实现任何带具体时间参数的动画驱动/状态切换逻辑（张嘴间隔、呼吸周期等）
实现 Live2D/VRM 相关任何功能（CR-014 已排除）
定义任何真实 PNG 资源文件路径/加载逻辑
接入 renderer/Presentation 层
新增第三方 npm 依赖
创建除 ai-host 内文件外的任何新包
```

---

## 4. Required Skills

### Required

- 纯类型/常量定义（比 DEV-052/053 更简单，无状态、无逻辑、无异步）

### Forbidden / Unnecessary

- 任何动画引擎/图像处理/渲染依赖
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 2707-2710 行（第五施工组 DEV-058） | "可借鉴 AITuber OnAir PNG 思路"的权威来源 |
| `specs/dev/DAG.md` 第 339 行 + `specs/audit/SPEC-AUDIT-001.md` 第 362 行（CR-014） | "静态 PNG + 口型/呼吸微动，无 Live2D/VRM"范围裁定的权威来源 |
| USER 2026-09-07 裁决 | 确认只定义状态形状 + 静止默认值，不实现驱动逻辑 |

---

## 6. Outputs

1. `HostAvatarMouthState`/`HostAvatarBreathingState`/
   `HostAvatarState`/`idleHostAvatarState`（`hostAvatar.ts`）
2. `specs/dev/DEV-058/DECISIONS.md`，至少覆盖：为何只定义状态
   形状不实现驱动逻辑（切换时间/呼吸周期是创作节奏决策，Dev
   Spec/CR-014 均未定义）、为何用两个独立的二元状态（口型+呼吸）
   而不是单一枚举、为何不接入 renderer/Presentation 层、为何
   `idleHostAvatarState` 选择"闭嘴+呼气"作为默认值

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-058/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T002。

---

### T002 — `hostAvatar.ts` + 测试 + `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/ai-host/src/hostAvatar.ts`、`.test.ts`、`index.ts`、`specs/dev/DEV-058/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2.1 节实现。
- **Acceptance（功能部分）**：
  - `idleHostAvatarState` 的 `mouth` 字段值为 `'closed'`，`breathing`
    字段值为 `'exhale'`。
  - `HostAvatarState` 类型契约可用：手写一个满足该类型的对象（比如
    `{ mouth: 'open', breathing: 'inhale' }`），验证类型层面可以
    正常赋值。
  - `idleHostAvatarState` 是一个模块级常量，多次引用/读取返回完全
    相同的值（验证是静态常量，不是每次调用重新生成的函数）。
- **Requirements（回归部分）**：`pnpm test` 全量跑通，既有全部包
  测试零改动通过。
- **Requirements（验证部分）**：
  1. `index.ts` 追加导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. **写入（不提交）** `specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-058.md` 消息文件与 `specs/comms/LEDGER.md` 追加行（msg_id 取当前最大序号 + 1）。
  7. `git add`（仅本节点 Writable Scope 内文件，**不包含** LEDGER.md 与刚写的 NODE_REPORT 消息文件）`&& git commit`，首行：`DEV-058: host avatar (static PNG state shape, no live2d/vrm)`，**恰 1 条提交**。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-058 INDEX

Status: IN_PROGRESS

## Current Node

DEV-058 — Host Avatar

## Objective

新增 `packages/ai-host/src/hostAvatar.ts`：`HostAvatarState`（口型
`mouth: 'open'|'closed'` + 呼吸 `breathing: 'inhale'|'exhale'`
两个独立二元状态）+ `idleHostAvatarState` 静止默认值。CR-014 已把
Host Avatar 范围砍定为"静态 PNG + 口型/呼吸微动，无 Live2D/VRM"，
本节点只定义状态形状，不实现任何带具体时间参数的驱动/切换逻辑
（USER 2026-09-07 已就此裁决），不接入 renderer/Presentation 层。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 hostAvatar.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定——**M5（AI Host
Complete）里程碑将在本节点 PASS 后全部 10 个节点完成**。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不实现 Live2D/VRM 任何功能**（CR-014 已排除）。
2. **不实现任何带具体时间参数的动画驱动/切换逻辑**——只定义状态
   形状 + 静止默认值（USER 2026-09-07 裁决）。
3. **不接入 renderer/Presentation 层**，不定义任何真实 PNG 资源
   文件路径。
4. **不新增任何第三方 npm 依赖**。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
7. **T002 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不
   要再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- 不实现 Live2D/VRM 任何功能（CR-014 已排除）。
- 不实现任何带具体时间参数的动画驱动/切换逻辑（张嘴间隔、呼吸
  周期等创作节奏决策）。
- 不接入 renderer/Presentation 层，不定义任何真实 PNG 资源路径。
- 不引入任何第三方动画/图像处理依赖。

---

## 11. Tests

### Unit tests

T002：`idleHostAvatarState` 的字段值验证、类型契约验证（手写满足
`HostAvatarState` 类型的对象）、静态常量幂等性验证（多次引用值
一致）。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归（新增独立文件，
不修改任何既有文件除 `index.ts` 追加导出）。

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
| A07 | `idleHostAvatarState.mouth === 'closed'` 且 `idleHostAvatarState.breathing === 'exhale'` | 测试检查 |
| A08 | `HostAvatarState` 类型契约可用，手写对象可正常赋值 | 测试检查 |
| A09 | `idleHostAvatarState` 是静态常量，多次引用值一致 | 测试检查 |
| A10 | 未新增第三方 npm 依赖 | 文件检查 |
| A11 | `platform-core/**`、`platform-twitch/**`、`runtime-kernel/**`、`renderer/**`、`egressGate.ts`、`commentPipeline.ts`、`hostPersona.ts`、`hostMood.ts`、`hostScheduler.ts`、`hostLLMProvider.ts`、`hostTtsProvider.ts` 均未被修改 | git diff 比对 |
| A12 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A13 | `specs/dev/DEV-058/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A14 | `git log` 新增恰 1 条提交，首行 `DEV-058: host avatar (static PNG state shape, no live2d/vrm)` | 命令 |
| A15 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A16 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT →
自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A16。
