# TASK PACKAGE — DEV-061

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-061 |
| Node Name | Health System |
| Milestone | M6 — Operations（第二个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | 新建 `packages/health-registry`；只依赖已冻结的 `@interactive-story/shared`（`Health` 类型） |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：Dev Spec 第 61 节（`specs/baseline/DEV_SPEC_V1.0.md` 第 2721-2723 行）只有标题，零正文——唯一权威依据是第 57 节 `Health` 类型（已在 DEV-000 于 `packages/shared` 冻结）与 `specs/dev/DAG.md` 第 399 行"采集聚合"四个字

`Health = { status: 'OK'|'DEGRADED'|'DOWN'; lastSuccessAt?;
latencyMs?; error? }`（第 57 节，`packages/shared/src/health.ts`）
早在 DEV-000 冻结。CR-019（`specs/dev/DAG.md` 第 466 行）要求"每个
模块自落地起就实现 `getHealth()`，不等到 DEV-061"——目前仓库里
已有 6 处真实 `getHealth` 实现：`persistence`（`getHealth(db):
Health`，同步）、`host-memory`（包装 persistence，同步）、
`platform-twitch` 的 `EventSubClient`（`getHealth(): Health`，
同步）、`ai-host` 的 `HostLLMProvider`/`HostTtsProvider`
（`getHealth(): Promise<Health>`，异步 noop 占位）。DEV-061 的
唯一权威职责就是 DAG.md 这四个字——"采集聚合"：把已经分散在各
模块里的 `Health` 结果收拢成一个统一的聚合视图。

### 现实核对：不新建任何 HTTP 端点，不把 6 个真实来源硬编码接入——本节点只交付通用聚合原语

Dev Spec 第 52 节 Operator Console Overview 页面列了
"Errors"/"Host"/"Platform" 等字段，暗示未来某处需要展示健康
数据，但那是 DEV-060B（Console UI，CR-013 已后置）的职责，本
节点不涉及。同 DEV-060A 的"Restore LKG 止于重建+报告，不做热
替换"一样的现实约束：仓库里目前没有任何生产入口进程把
`persistence`/`host-memory`/`platform-twitch`/`ai-host` 的真实
存活实例一起装配起来，本节点也就没有一个真实的地方可以"注册"
这 6 个真实来源并长期运行。因此本节点只交付一个**通用、零业务
耦合的聚合原语**（`HealthSource`/`HealthRegistry`/
`createHealthRegistry`），不 import 任何 `persistence`/
`host-memory`/`platform-twitch`/`ai-host`，不硬编码接入那 6 个
真实来源，不新建任何 HTTP 端点——谁在未来某个生产装配节点里把
真实实例 `register()` 进来，是那个节点的职责。

### 范围裁决：聚合规则用"最差状态优先"（DOWN > DEGRADED > OK），这是 `Health` 三态唯一站得住脚的组合方式，不是发明

`Health.status` 只有三个有序取值。多个来源的整体健康状态"取
最差的那个"是这三个值唯一自洽的组合方式（类似 DEV-051 的
"Priority = count+recency 取现有信号最简单可论证的组合"），不
是在多种同样合理的方案里挑一个，因此本节点不需要就此单独征询
USER 意见。

---

## 2. 架构设计

### 2.1 `packages/health-registry`（新包）

```typescript
import type { Health } from '@interactive-story/shared';

export interface HealthSource {
  name: string;
  getHealth(): Health | Promise<Health>;
}

export type AggregateStatus = 'OK' | 'DEGRADED' | 'DOWN';

export interface AggregateHealth {
  overall: AggregateStatus;
  sources: Record<string, Health>;
}

export interface HealthRegistry {
  register(source: HealthSource): void;
  getAggregateHealth(): Promise<AggregateHealth>;
}

const STATUS_RANK: Record<AggregateStatus, number> = { OK: 0, DEGRADED: 1, DOWN: 2 };

export function createHealthRegistry(): HealthRegistry {
  const sources = new Map<string, HealthSource>();
  return {
    register(source) {
      sources.set(source.name, source);
    },
    async getAggregateHealth() {
      const results: Record<string, Health> = {};
      let worst: AggregateStatus = 'OK';
      for (const source of sources.values()) {
        const health = await source.getHealth();
        results[source.name] = health;
        if (STATUS_RANK[health.status] > STATUS_RANK[worst]) {
          worst = health.status;
        }
      }
      return { overall: worst, sources: results };
    },
  };
}
```

- `HealthSource.getHealth()` 的返回类型是 `Health | Promise<Health>`
  ——因为仓库里现有的真实实现有同步（`persistence`/
  `platform-twitch`）也有异步（`ai-host`），聚合器必须同时兼容
  两种，不能只支持一种然后要求现有模块改签名。
