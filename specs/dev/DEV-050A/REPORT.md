# DEV-050A REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

- 新建 `packages/ai-host` 包（M5 Host Egress Gate，CR-010；本仓库第一次
  创建 `packages/ai-host`）：
  - `package.json` 参照 `platform-core` 结构（name
    `@interactive-story/ai-host`，`private`/`type:module`/`main`/
    `types`/`exports`/`build: tsc -b`），唯一依赖
    `@interactive-story/chapter-compiler: workspace:*`——仅为取
    DEV-002A 冻结的 `ForbiddenLexicon` 类型，零运行时依赖、零第三方
    依赖（A19）。
  - `tsconfig.json` 与 `platform-twitch` 同构（extends 根 base、
    `outDir dist`/`rootDir src`/`include src/**/*`）。
  - 根 `tsconfig.json` `references` 末尾追加
    `{ "path": "./packages/ai-host" }`（排在 `chapter-compiler` 之后，
    与 DEV-042 教训一致：被依赖方在前）。
- `packages/ai-host/src/egressGate.ts`（T002 实现）：
  - 类型：`HostPermission`（ALLOWED/LIMITED/MUTED）、
    `EgressDropRule`、`EgressDecision`（`ALLOW`/`DROP{rule,
    matchedTerm?}`）、`EgressAttemptInput`（text/sceneId/permission）、
    `EgressGateConfig`（全部可选字段带缺省）、`EgressGate`。
  - `createEgressGate(config)` 闭包持有状态（C4 环形缓冲 `recentLines`/
    C5 滑动窗口 `allowedTimestamps`），`attempt(input)` 按 C1→C5
    顺序短路判定，第一个命中的规则即 DROP 结果，全部通过 → ALLOW：
    - C1 `permission === 'MUTED'` → `DROP{PERMISSION}`（LIMITED/
      ALLOWED 放行到下一关，本节点不发明 LIMITED 专属规则）。
    - C2 消费 `ForbiddenLexicon.always` + `bySceneId[sceneId]`，
      trim+lowercase 规范化后子串匹配 → `DROP{HIDDEN_LEXICON,
      matchedTerm: 原始词}`。
    - C3 `config.platformDenylist`（缺省 `[]`）逐条
      `RegExp.test(text)` → `DROP{PLATFORM_DENYLIST, matchedTerm:
      pattern.source}`。
    - C4 命中最近 `recentLinesLimit`（缺省 20）条已放行规范化文本 →
      `DROP{DUPLICATE}`。
    - C5 超 `maxLineLength`（缺省 200）→ `DROP{LENGTH}`；否则用
      `config.clock`（缺省 `Date.now`）+ `rateLimit`（缺省
      `{maxLines:5, windowMs:60000}`）滑动窗口，达上限 →
      `DROP{RATE_LIMIT}`。
  - 仅真正 ALLOW 的尝试计入 C4/C5 历史（DROP 在命中处短路 return，
    不记录）；不改写文本、不重试；结果只有 ALLOW/DROP 两种；零 LLM，
    全部确定性字符串/正则/计数操作。
- `packages/ai-host/src/egressGate.test.ts`（10 条测试，覆盖 A07–A16，
  见 §4）：每个用例全新 `createEgressGate` 实例，零共享状态；注入
  clock 快进验证窗口过期恢复；"先制造多条必被拒内容不占频率预算"
  场景锁定 A13。
- `packages/ai-host/src/index.ts`：`export * from './egressGate.js';`
  （T003 导出全部公开符号）。
- 节点文档：新建 `DECISIONS.md`（D1–D4，覆盖 Task Package 第 6 节
  全部四个要点，见 §5 A20）与 REPORT.md（本文件）；INDEX.md 已勾选
  T001–T003 并把 Status 改为 READY_FOR_REVIEW（A21）。

## 3. Changed Files

Writable Scope 内共 10 个文件（实现提交 10，含 INDEX.md 状态更新）：

```text
packages/ai-host/package.json                （新增，T001 骨架）
packages/ai-host/tsconfig.json                （新增，T001 骨架）
packages/ai-host/src/index.ts                 （新增，T003 导出行）
packages/ai-host/src/egressGate.ts            （新增，T002 实现）
packages/ai-host/src/egressGate.test.ts       （新增，10 条测试）
tsconfig.json                                 （根，references 追加 ai-host）
pnpm-lock.yaml                                （pnpm install 更新）
specs/dev/DEV-050A/DECISIONS.md               （新增，D1–D4）
specs/dev/DEV-050A/REPORT.md                  （本文件，T001 模板 → T003 回填）
specs/dev/DEV-050A/INDEX.md                   （T001–T003 勾选 + Status=READY_FOR_REVIEW）
```

