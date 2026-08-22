# DEV-028 VERDICT

> 本文件由 `AUDITOR`（`project-auditor` 角色）产出内容，经 `COMMANDER` 逐字转录套入本模板
> （依据 `COMMS-PROTOCOL-V1.md` 附录 B2/B3）。字段映射：`BLOCKER`/`MAJOR` → `BLOCKING`，
> `MINOR` → `DEVIATION`，`INFO` → `OBSERVATION`。

## Audit Basis

- Task Package: `specs/tasks/TASK-PACKAGE-DEV-028.md`
- Acceptance 权威副本: `specs/dev/DEV-028/ACCEPTANCE.md` A01–A17
- `git_head` 审核锚点（`NODE_REPORT` 消息 `0135` 申报）：`ebf4b1d`
- 基线锚点：`c3f50c1`（DEV-027 冻结提交）

## Scope Audit

PASS

- `git show --stat ebf4b1d`（OpenCode 本节点唯一提交）恰改动 8 个文件：两个目标测试
  文件（`wsServer.test.ts`、`presentationCommand.test.ts`）、5 份节点文档、1 行
  LEDGER 状态翻转——与 NODE_REPORT 申报的 `changed_files_count: 8` 及 Allowed Scope
  精确一致。
- `git diff c3f50c1 ebf4b1d -- apps packages package.json pnpm-lock.yaml
  '*/package.json'` → 只有两个测试文件改动（83 insertions，0 deletions）；零生产
  代码文件、零依赖文件被触碰。
- 两个测试文件的 `git diff | grep '^-'` 只剩两行 `diff --git` 头部——无真实删除行；
  `wsServer.test.ts` 既有 2 个 `it` 块与 `presentationCommand.test.ts` 既有 4 个 `it`
  块经全文阅读核实逐字节未变。
- `specs/PROJECT_INDEX.md`/`DAG.md`/`specs/tasks/**` 的改动完全归属 Commander 单独的
  下发提交 `f31544a`，不在 OpenCode 节点提交 `ebf4b1d` 内——正确排除在越权改动范围外。
- 无新增依赖：节点提交内无 `package.json`/`pnpm-lock.yaml` diff。

## Requirement Verification

| Requirement | Status | Evidence |
|---|---|---|
| 真实断线重连（`client.close()` + 新连接，`commandSeq` 延续，`state` 反映断线前最新状态） | VERIFIED | `wsServer.test.ts:77-109`：真实 `client1.close()` 经 `once('close')` 等待完成，`client2 = await connect(url)` 是全新 `WebSocket` 对象，重发 `RENDERER_HELLO`，断言 `resync2.commandSeq === 3`（延续而非重置）与 `state === {phase:'READY'}`；对照 `wsServer.ts` 核实 `helloHandler` 是 `wrapPresentationPort` 设置一次的共享闭包，不论哪个 socket 的 `message` 事件触发都调用同一实现——确实是同一条代码路径，非伪装声明 |
| 同连接幂等性（连续两次 `hello?.()`，`commandSeq` 各自递增，`state` 深度相同） | VERIFIED | `presentationCommand.test.ts:84-111`：同一 `wrapPresentationPort` 实例，中间无 `send()` 连续调用两次 `hello?.()`，过滤出 `PRESENTATION_RESYNC` 条目，断言 `commandSeq` 序列 `[3,4]`（真实数组，非重言式）+ `.command` 深度相等 + 一处会在 `undefined` 时失败的显式字面量比较；对照 `presentationCommand.ts` 核实 `getState()` 通过 `foldState` 重放完整 `commands` 累加器、与调用次数无关——确实验证了"不腐化状态的重复宣告"，非硬编码 fixture |
| 多客户端广播一致性（两个真实客户端收到内容一致的广播） | VERIFIED | `wsServer.test.ts:111-129`：两个独立创建的 `WebSocket` 客户端对象（各自 `connect(url)` 调用），先注册等待器再触发一次 `port.send()`，断言 `m1` 与 `m2` 深度相等且均等于预期信封；对照 `wsServer.ts` 核实 `send()` 无条件遍历 `wss.clients`（含 `readyState===OPEN` 守卫）——确实是广播，非只发给最后连接者 |
| 零生产代码改动 | VERIFIED | 见 Scope Audit |

## Acceptance Verification