- `register()` 按 `name` 覆盖式登记（同名再次 `register` 直接
  替换旧的），不做历史记录/队列——同 `createHostMoodStore`/
  `createHostPermissionStore` 的覆盖式取舍精神。
- `getAggregateHealth()` 是唯一读取入口，`await` 每个来源的
  `getHealth()`，用"最差状态优先"计算 `overall`；空 registry
  的 `overall` 为 `'OK'`（没有任何已知不健康的来源，视为健康，
  Dev Spec 未定义这一边界情况，取最简单可论证的默认值）。
- **零依赖业务包**：只 `import type { Health } from
  '@interactive-story/shared'`，不 import
  `persistence`/`host-memory`/`platform-twitch`/`ai-host`/
  `operator-api` 任何一个。
- **不新建任何 HTTP 端点**，不接入 `operator-api` 的
  `node:http` server。

---

## 3. Scope

### Writable Scope

```
packages/health-registry/package.json            （新增）
packages/health-registry/tsconfig.json            （新增）
packages/health-registry/src/index.ts             （新增）
packages/health-registry/src/healthRegistry.ts       （新增）
packages/health-registry/src/healthRegistry.test.ts  （新增）
tsconfig.json                                       （根，追加一条 references 条目）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-061/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/shared/src/health.ts（只 import type Health，不修改）
packages/persistence/**、packages/host-memory/**、packages/platform-twitch/**、packages/ai-host/**、packages/operator-api/**（Read-only，本节点不 import 其中任何内容，只作为"未来接入对象"的背景参考）
```

### Forbidden Scope

```
修改 packages/shared/** 的任何文件
修改 packages/persistence/**、packages/host-memory/**、packages/platform-twitch/**、packages/ai-host/**、packages/operator-api/**、packages/platform-core/**、packages/runtime-kernel/**、packages/renderer/**
把 persistence/host-memory/platform-twitch/ai-host 的任何真实 getHealth 来源硬编码接入本节点（本节点只交付通用原语，不做真实接入）
新建任何 HTTP 端点或接入 operator-api 的 node:http server
新增第三方 npm 依赖
```

---

## 4. Required Skills

### Required

- 纯 TypeScript 泛型/联合类型聚合逻辑，无状态副作用之外的 Map 存储

### Forbidden / Unnecessary

- 任何 HTTP/网络框架
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 2027-2041 行（第 57 节 Runtime Health） | `Health` 类型契约的权威来源（已在 DEV-000 冻结） |
| `specs/dev/DAG.md` 第 399 行 + 第 466 行（CR-019） | "采集聚合"范围裁定 + "每个模块自落地起实现 getHealth"的既有纪律 |
| `packages/shared/src/health.ts` | `Health` 类型定义 |
| `packages/persistence/src/health.ts`、`packages/platform-twitch/src/eventSubClient.ts`、`packages/ai-host/src/hostLLMProvider.ts` | 证明"同步/异步 getHealth 并存"这一现实约束的既有实现样例（只读参考，不 import） |

---

## 6. Outputs

1. `HealthSource`/`AggregateStatus`/`AggregateHealth`/
   `HealthRegistry`/`createHealthRegistry`（`healthRegistry.ts`）
2. `specs/dev/DEV-061/DECISIONS.md`，至少覆盖：为何本节点不硬编码
   接入 6 个真实 `getHealth` 来源（没有真实生产入口进程可供装配，
   同 DEV-060A Restore LKG 的现实约束）、为何用"最差状态优先"作为
   聚合规则、为何 `getHealth()` 类型允许同步或异步两种返回、为何
   不新建任何 HTTP 端点、为何空 registry 的 `overall` 默认为 `OK`

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-061/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T002。

---

### T002 — `health-registry` 包 + 测试 + 根 tsconfig 引用 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/health-registry/{package.json,tsconfig.json,src/index.ts,src/healthRegistry.ts,src/healthRegistry.test.ts}`、根 `tsconfig.json`、`specs/dev/DEV-061/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2.1 节实现；`package.json`/`tsconfig.json` 结构对齐 `packages/host-memory/`（依赖只有 `@interactive-story/shared`）；根 `tsconfig.json` 的 `references` 数组末尾（`operator-api` 之后）追加 `{ "path": "./packages/health-registry" }`。
- **Acceptance（功能部分）**：
  - 空 registry：`getAggregateHealth()` 返回 `{ overall: 'OK', sources: {} }`。
  - 单一来源 `status: 'OK'`：`overall` 为 `'OK'`。
  - 单一来源 `status: 'DOWN'`：`overall` 为 `'DOWN'`。
  - 混合 `OK`+`DEGRADED`+`DOWN` 三个来源：`overall` 为 `'DOWN'`（最差优先）。
  - 混合 `OK`+`DEGRADED`（无 `DOWN`）两个来源：`overall` 为 `'DEGRADED'`。
  - 同一个 `name` 二次 `register`：第二次的来源覆盖第一次，`getAggregateHealth()` 只反映最新登记的那个。
  - 同一个 registry 内同时登记一个同步 `getHealth()`（直接返回 `Health` 对象）与一个异步 `getHealth()`（返回 `Promise<Health>`）的来源，两者都被正确聚合进 `sources`。
  - `sources` 字段的 key 与登记时的 `name` 完全一致，value 为该来源当次 `getHealth()` 的原始返回值（字段透传，不做任何裁剪/改写）。