节点文档 `REQUIREMENTS.md`/`ACCEPTANCE.md` 由 Commander 在 `7d12b09`
dispatch 时预填，本节点零改动；`packages/chapter-compiler/**`（DEV-002A
冻结）、`packages/runtime-kernel/**` 未修改（见 §6 Scope Check 空 diff
佐证）。`pnpm-workspace.yaml` 用 glob `packages/*` 已自动覆盖 ai-host，
未改动。

## 4. Tests Executed

六条命令按要求顺序执行，全部退出码 0：

| # | 命令 | 结果 |
|---|---|---|
| 1 | `pnpm install` | 0；14 workspace projects，Already up to date |
| 2 | `pnpm typecheck` | 0；`tsc -b` + `tsc -b --noEmit` + renderer typecheck |
| 3 | `pnpm lint` | 0；`eslint .` |
| 4 | `pnpm format:check` | 0；Prettier 全绿（见 §6 申报：两文件初次未格式化 → `prettier --write` 后通过，纯格式零逻辑改动） |
| 5 | `pnpm build` | 0；`tsc -b` |
| 6 | `pnpm test` | 0；114 test files passed，661 tests passed（DEV-050-FIX-01 基线 651，新增 10） |

新增 10 条测试（`egressGate.test.ts`）：A07 MUTED 恒定 DROP、A08
always/bySceneId 词表命中（大小写/空白容错 + 不同 scene 不误伤）、
A09 platformDenylist 命中、A10 重复规范化去重、A11 长度边界
（> 拒 / 恰好 = 放行）、A12 注入 clock 窗口内达上限拒 / 窗口过期恢复、
A13 被 DROP 尝试不计入 C4/C5 历史、A14 C1→C5 短路顺序（超长 + 含禁词
→ 先命中 C2）、A15 全部通过 → ALLOW、A16 缺省 200 字符边界。既有
全部包测试零回归。

## 5. Acceptance Results

