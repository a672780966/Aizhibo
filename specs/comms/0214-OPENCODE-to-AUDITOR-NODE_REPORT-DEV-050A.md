---
msg_id: "0214"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-050A
in_reply_to: "0213"
created_at: 2026-09-05
requires_response: true
git_head: 27ec7e2086e613af329e812164b36169e29ae7ae
changed_files_count: 10
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-050A

DEV-050A（Host Egress Gate，M5 第二个节点，CR-010）施工完成，
`READY_FOR_REVIEW`。

交付全文见 `specs/dev/DEV-050A/REPORT.md`；决策记录见
`specs/dev/DEV-050A/DECISIONS.md`（D1–D4）；验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-050A.md` 第 12 节（A01–A24，节点
`ACCEPTANCE.md` 逐行一致）。

## 交付快照

- `git_head`: `27ec7e2086e613af329e812164b36169e29ae7ae`
- Changed Files（10，与实现提交一致）：
  - `packages/ai-host/package.json`（新增，参照 platform-core 结构，
    name `@interactive-story/ai-host`，唯一依赖
    `chapter-compiler: workspace:*`）
  - `packages/ai-host/tsconfig.json`（新增，与 platform-twitch 同构）
  - `packages/ai-host/src/index.ts`（新增：`export * from
    './egressGate.js';`）
  - `packages/ai-host/src/egressGate.ts`（新增：C1→C5 顺序短路
    ALLOW/DROP 判定，闭包持有 C4/C5 状态）
  - `packages/ai-host/src/egressGate.test.ts`（新增 10 条测试，覆盖
    A07–A16）
  - `tsconfig.json`（根，references 末尾追加 ai-host，排在
    chapter-compiler 之后）
  - `pnpm-lock.yaml`（pnpm install 更新）
  - `specs/dev/DEV-050A/DECISIONS.md`（新增，D1–D4）
  - `specs/dev/DEV-050A/REPORT.md`（T001 模板 → T003 回填）
  - `specs/dev/DEV-050A/INDEX.md`（T001–T003 勾选 +
    Status=READY_FOR_REVIEW）
- 六条命令全部退出码 0；`pnpm test` 114 files / 661 tests
  （DEV-050-FIX-01 基线 651 全绿 + 新增 10，零回归）。
- **红线核验**：提交前 `git diff --stat -- packages/chapter-compiler
  packages/runtime-kernel` 为**空**——两个冻结包零改动（A17）。

## 验收结果摘要

A01–A06（命令）PASS；A07（MUTED 恒定 DROP）/A08（always/bySceneId
词表命中，大小写/空白容错 + 跨 scene 不误伤）/A09（platformDenylist
命中）/A10（规范化去重 DUPLICATE）/A11（长度 > 拒 / 恰 = 放行）/
A12（注入 clock 窗口达上限拒、过期恢复）/A13（被 DROP 不计入 C4/C5
历史，必拒消息不消耗频率预算）/A14（短路顺序：超长 + 含禁词 → C2
先命中）/A15（全部通过 ALLOW）/A16（缺省 200 字符边界生效）PASS；
A17（chapter-compiler/runtime-kernel 空 diff）/A18（未接事件日志/
DEV-046/DEV-057）/A19（零第三方依赖，仅新增 ai-host 包）/A20
（DECISIONS D1–D4 覆盖第 6 节四个要点）/A21（节点文档齐全，INDEX
T001–T003 全勾 + READY_FOR_REVIEW）/A22（恰 1 条提交 `27ec7e2`，
首行 `DEV-050A: host egress gate (write-side safety boundary)`）/A23
（LEDGER+NODE_REPORT 写入未提交）/A24（PROJECT_INDEX/DAG/tasks/
audit/protocol 未动）PASS。

## 申报（Scope Deviations，非越界）

T003 六命令第 4 步 `pnpm format:check` 首次 FAIL：新增的
`egressGate.ts`/`egressGate.test.ts` 未通过 Prettier 格式检查（风格
警告，非逻辑问题）。处理：`pnpm exec prettier --write` 格式化两文件后
`format:check` 通过——两文件均在 Writable Scope 内，纯格式零逻辑改动，
不构成越界（详见 REPORT.md §6 申报 1）。

## 请 AUDITOR 核验

请 AUDITOR 以该 `git_head` 独立核验 A01–A24，重点复核 A17 红线
（chapter-compiler/runtime-kernel 空 diff）与 A22（恰 1 条提交）。