- **Requirements（回归部分）**：`pnpm test` 全量跑通，既有全部包测试零改动通过。
- **Requirements（验证部分）**：
  1. `index.ts` 导出 `healthRegistry.ts` 的全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. **写入（不提交）** `specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-061.md` 消息文件与 `specs/comms/LEDGER.md` 追加行（msg_id 取当前最大序号 + 1）。
  7. `git add`（仅本节点 Writable Scope 内文件，**不包含** LEDGER.md 与刚写的 NODE_REPORT 消息文件）`&& git commit`，首行：`DEV-061: health registry (aggregate getHealth sources, worst-status-wins, no real sources wired yet)`，**恰 1 条提交**。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-061 INDEX

Status: IN_PROGRESS

## Current Node

DEV-061 — Health System

## Objective

新建 `packages/health-registry`：通用 `HealthSource`/
`HealthRegistry` 聚合原语，`getAggregateHealth()` 用"最差状态
优先"规则把多个来源的 `Health`（第 57 节，DEV-000 冻结）聚合成
一个整体视图。Dev Spec 第 61 节本身零正文，唯一权威范围来自
`specs/dev/DAG.md` 第 399 行"采集聚合"——本节点不硬编码接入仓库
里已有的 6 个真实 `getHealth` 来源（没有真实生产入口进程可供
装配），不新建任何 HTTP 端点。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 health-registry 包 + 测试 + 根 tsconfig 引用 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

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

1. **不硬编码接入任何真实 `getHealth` 来源**——本节点只交付通用
   聚合原语（USER 标准授权范围内的既定纪律延伸，同 DEV-060A
   "Restore LKG 不做热替换"的现实约束）。
2. **不新建任何 HTTP 端点**，不接入 `operator-api`。
3. **不修改 `packages/shared/**` 或任何其他既有包**——只
   `import type { Health }`。
4. **不新增任何第三方 npm 依赖**。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
7. **T002 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不
   要再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- 把 `persistence`/`host-memory`/`platform-twitch`/`ai-host` 的
  任何真实 `getHealth` 实例接入本节点交付的 registry（未来生产
  装配节点的职责）。
- 任何 HTTP 端点/仪表盘/Operator Console UI 展示（DEV-060B 后置）。
- Watchdog/告警/自动恢复逻辑（DEV-063 Watchdog 的职责）。
- Error Registry（DEV-062 的职责）。

---

## 11. Tests

### Unit tests

T002：空 registry 默认值、单来源三种状态、多来源"最差优先"组合、
同名覆盖登记、同步/异步 `getHealth` 混用、`sources` 字段透传
正确性。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归（新增独立包，
根 `tsconfig.json` 仅追加一条 reference）。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包 `health-registry` 真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | 空 registry `getAggregateHealth()` 返回 `{overall:'OK', sources:{}}` | 测试检查 |
| A08 | 单来源 `OK`/`DOWN` 两种场景 `overall` 分别正确 | 测试检查 |
| A09 | 混合三来源（`OK`+`DEGRADED`+`DOWN`）`overall` 为 `DOWN`；混合两来源（`OK`+`DEGRADED`）`overall` 为 `DEGRADED` | 测试检查 |
| A10 | 同名二次 `register` 覆盖旧来源 | 测试检查 |
| A11 | 同步与异步 `getHealth()` 可在同一 registry 内混用并都被正确聚合 | 测试检查 |
| A12 | `sources` 字段 key/value 与登记时的 name/`getHealth()`原始返回值一致 | 测试检查 |
| A13 | 未新增第三方 npm 依赖，只 `import type { Health }` from `@interactive-story/shared` | 文件检查 |
| A14 | `packages/shared/**`、`persistence/**`、`host-memory/**`、`platform-twitch/**`、`ai-host/**`、`operator-api/**`、`platform-core/**`、`runtime-kernel/**`、`renderer/**` 均未被修改 | git diff 比对 |
| A15 | 未新建任何 HTTP 端点，未接入 `operator-api` | 代码检查 |
| A16 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A17 | `specs/dev/DEV-061/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-061: health registry (aggregate getHealth sources, worst-status-wins, no real sources wired yet)` | 命令 |
| A19 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A20 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT →
自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A20。
