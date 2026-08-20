---
msg_id: "0074"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
cc: [AUDITOR]
node: DEV-009
in_reply_to: "0073"
created_at: 2026-08-21
requires_response: true
---

# FIX_PACKAGE — DEV-009-FIX-01

## 失败原因引用

`specs/dev/DEV-009/VERDICT.md` Findings F-01–F-04（全部 BLOCKING）：

- **F-01（A08）**：`index.ts:12` 导出 `RuntimeContext`（`machine.ts:22-27` 内含
  `snapshot: InternalSnapshot`），且 `RuntimeActor.getSnapshot()`（`machine.ts:130-132`）返回类型
  含 `RuntimeContext`。AUDITOR 独立用 `tsc --strict --noEmit` 验证：仅
  `import type { RuntimeContext }` 即可结构性访问 `ctx.snapshot.world.*` 等内部字段，零类型错误。
  直接违反 INDEX.md Forbidden Scope"`index.ts` 导出内部 snapshot 结构类型"。
- **F-02（A10）**：`storyRegion.ts` 的 `resolveNextScene` 只读 `scene.next`，从未调用
  `rule-engine.resolveGuard`；`scene.guards` 字段被完全忽略。且无任何测试构造
  `compile().passed === false` 并断言状态机转入 `ERROR`。
- **F-03（A11）**：`interactionRegion.test.ts`/`machine.test.ts` 均未测试"同一轮存在 2 个以上并存
  ActionGroup"这一 Task Package T006 明文要求的正例。AUDITOR 已独立验证 `resolveGroups` 实现本身
  对多 ActionGroup 处理正确，**不要求**改动该函数实现。
- **F-04（A12）**：`audioRegion.test.ts` 未驱动 AUDIO 进入 `PLAYING_HOST`/`ERROR` 两态。

## 最小修复 Scope

**不重开** T001–T011 中任何已通过部分（A01–A07、A09、A13–A21 均已独立验证 PASS）。仅新增四个
Task，均为最小改动，不得重构已通过代码：

### FIX-T01 — 收窄 Snapshot 公开类型面（F-01 / A08）

- **Allowed Files**：
  - `packages/runtime-kernel/src/index.ts`
  - `packages/runtime-kernel/src/machine.ts`
  - `packages/runtime-kernel/src/machine.test.ts`
- **Requirements**：
  1. `index.ts:12` 不再导出 `RuntimeContext`（`RootEvent` 若本身不含 `InternalSnapshot` 结构可保留导出，
     需自行确认其定义不间接引用 `InternalSnapshot`）。
  2. `RuntimeActor.getSnapshot()`（`machine.ts:130-132`）的返回类型改为不结构性暴露
     `InternalSnapshot` 的形态——例如把 `context` 字段类型改为 `unknown`，或改为一个只含
     `eventLog`/`compiled` 等公开安全字段（不含 `snapshot: InternalSnapshot`）的独立类型。
     `getRuntimeSnapshot`/`getEventLog`（machine.ts:361-367）内部实现可以继续访问真实的
     `InternalSnapshot` 结构（它们在包内部、非公开类型签名上操作），只是不得再把该结构的类型
     签名经由 `RuntimeActor`/`RuntimeContext` 传导到 `index.ts` 导出面。
  3. 修复后须保持公开 `.d.ts` 继续 lint-clean（不得为图省事重新引入 `any` 泛型，参见
     VERDICT.md OBS-1）。
  4. 补一条测试（`machine.test.ts` 或等价位置），证明公开 API 表面无法结构性访问内部字段——例如
     `@ts-expect-error` 证明 `actor.getSnapshot().context` 不能当作含 `snapshot.world` 的对象使用。
  5. **不得**修改 `snapshot.ts` 现有的 `RuntimeSnapshot`/访问器设计（D3 已通过，只是 `machine.ts`/
     `index.ts` 这一层把它绕过去了）。
- **Acceptance（FIX-A01）**：`tsc --strict --noEmit` 编译一段仅从 `@interactive-story/runtime-kernel`
  做 `import type` 并尝试访问任意内部 snapshot 字段（如 `world`/`flags`/`sequenceCounter`）的脚本，
  必须产生类型错误（不得再像审计时那样零错误通过）；六条命令保持全绿。

### FIX-T02 — STORY guard 分支接入 + ERROR 路径测试（F-02 / A10）

- **Allowed Files**：
  - `packages/runtime-kernel/src/storyRegion.ts`
  - `packages/runtime-kernel/src/storyRegion.test.ts`
