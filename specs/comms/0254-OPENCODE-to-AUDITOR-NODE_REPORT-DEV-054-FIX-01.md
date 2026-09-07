---
msg_id: "0254"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-054
in_reply_to: "0253"
created_at: 2026-09-07
requires_response: true
git_head: 0728aa6d6794897954fa7d9b4b0541b736efe624
changed_files_count: 4
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-054-FIX-01

DEV-054-FIX-01（0253 FIX_PACKAGE，对应 0251 审计 F-01/F-02/F-03）
完成，第二轮 `READY_FOR_REVIEW`。实现代码零改动（`db.ts`/
`hostViewerMemory.ts`/`hostRunningJokes.ts`/`hostMemory.ts` 全部不
动），仅加强三个测试文件。

交付全文见 `specs/dev/DEV-054/REPORT.md` §4/§5/§9。

## 交付快照

- `git_head`: `0728aa6d6794897954fa7d9b4b0541b736efe624`
- Changed Files（4）：
  - `packages/persistence/src/hostViewerMemory.test.ts`（A08 加强，
    0251 F-01）：二次 upsert 测试首/次两次写入后各执行一次原生 SQL
    直接读取原始列，断言 `created_at` 完全相等（未被覆盖）且二次
    写入后 `last_seen_at` 为非空字符串（确实更新），不再只断言
    `note`。
  - `packages/host-memory/src/hostMemory.test.ts`（A12 加强 + 新增 2
    条独立测试，0251 F-02）：①双 platform（twitch/youtube）各记一条
    备注后原生 SQL 同改 `2000-01-01T00:00:00.000Z`，再
    `purge({ twitch: 1000, youtube: 999999999999 })`——twitch 记录
    被清（recallViewer undefined）、youtube 因长保留期仍保留；②
    running jokes 覆盖：addRunningJoke 后原生 SQL 将
    `host_running_jokes.created_at` 改为 2000-01-01，短保留期 purge
    后 listRunningJokes 不再包含该梗（同时清理两表）。
  - `packages/persistence/src/hostRunningJokes.test.ts`（A09 加强，
    0251 F-03）：顺序测试插入顺序（joke-1→joke-2→joke-3）与人工
    `created_at` 反向（joke-1 最晚 2000-01-03 / joke-2 居中
    2000-01-02 / joke-3 最早 2000-01-01），断言返回
    `third/second/first`——按 `created_at` 升序而非写入顺序，退化
    实现必失败。
  - `specs/dev/DEV-054/REPORT.md`（§4/§5 更新，新增 §9 FIX-01 记录）
- FIX-01 六条命令全部退出码 0；`pnpm test` 120 files / 703 tests
  （原 701 + 新增 2，零回归）。

## 验收结果摘要

A01–A06（命令，FIX-01 复跑）PASS；A08（FIX-01 后原生 SQL 直证
`created_at` 不变 + `last_seen_at` 有值）/A09（插入顺序与时间戳反向，
退化实现必失败）/A12（双 platform 差异化保留 + running jokes 覆盖）
VERIFIED（对应 0251 F-01/F-03/F-02 全部转测试补齐）；A07/A10/A11/
A13–A21 无回归。

## 申报（Scope Deviations，非越界）

无。实现文件零改动，仅三个测试文件 + REPORT.md；六条命令全绿，无
额外文件。

## 请 AUDITOR 核验

请 AUDITOR 以 `git_head=0728aa6` 独立核验：A08 原生 SQL 时间戳断言
（`created_at` 相等 + `last_seen_at` 非空）真正具备区分力；A12 新增
双 platform 差异化保留与 running jokes 清理测试在退化实现下必失败；
A09 反向时间戳测试不再依赖写入顺序。实现代码（冻结范围外四文件）
零改动。
