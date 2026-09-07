# DEV-057 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

新增 `packages/ai-host/src/hostTtsProvider.ts`：`HostTtsProvider`
流式合成接口（`synthesizeSpeech(text)` 返回
`HostTtsResult`，`ok:true` 分支携带
`audioChunks: AsyncIterable<Uint8Array>`）+ `getHealth()`，以及
诚实的 `noopHostTtsProvider` 占位实现（任意 text 恒定返回
`{ ok: false, reason: 'no Host TTS provider configured' }`，
`getHealth` 恒定 `{ status: 'DOWN', error: ... }`）。本地 `Health`
类型镜像不导出、不引入 `@interactive-story/shared` 依赖（同
DEV-040/DEV-056 先例）；源码零 import，不实现任何真实网络调用
（Dev Spec 第 30 节只给出协议类别层面判断，未指定厂商/帧格式/
鉴权，同 DEV-056 取舍先例）。

本节点交付的是**流式形状**接口（`AsyncIterable<Uint8Array>`
音频块），不是 DEV-034 `TtsProviderPort` 的**文件返回式**形状
（`{ ok: true, file: string }`）——两种形状对应 Dev Spec 第 30 节
明确区分的两种协议：Story Result 文本已完整存在 → HTTP Streaming；
AI Host 是 LLM Streaming 产生文本 → WebSocket 类流式协议。本节点
不复用/修改 DEV-034 冻结的 `TtsProviderPort`，在 ai-host 包内新建
独立流式接口；`AsyncIterable` 是传输无关的流式抽象，不绑定具体
WebSocket 实现，满足"可替换"要求。决策理由全文见
`specs/dev/DEV-057/DECISIONS.md`（D1–D4）。

## 3. Changed Files

共 6 个文件（与实现提交一致）：

- `packages/ai-host/src/hostTtsProvider.ts`（新增：本地 `Health`
  镜像 + `HostTtsResult` + `HostTtsProvider` + `noopHostTtsProvider`）
- `packages/ai-host/src/hostTtsProvider.test.ts`（新增 4 条测试）
- `packages/ai-host/src/index.ts`（追加 `export * from
  './hostTtsProvider.js';`，未动既有六行导出）
- `specs/dev/DEV-057/DECISIONS.md`（新增，D1–D4）
- `specs/dev/DEV-057/REPORT.md`（TBD 占位 → 八节回填）
- `specs/dev/DEV-057/INDEX.md`（T001–T002 勾选 +
  Status=READY_FOR_REVIEW）

## 4. Tests Executed

六条命令全部退出码 0：`pnpm install` / `pnpm typecheck` / `pnpm
lint` / `pnpm format:check` / `pnpm build` / `pnpm test`。

`pnpm test`：123 test files / **719 tests** 全部通过（DEV-056 基线
715 全绿 + 新增 4，零回归）。新增 4 条位于
`hostTtsProvider.test.ts`：① `synthesizeSpeech('hello')` 恒等
ok:false；② `synthesizeSpeech('')` 同样恒等 ok:false（直证返回值
与 text 内容无关）；③ `getHealth()` 恒等 DOWN；④ 类型契约验证——
手写满足 `HostTtsProvider` 接口的 mock（async generator 产出两个
`Uint8Array` 数据块 `[1,2,3]`/`[4,5,6]`），`for await` 收窄遍历
后断言数组长度 2 且逐块内容一致。

## 5. Acceptance Results

权威副本 `specs/tasks/TASK-PACKAGE-DEV-057.md` 第 12 节（A01–A17，
节点 `ACCEPTANCE.md` 逐行一致）：