- **Requirements**：
  1. `resolveNextScene`（或其调用点）在读 `scene.next` 之前，若 `scene.guards` 存在且非空，先调用
     `resolveGuard(scene.guards, world)`（`@interactive-story/rule-engine` 已是既有依赖）；命中则用
     其返回的 `goto` 作为下一场景，未命中或无 `guards` 时按现有逻辑回退 `scene.next`。所需的
     `WorldState` 从 `context.snapshot.world` 取（包内部访问，不涉及 F-01 的公开面问题）。
  2. 补充至少一条测试：构造一个带 `guards`（至少一条 `when` 命中当前 world state）的场景，断言
     转移目标由 guard 的 `goto` 决定，而非直接读 `next`。
  3. 补充至少一条测试：构造一个会导致 `compile().passed === false` 的 `chapterRootDir`（例如指向
     不存在的目录，或复用现有 invalid fixture），断言 STORY 状态机确实转入 `ERROR`。
- **Acceptance（FIX-A02）**：上述两条新测试通过；既有 `storyRegion.test.ts`/`machine.test.ts` 用例
  零回归。

### FIX-T03 — 多 ActionGroup 并存测试（F-03 / A11）

- **Allowed Files**：
  - `packages/runtime-kernel/src/interactionRegion.test.ts`
  - `packages/runtime-kernel/src/machine.test.ts`（如需要端到端层面的补充测试）
- **Requirements**：
  1. 补充至少一条测试：手写一个含 2 个以上 `choices` 的 `InteractionNode`（可参照 AUDITOR 验证时
     使用的 `action-follow`/`action-fight` 等既有 action，或 fixture 中已存在的其它 action），投票
     覆盖后调用 `resolveGroups`，断言产生 2 个以上独立的 `ActionGroup`/`ResolveResult`，且各自的
     `worldEffects` 均被正确应用、DICE 三事件（REQUESTED/ROLLED/PUBLISHED）各自独立产出。
  2. **不得**修改 `interactionRegion.ts` 的 `resolveGroups` 实现本体（已验证正确，无需改动）。
  3. **不得**修改 `packages/chapter-compiler/test-fixtures/valid-minimal/**`（只读 fixture）——测试
     数据用手写对象构造，不新增/修改 fixture 文件。
- **Acceptance（FIX-A03）**：新测试通过，证明多 ActionGroup 并存路径被实际驱动过。

### FIX-T04 — AUDIO 状态可达性测试（F-04 / A12）

- **Allowed Files**：
  - `packages/runtime-kernel/src/audioRegion.test.ts`
- **Requirements**：
  1. 补充测试：通过事件序列（如 `AUDIO.PREPARE` → `AUDIO.READY` → `AUDIO.PLAY_HOST`）驱动 AUDIO
     进入 `PLAYING_HOST` 态并断言。
  2. 补充测试：通过事件序列（如 `AUDIO.PREPARE` → `AUDIO.FAIL`）驱动 AUDIO 进入 `ERROR` 态并断言。
  3. **不得**修改 `audioRegion.ts` 的状态图本体（已验证结构正确，只是测试覆盖不足）。
- **Acceptance（FIX-A04）**：两条新测试通过，AUDIO 六态全部可达且均有测试覆盖。

## 回归测试

修复涉及源码改动（FIX-T01、FIX-T02）与测试新增（全部四个 Task），完成后须清空
`packages/*/dist` 与 `*.tsbuildinfo` 后按 T011 顺序重跑六条命令
（`pnpm install/typecheck/lint/format:check/build/test`），全部退出码 0，且既有 380 条断言
零回归（新增断言数量如实记录）。

## Acceptance

见 FIX-A01–FIX-A04。原 A01–A07、A09、A13–A21 维持已通过判定，不重新论证；A08/A10/A11/A12
需在本轮 NODE_REPORT 中重新提供证据供 AUDITOR 复核。

## Exit Procedure

1. 依次完成 FIX-T01–FIX-T04
2. 更新 `specs/dev/DEV-009/INDEX.md`：Task Order 追加 FIX-T01–FIX-T04，Status 改回
   `READY_FOR_REVIEW`
3. 在 `specs/dev/DEV-009/REPORT.md` 追加一节记录本轮 FIX 的改动、命令重跑结果与
   Acceptance 证据（不得覆盖或删除首轮记录，append 方式）
4. 清空 `packages/*/dist` 与 `*.tsbuildinfo` 后严格按顺序重跑六条命令，记录原始输出
5. `git add` 本轮改动文件并提交（**不得** `--amend` 篡改已冻结提交 `cc40360`），提交信息首行：
   `DEV-009-FIX-01: snapshot opacity + guard/ERROR + multi-ActionGroup + audio coverage`
6. 在 `specs/comms/LEDGER.md` 追加一行取得下一个可用序号，创建
   `NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-009.md`（第二轮），信封 `git_head` 为本次提交 sha
7. STOP

`READY_FOR_REVIEW` 之后不得再改动任何文件，直到收到下一轮 `FIX_PACKAGE` 或 `AUDIT_QUERY`。