| Acceptance Item | Result | Evidence |
|---|---|---|
| A01 `pnpm install` | PASS | 无 lockfile diff |
| A02 `pnpm typecheck` | PASS | 独立重跑，`tsc -b && tsc -b --noEmit` + renderer 独立 typecheck 全部干净 |
| A03 `pnpm lint` | PASS | 独立重跑 `eslint .`，干净 |
| A04 `pnpm format:check` | PASS | 独立重跑，"All matched files use Prettier code style!" |
| A05 `pnpm build` | PASS | 独立重跑 `tsc -b`，干净 |
| A06 `pnpm test` | PASS | 独立重跑：99 files（99 passed）/ 518 tests（518 passed），与申报 515→518（+3）一致，零失败 |
| A07 断线重连测试通过 | PASS | 单独隔离重跑该用例（35ms）通过，断言核实如上 |
| A08 幂等性测试通过 | PASS | 单独隔离重跑（1ms）通过 |
| A09 多客户端分发测试通过 | PASS | 单独隔离重跑（32ms）通过 |
| A10 未修改生产代码 | PASS | 见 Scope Audit |
| A11 既有测试用例未改 | PASS | 全文阅读核实，非仅凭 diff 统计 |
| A12 未新增依赖 | PASS | 无 package.json/lockfile diff |
| A13 `DECISIONS.md` 覆盖第 6 节要点 | PASS | D1（为何零生产代码）+ D2/D3/D4（三场景各自验证属性）均在，与 Task Package §6 Outputs 第 3 项对应 |
| A14 节点文档齐全 | PASS | `INDEX.md` Status = `READY_FOR_REVIEW`，T001–T005 全部勾选 |
| A15 恰 1 条提交，首行匹配 | PASS | `git log c3f50c1..ebf4b1d` 显示恰 Commander 下发 + 一条 OpenCode 提交 `DEV-028: presentation command bus` |
| A16 LEDGER git_head 一致 | PASS | LEDGER 0135 行（工作区未提交，按既定"下个治理提交捕获"先例）记录 `git_head=ebf4b1d` 与实际提交哈希及 NODE_REPORT 信封一致 |
| A17 治理文件未被本节点修改 | PASS | 专门核对 OpenCode 自己的提交（`f31544a..ebf4b1d`），与 Commander 单独的下发提交区分 |

## Verification Commands

审核员独立重跑：

| Command | Result | Notes |
|---|---|---|
| `pnpm typecheck` | 0 | 独立执行，无错误 |
| `pnpm lint` | 0 | 独立执行，无错误 |
| `pnpm build` | 0 | 独立执行，无错误 |
| `pnpm test` | 0 | 99 files / 518 tests，0 失败 |
| `pnpm format:check` | 0 | 全部文件符合格式 |
| 隔离双文件测试重跑 | 0 | 9/9 通过（`wsServer.test.ts` 4 条 + `presentationCommand.test.ts` 5 条），与申报数字一致 |

## Undeclared Changes

NONE

## Architecture Audit

PASS

- 无任何架构改动——结构性核实 `wsServer.ts`（未改动，仅作交叉引用阅读）内
  `helloHandler` 共享与 `wss.clients` 广播确实支撑"同一代码路径"与"广播给全部"的
  断言，而非仅采信 REPORT.md 的叙述。

## Regression Audit

PASS

- 核实 `noUncheckedIndexedAccess: true` 确为真实配置（`tsconfig.base.json:4`），验证
  申报的 typecheck 修正（`resyncs[0]?.`）确属必要，非削弱断言强度的绕过手法——最终
  断言链（`toHaveLength(2)` + `?.` 取值 + 显式字面量相等比较）保持完整断言强度，
  `undefined` 结果仍会在最终字面量相等检查处失败。
- 冻结接口（`wrapPresentationPort`、`createWebSocketPresentationPort`）均未被触碰，
  本节点对其 Read-only，且核实零 diff。

## Overengineering Audit

PASS

- 无发现。本节点严格只新增 3 条测试用例，无新抽象，未超出复用既有
  `connect`/`waitForMessage`/`startServer` 的范围，无投机性扩展点。

## Findings

| ID | 等级 | 内容 | 依据 |
|---|---|---|---|
| OBSERVATION-01 | OBSERVATION | 审计时 LEDGER 0135 行与 NODE_REPORT 消息文件仍是工作区未提交状态，按既定"随下个治理提交捕获"先例处理，不影响任何 Acceptance 判定，留待 Commander 并入 PASS 裁决提交 | 工作区状态观察 |

## Verdict

**PASS**（Blocker: 0，Major: 0，Minor: 0；Info: 1 → OBSERVATION，不影响判定）

## Milestone Note（转录自 project-auditor 原文）

DEV-028 经其自身 Task Package 与 INDEX.md 确认为 M2（Presentation Complete）的最后一个
节点。A01–A17 全部独立 VERIFIED，全部强制命令独立重跑通过，CR-012 要求的三个此前从未
被测过的 RESYNC 幂等性属性经真实验证（对照真实 WebSocket 连接生命周期与实际的
`wrapPresentationPort`/`createWebSocketPresentationPort` 生产代码核实，非仅测试自洽）
确属真实、非平凡地被验证。未发现任何应扣留 M2 完工签署的依据。

## Scope Discipline Check

- 是否实现了 Non-goals 中明确禁止的内容：否（未新增任何生产代码文件，未修改
  `wsServer.ts`/`presentationCommand.ts` 本体）
- 是否提前实现了后续节点的内容：否（M3/M4 相关内容均未被实现或触碰）
- 是否引入了禁止清单中的技术：否
- 是否修改了权限矩阵中不属于自己的文件：否
- 是否顺手重构了未要求改动的代码：否

## Auditor Statement

我只针对当前授权 DEV-028 节点及其冻结 Task Package、Requirements 和 Acceptance 进行了
独立审计。

我没有修改任何项目业务代码，也没有推进任何后续 DEV 节点。

---

审核方式：直调 `project-auditor` subagent。原始输出（AUDIT_PASS，Blocker 0 / Major 0 /
Minor 0 / Info 1）由 Commander 逐字转录、按附录 B2 字段映射表映射为上表，未改写、未删减、
未解读其结论。