| # | 结果 | 说明 |
|---|---|---|
| A01 | PASS | `pnpm install` 退出码 0（Already up to date） |
| A02 | PASS | `pnpm typecheck` 退出码 0 |
| A03 | PASS | `pnpm lint` 退出码 0 |
| A04 | PASS | `pnpm format:check` 退出码 0（新文件先经 prettier --write 格式化） |
| A05 | PASS | `pnpm build` 退出码 0 |
| A06 | PASS | `pnpm test` 退出码 0；123 files / 719 tests 全绿，既有测试零回归 |
| A07 | PASS | 测试 ①②：'hello' 与 '' 两个不同 text 均返回同一 `{ ok:false, reason:'no Host TTS provider configured' }` 恒定结果 |
| A08 | PASS | 测试 ③：`getHealth()` 返回 `{ status:'DOWN', error:'no Host TTS provider configured' }` |
| A09 | PASS | `hostTtsProvider.ts` 源码零 import（无任何 import 语句），不发起任何网络请求 |
| A10 | PASS | 测试 ④：`ok:true` 分支类型契约可用；手写 mock async generator 产出 `[1,2,3]`/`[4,5,6]` 两块，`for await` 收窄遍历后长度 2 且内容逐块一致 |
| A11 | PASS | 未新增任何第三方 npm 依赖（`pnpm install` 无 lock 变化） |
| A12 | PASS | 冻结路径空 diff：platform-core/platform-twitch/runtime-kernel/audio-engine/egressGate.ts/commentPipeline.ts/hostPersona.ts/hostMood.ts/hostScheduler.ts/hostLLMProvider.ts 均未被修改 |
| A13 | PASS | `DECISIONS.md` 已提交，D1–D4 覆盖 Task Package 第 6 节全部要点 |
| A14 | PASS | 节点文档齐全；INDEX.md T001–T002 全部勾选，Status=READY_FOR_REVIEW |
| A15 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-057: host tts (streaming-shaped interface + honest noop placeholder)` |
| A16 | PASS | LEDGER 追加行与本 NODE_REPORT（0278）写入工作区但未提交 |
| A17 | PASS | 治理路径空 diff：PROJECT_INDEX.md/DAG.md/tasks/**/audit/**/protocol/** 均未被修改（DEV-038 状态不受影响） |

## 6. Scope Check

- 未触碰 Forbidden Scope 任何文件：platform-core/platform-twitch/
  runtime-kernel/audio-engine/ai-host 既有六个模块零改动。
- 未复用/修改 DEV-034 冻结的 `TtsProviderPort`（`packages/
  audio-engine/src/ttsProvider.ts` 只作 Read-only 对照参照）。
- 未实现任何真实网络调用/WebSocket/HTTP 客户端/第三方 TTS SDK，
  未新增第三方 npm 依赖。
- 未接入 Egress Gate/Host Scheduler/真实 Runtime 组合层（未来
  集成职责），无第二条绕过 Gate 的发声路径。
- 未重新打开 DEV-038（Audio Ducking，BLOCKED）：本节点不接入
  runtime-kernel/audioRegion 状态机，`PLAYING_HOST` 依然不可达，
  DEV-038 重开条件不满足，其状态不受影响。
- 申报：工作区既有的 egressGate.ts/commentPipeline.ts/
  hostScheduler.ts 三文件 CRLF 行尾标记为 pre-existing 非内容差异
  （`git diff --ignore-space-at-eol` 空），同 DEV-056 报告记录，未
  触碰未提交。

## 7. Commit

恰 1 条提交，首行：

```
DEV-057: host tts (streaming-shaped interface + honest noop placeholder)
```

包含 6 个文件：`hostTtsProvider.ts`/`.test.ts`/`index.ts`/
`DECISIONS.md`/`REPORT.md`/`INDEX.md`。LEDGER 追加行与 NODE_REPORT
消息文件（0278）写入工作区但未提交（Constraint 7）。

## 8. Handoff

LEDGER 追加行（Seq 0278，Status=OPEN）与 NODE_REPORT 消息文件
`specs/comms/0278-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-057.md` 已写入
工作区、**未提交**——按既有惯例留给 Commander 验收收尾时统一提交
（LEDGER.md"当前待处理"表格 AUDITOR 行已改 0278、OPENCODE 行改
—，Commander 裁决后可同步更新）。Dev Spec 第五施工组 DEV-057
验收判定与下一节点推进由 Commander 决定，OpenCode 不自行推进。
