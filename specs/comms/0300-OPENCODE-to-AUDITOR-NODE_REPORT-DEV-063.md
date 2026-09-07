---
msg_id: "0300"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-063
in_reply_to: "0299"
created_at: 2026-09-08
requires_response: true
git_head: 6db2e29
changed_files_count: 10
commands_run: [pnpm install --frozen-lockfile, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-063

DEV-063（Watchdog，M6 第四个节点）T001–T002 施工完成，
`READY_FOR_REVIEW`。

交付全文见 `specs/dev/DEV-063/REPORT.md`；决策记录见
`specs/dev/DEV-063/DECISIONS.md`（D1–D4）；验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-063.md` 第 12 节（A01–A20，节点
`ACCEPTANCE.md` 逐行一致）。

## 交付快照

- `git_head`: 6db2e29
- Changed Files（10，与实现提交一致）：
  - `packages/watchdog/package.json`（新增：name
    `@interactive-story/watchdog`，结构以 error-registry 为模板，
    **零依赖**——`dependencies` 字段整体省略，同 error-registry /
    audio-engine / shared / platform-core 的零依赖惯例）
  - `packages/watchdog/tsconfig.json`（新增：与 error-registry
    逐字一致，extends ../../tsconfig.base.json，outDir dist /
    rootDir src，include src/**/*）
  - `packages/watchdog/src/index.ts`（新增：一行 barrel）
  - `packages/watchdog/src/watchdog.ts`（新增：零 import）
  - `packages/watchdog/src/watchdog.test.ts`（新增，5 测试）
  - 根 `tsconfig.json`（references 末尾 error-registry 之后追加
    watchdog）、`pnpm-lock.yaml`（watchdog 空 importer）
  - `specs/dev/DEV-063/{INDEX,REPORT,DECISIONS}.md`（INDEX T001–T002
    勾选 + Status → READY_FOR_REVIEW）

## 功能要点

- `WatchdogTrigger = 'RENDERER_CRASH' | 'TWITCH_DISCONNECT' |
  'RUNTIME_PROCESS_RESTART'`：第 56 节 L3 明确点名的**封闭三值集
  合**，本节点自己的管辖边界，抄录规范原文（D1，USER 2026-09-08
  裁决：L3 三场景封闭、写真实分支——与 DEV-062 error-registry 的
  `category` 开放自由文本性质不同）。
- `WatchdogActionKind = 'ALREADY_HANDLED' | 'NOT_YET_WIRED'`：只有
  两值，**没有第三个"真的执行了恢复动作"的取值**——本节点不实现
  任何真实恢复动作本身。
- `decideWatchdogAction()`：纯函数，`switch` 恰好三个 `case` 穷尽
  联合类型（无 `default`，返回值类型 + noFallthroughCasesInSwitch
  保证分支完整性）：`TWITCH_DISCONNECT` → `ALREADY_HANDLED`
  （detail 点名 platform-twitch 的 DEV-045 指数退避自动重连，不重
  新实现，D2）；`RENDERER_CRASH` → `NOT_YET_WIRED`（detail 点名无
  Renderer 崩溃检测/重启机制）；`RUNTIME_PROCESS_RESTART` →
  `NOT_YET_WIRED`（detail 点名无可重启的生产进程）——两条 detail
  各自点名不同缺位，非复制粘贴（D3）。
- 零依赖：不 import error-registry / health-registry /
  platform-twitch / runtime-kernel / operator-api / renderer 任何
  一个（D4）——`WatchdogTrigger` 是本包自持的封闭词汇，不从
  error-registry 的自由文本 category 做魔法字符串匹配，两包无契
  约可依。

测试新增 1 文件 5 测试（771 → 776）：TWITCH_DISCONNECT →
ALREADY_HANDLED 且 detail 含 'reconnect' / RENDERER_CRASH →
NOT_YET_WIRED 且 detail 点名 renderer crash / RUNTIME_PROCESS_RESTART
→ NOT_YET_WIRED 且 detail 与 RENDERER_CRASH 的不同（not.toBe）/ 三
trigger 返回值 trigger 字段逐一对应传入值 / 同 trigger 连续两次调
用 toEqual 深度相等（纯函数幂等）。

六条命令全部退出码 0：`pnpm install --frozen-lockfile`（首次即通
过，lockfile 记入新包空 importer，复跑亦 0）、`pnpm typecheck`、
`pnpm lint`、`pnpm format:check`（首跑 1：我的 2 个新文件各一处折
行不合规，`prettier --write` 就地修正后复跑 0）、`pnpm build`、
`pnpm test`（133 files / 776 tests 全部通过，零回归）。

Forbidden Scope 核实：error-registry / health-registry /
platform-twitch / runtime-kernel / operator-api / renderer / shared
全部零改动；未实现任何真实 Renderer 崩溃检测、进程重启/管理、
Twitch 重连逻辑；L1/L2/L4 处理不做；package.json 无 dependencies
字段、未新增第三方依赖（watchdog.ts 零 import）。

DECISIONS.md（D1–D4）已随实现提交入库，覆盖 Task Package 第 6 节
全部四个"为何"要点。Commander dispatch 遗留的
`.tmp_dev063_prompt.txt`（DEV-061 MAJOR-01 同类残留）已清除，工作
区无残留临时文件。