| # | 判定 | 结果 | 依据 |
|---|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS | Tests Executed #1 |
| A02 | `pnpm typecheck` 退出码 0 | PASS | Tests Executed #2 |
| A03 | `pnpm lint` 退出码 0 | PASS | Tests Executed #3 |
| A04 | `pnpm format:check` 退出码 0 | PASS | Tests Executed #4 |
| A05 | `pnpm build` 退出码 0 | PASS | Tests Executed #5 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | PASS | 114 files / 661 tests；DEV-050-FIX-01 基线 651 全绿 + 新增 10 |
| A07 | `permission:'MUTED'` 恒定 DROP（PERMISSION），与文本内容无关 | PASS | 测试 #1：无害文本 + MUTED → `{DROP, PERMISSION}` |
| A08 | 命中 `forbiddenLexicon.always`/`bySceneId` → DROP（HIDDEN_LEXICON），大小写/空白容错 | PASS | 测试 #2/#3：`' the SECRET ending  '` → matchedTerm `'Secret Ending'`；`'I know the Boss Name'` scene-1 命中 / scene-2 全新实例 ALLOW |
| A09 | 命中 `platformDenylist` → DROP（PLATFORM_DENYLIST） | PASS | 测试 #3b：`/badword/i` 命中 `'BadWord'` → matchedTerm `'badword'`；FIX-01 补测：同一个 `/badword/g` 实例连续两次不同文本命中均 DROP（回归，见 FIX 轮次） |
| A10 | 重复文本（规范化后相同）第二次 → DROP（DUPLICATE） | PASS | 测试 #4：`'Hello There'` ALLOW → `'  HELLO there  '` DROP DUPLICATE → 不同文本 ALLOW |
| A11 | 超长文本 → DROP（LENGTH） | PASS | 测试 #5：11 字符 > 10 → LENGTH；恰 10 → ALLOW |
| A12 | 频率超限 → DROP（RATE_LIMIT），窗口过期后恢复放行 | PASS | 测试 #6：注入 clock，t=0/100 两条 ALLOW → t=200 第三条 RATE_LIMIT → t=1300（超 1000ms 窗口）第四条 ALLOW |
| A13 | 被 DROP 的尝试不计入 C4/C5 历史状态 | PASS | 测试 #7：3 次 MUTED 必拒后，`maxLines:1` 下合法文本仍 ALLOW；FIX-01 补测：MUTED 丢弃的文本改 ALLOWED 再试 → ALLOW（不误判 DUPLICATE，见 FIX 轮次） |
| A14 | 同时触发多条规则时按 C1→C5 顺序返回最先命中的 rule | PASS | 测试 #8：超长（>5）且含 `'Secret Ending'` → 返回 HIDDEN_LEXICON（C2 先于 C5） |
| A15 | 全部通过 → `{decision:'ALLOW'}` | PASS | 测试 #4/#5/#6/#7 各 ALLOW 断言 |
| A16 | 可选配置项缺省值符合第 2.1 节（20/200/5-per-60000ms） | PASS | 测试 #9：缺省下 200 字符 ALLOW / 201 字符 LENGTH；FIX-01 补测：默认 20 槽 C4 容量（20 条填满 → 第 21 条挤出 → 重复第 1 条恢复 ALLOW）与默认 5-per-60000ms C5 上限（第 6 条 RATE_LIMIT → 窗口过期恢复 ALLOW）直接验证（见 FIX 轮次） |
| A17 | `packages/chapter-compiler/**`、`packages/runtime-kernel/**` 未被修改 | PASS | 提交前 `git diff --stat` 为空；提交内容不含两包（§6） |
| A18 | 未接入 runtime-kernel 事件日志/DEV-046/DEV-057 | PASS | 源码检查：egressGate.ts 无 runtime-kernel import；D2（§5）说明 HOST.UTTERANCE_DROPPED 仅由返回值携带 |
| A19 | 未新增第三方 npm 依赖；未创建 `ai-host` 外的新包 | PASS | package.json 仅 workspace 依赖；新增包仅 `packages/ai-host` |
| A20 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | PASS | D1（权限档位为何调用方传入）/D2（为何不接事件日志）/D3（缺省值理由）/D4（为何只 ALLOW 计入历史） |
| A21 | `specs/dev/DEV-050A/` 节点文档齐全，`INDEX.md` T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | PASS | INDEX/REQUIREMENTS/ACCEPTANCE/DECISIONS/REPORT 五份齐全；INDEX Task 全勾 + Status 已更新（§7） |
| A22 | `git log` 新增恰 1 条提交，首行 `DEV-050A: host egress gate (write-side safety boundary)` | PASS | 本次交付 commit 核验（§7） |
| A23 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | PASS | commit 后 `git status --porcelain`（见 §8） |
| A24 | `PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/`protocol/**` 均未被修改 | PASS | 交付 diff 为空（见 §6 Scope Check） |

## 6. Scope Check

只施工 DEV-050A。没有推进任何其他 DEV 节点；没有计算/推断 Host
Permission 档位（D1，C1 只消费调用方传入的 `permission`）；没有把
Gate 接入 runtime-kernel 事件日志（D2）；没有实现文本改写/脱敏/重试
（命中即整条丢弃）；没有加载真实平台 denylist 配置文件（C3 构造参数
注入）；没有接入 DEV-046 Send Chat / DEV-057 Host TTS；没有新增任何
第三方 npm 依赖（A19）；没有创建 `ai-host` 外的任何新包。提交前
`git diff --stat -- packages/chapter-compiler packages/runtime-kernel`
为**空**；`specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、
`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未修改
（A17/A24）。Constraints 1–9 全部遵守。

**Scope Deviations（申报，非越界）**：
1. T003 执行 `pnpm format:check`（六命令第 4 步）首次 **FAIL**：新增的
   `egressGate.ts`/`egressGate.test.ts` 未通过 Prettier 格式检查
   （风格警告，非逻辑问题）。处理：`pnpm exec prettier --write` 格式
   化两文件后 `format:check` 通过——两文件均在 Writable Scope 内，纯
   格式零逻辑改动（§4 佐证），不构成越界。
2. 节点文档 `REQUIREMENTS.md`/`ACCEPTANCE.md` 由 Commander 预填于
   `7d12b09`，本节点未再改动（同 DEV-046 等先例）；REPORT.md 为 T001
   新建模板 → T003 回填。
无其他申报。

## 7. Commit

提交信息首行：`DEV-050A: host egress gate (write-side safety boundary)`。

提交内容仅限 Writable Scope 内 10 个文件（§3），恰 1 条新提交；
`git add` 逐一列名，未使用 `git add -A`。`DECISIONS.md` 已包含在该
提交中。LEDGER 追加行与 NODE_REPORT 消息文件（`specs/comms/`）已写入
工作区但**未提交**，留给 Commander 收尾统一提交（Constraint 9 / A23）。

## 8. Handoff

NODE_REPORT 发往 `AUDITOR`，抄送 `COMMANDER`；审核锚点与交付快照见
`specs/comms/0214-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-050A.md`。

---

## FIX-01 轮次（DEV-050A-FIX-01）

### 背景

`AUDIT_VERDICT`（消息 `0215`）：AUDIT_FAIL，1 Blocker（F-01）+ 2 Major
（F-02/F-03），全部采纳；`NODE_RULING`（`0216`）裁决转 FIX。修复按
`FIX_PACKAGE`（`0217`）FIX-1~FIX-4 实施，本节点文档相应更新。

### FIX-1 — C3 lastIndex 确定性修复（F-01 BLOCKER）

`egressGate.ts` C3 检查：`RegExp.prototype.test()` 对带 `g`/`y` 标志的
正则实例会推进 `lastIndex`，同一实例跨多次 `attempt()` 复用时可对
同一段违规文本产生"第一次命中、第二次漏判放行"的不确定结果——真实
的安全网关绕过路径。修复为每次 `.test()` 前无条件
`pattern.lastIndex = 0;`（对非 g/y 正则无副作用 no-op，统一处理）。
根因与修复全文见 `DECISIONS.md` D5。

### FIX-2/3/4 — 补齐 A13/A16 直接覆盖 + g 标志回归测试（F-02/F-03 MAJOR）

`egressGate.test.ts` 新增 3 条测试（13 → 16 条，均只新增、零改动既有
断言；缺陷态下会真实失败、修复态下真实通过）：

| 新增测试 | 锁定验收 | 场景 |
|---|---|---|
| C3 g 标志回归（FIX-2） | A09 | 同一个 `/badword/g` 实例跨两次不同文本尝试，两次都 DROP PLATFORM_DENYLIST（修复前第二次会漏判） |
| A13 不污染 C4（FIX-3） | A13 | MUTED 丢弃 `'Hello World'` → 同一文本 ALLOWED 再试 → ALLOW（若进了 C4 缓冲会误判 DUPLICATE） |
| A16 默认值本身（FIX-4） | A16 | 默认 20 槽 C4：20 条填满 → 重复第 1 条仍 DUPLICATE → 第 21 条挤出 → 重复第 1 条恢复 ALLOW；默认 5-per-60000ms C5：5 条后第 6 条 RATE_LIMIT → 窗口过期恢复 ALLOW |

FIX-4 的 C4 段将 `rateLimit` 放宽为 100/60000ms（`recentLinesLimit`
保持默认 20 不动）——若 C4 段也用默认 5/60s 频率上限，第 6 条连续
放行即被 RATE_LIMIT 拦下，20 槽环形缓冲永远填不满，C4 容量语义无法
独立验证；C5 默认值由同测试独立 gate2 段验证。该构造已在测试内注释
说明。

### FIX 轮次 Acceptance Results（增量，首轮已 PASS 项不回退）

| # | 判定 | 结果 | 依据 |
|---|---|---|---|
| A09 | 命中 `platformDenylist` → DROP（PLATFORM_DENYLIST） | PASS（原 FAIL 转 PASS） | FIX-2 回归测试：g 标志正则连续两次均 DROP |
| A13 | 被 DROP 的尝试不计入 C4/C5 历史状态 | PASS（原 MAJOR 缺口补全） | FIX-3 测试：MUTED 丢弃文本改 ALLOWED 再试 → ALLOW |
| A16 | 可选配置项缺省值符合第 2.1 节（20/200/5-per-60000ms） | PASS（原 MAJOR 缺口补全） | FIX-4 测试：默认 20 槽容量 + 默认 5-per-60000ms 上限直接验证 |
| FIX-A01 | 六条命令全部退出码 0，既有全部测试零回归 | PASS | 114 files / 664 tests（661 基线 + 新增 3），见下 |

### FIX 轮次 Changed Files（本 FIX 提交共 4 个文件）

```text
packages/ai-host/src/egressGate.ts            （C3 lastIndex 重置，1 行）
packages/ai-host/src/egressGate.test.ts       （新增 3 条测试，13 → 16）
specs/dev/DEV-050A/DECISIONS.md               （追加 D5/D6）
specs/dev/DEV-050A/REPORT.md                  （本文件，追加 FIX 轮次）
```

### FIX 轮次 Tests Executed

六条命令按序执行，全部退出码 0：`pnpm install` / `pnpm typecheck` /
`pnpm lint` / `pnpm format:check` / `pnpm build` / `pnpm test` →
114 test files passed，664 tests passed（首轮 661 全绿 + 新增 3，
零回归）。

### FIX 轮次 Commit

提交信息首行：`DEV-050A-FIX-01: reset regex lastIndex for deterministic
denylist matching`。恰 1 条新提交；`git add` 仅列本 FIX Writable Scope
内 4 个文件，未使用 `git add -A`。LEDGER 追加行与 NODE_REPORT 消息
文件（`specs/comms/`）写入工作区但未提交。

### FIX 轮次 Handoff

NODE_REPORT 发往 `AUDITOR`，抄送 `COMMANDER`；见
`specs/comms/0218-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-050A-FIX-01.md`。
