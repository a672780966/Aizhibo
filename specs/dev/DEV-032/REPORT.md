# DEV-032 REPORT

## Status

READY_FOR_REVIEW

## Implemented

把自 DEV-009 起只能手动驱动的 AUDIO region 六态骨架接上第一个真实触发源（DEV-031
的 `context.resultAudio`），严格按 Task Package 第 2.1/2.2 节实现：

1. `machine.ts`：`xstate` import 追加 `enqueueActions`；AUDIO 骨架区块内新增两个
   action（紧跟既有 `audioPreparing`/`audioPlayStory`/`audioError` 之后）：
   - `onAudioChannelForResult`：`enqueueActions` 读取 `context.resultAudio`，
     `audio !== undefined && audio.source !== 'SUBTITLE_ONLY'` 时依次
     `enqueue.raise({ type: 'AUDIO.PREPARE' })` → `enqueue.raise({ type: 'AUDIO.READY' })`；
     否则不 raise（门槛条件，AUDIO region 保持 `IDLE`）。
   - `onAudioChannelStop`：`enqueueActions` 无条件 `enqueue.raise({ type: 'AUDIO.STOP' })`
     （AUDIO region 在 `IDLE` 时收到是安全空操作）。
   - 无真实异步 TTS（DEV-034/035 未建），`PREPARE→READY` 同步折叠，为有意的诚实
     当前行为（见 DECISIONS D2）。
2. `storyRegion.ts`：仅 3 处既有转移的 `actions` 追加新 action 名（状态拓扑零改动）：
   - `RESOLUTION_PENDING.always`：`actions: ['onResultPlaying', 'onAudioChannelForResult']`
   - `RESULT_PLAYING.on['NARRATIVE.DONE']` hasNextScene 分支：追加 `'onAudioChannelStop'`
   - `RESULT_PLAYING.on['NARRATIVE.DONE']` CHAPTER_END 分支：追加 `'onAudioChannelStop'`
3. `machine.test.ts`：追加 5 条机器级集成测试（A07–A11 逐条对应，见下）。
4. `audioRegion.ts` 六态与全部既有转移逐字节未变（A12）；`Ports.audio` 既有
   `send()` 载荷 kind 未变（A13）；PLAYING_HOST/DUCKED 真实触发未实现（AI Host
   属 M5）；BGM/环境音路径未触碰（DEV-027 领域）。

## Changed Files

```
packages/runtime-kernel/src/machine.ts          （xstate import 追加 + 2 个新 action）
packages/runtime-kernel/src/machine.test.ts     （追加 5 条集成测试 + 2 个测试辅助）
packages/runtime-kernel/src/storyRegion.ts      （3 处 actions 数组追加）
specs/dev/DEV-032/INDEX.md                      （Task 勾选 + Status）
specs/dev/DEV-032/DECISIONS.md                  （新建，D1–D6）
specs/dev/DEV-032/REPORT.md                     （本文件）
```

`REQUIREMENTS.md`/`ACCEPTANCE.md` 由 Commander 在下发时预置于节点目录（内容为
Task Package 抄录，本轮无改动需求，未触碰）。

## Tests Executed

严格顺序执行，退出码逐条记录：

| # | 命令 | 退出码 |
|---|---|---|
| 1 | `pnpm install` | 0 |
| 2 | `pnpm typecheck` | 0 |
| 3 | `pnpm lint` | 0 |
| 4 | `pnpm format:check` | 0 |
| 5 | `pnpm build` | 0 |
| 6 | `pnpm test` | 0（102 files / **542 passed**，537→542 新增 5 条，既有零回归） |

过程记录：首轮 `pnpm lint` 报 1 error（`raise` 顶层 import 未使用——实现经
`enqueue.raise` 方法调用，顶层导入多余），移除后复跑通过；`pnpm format:check`
对 `machine.ts`/`machine.test.ts` 报格式问题，`prettier --write` 后复跑通过。
最终六条命令在修正后的代码上按上表顺序全部退出码 0。

## Acceptance Results

| # | 判定 | 结果 | 证据 |
|---|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS | 上表 #1 |
| A02 | `pnpm typecheck` 退出码 0 | PASS | 上表 #2 |
| A03 | `pnpm lint` 退出码 0 | PASS | 上表 #3（修正后） |
| A04 | `pnpm format:check` 退出码 0 | PASS | 上表 #4（修正后） |
| A05 | `pnpm build` 退出码 0 | PASS | 上表 #5 |
| A06 | `pnpm test` 退出码 0；既有零回归 | PASS | 542/542，新增恰 5 条（machine.test.ts），既有 537 条全部通过 |
| A07 | 注入命中 Ports → LOCK 链路后 AUDIO 自动到达 PLAYING_STORY | PASS | `machine.test.ts` "A07: injected hit ports..."（`findPregenerated` 恒定命中，`runToResolution` 全程无手动 `AUDIO.*` 发送，断言 `audio === 'PLAYING_STORY'`） |
| A08 | 默认 Ports（SUBTITLE_ONLY）→ 保持 IDLE | PASS | `machine.test.ts` "A08: default ports..."（默认 Port 恒 `SUBTITLE_ONLY`，LOCK 链路后断言 `audio === 'IDLE'`） |
| A09 | NARRATIVE.DONE 有下一场景分支 → 回到 IDLE | PASS | `machine.test.ts` "A09: ..."（临时章节 interaction-01.nextScene→scene-b，DONE 后 story=STORY_PLAYING 且 `audio === 'IDLE'`） |
| A10 | NARRATIVE.DONE 直达 CHAPTER_END 分支 → 回到 IDLE | PASS | `machine.test.ts` "A10: ..."（valid-minimal，DONE 后 story=CHAPTER_END 且 `audio === 'IDLE'`） |
| A11 | 无互动直达 CHAPTER_END 路径 AUDIO 全程 IDLE | PASS | `machine.test.ts` "A11: ..."（复用 FIX-02 无互动临时章节 + 注入命中 Ports，两步 STORY.DONE 全程 `audio === 'IDLE'` 且 `Ports.audio` 从未收到任何 `AUDIO_*` 命令） |
| A12 | `audioRegion.ts` 逐字节未变 | PASS | `git diff` 零改动（本文件 Changed Files 不含它） |
| A13 | `Ports.audio` 既有 send() 载荷 kind 未变 | PASS | `machine.ts` 既有 audio* action 逐字节未动，仅新增两个不 send 的跨 region action |
| A14 | `apps/renderer/**`、`packages/audio-engine/**` 未被修改 | PASS | `git status --porcelain` 仅含 Changed Files 所列文件 |
| A15 | 未新增任何 npm 依赖 | PASS | `package.json` 零改动，`enqueueActions` 为既有 `xstate` 导出 |
| A16 | `DECISIONS.md` 存在，覆盖第 6 节全部要点 | PASS | D1 门槛条件 / D2 同步折叠与未来重开 / D3 PLAYING_HOST-DUCKED / D4 BGM / D5 CR-019 不适用 |
| A17 | 节点文档齐全、INDEX 全勾选、Status=READY_FOR_REVIEW | PASS | `specs/dev/DEV-032/` 五文件入库；INDEX T001–T003 全勾选，Status 表头 READY_FOR_REVIEW |
| A18 | 恰 1 条新提交，首行 `DEV-032: audio state region`；提交时 porcelain 空 | PASS | 提交后 `git status --porcelain` 输出为空（LEDGER/NODE_REPORT 按惯例于提交后追加，见 Known Issues） |
| A19 | LEDGER 含 NODE_REPORT-DEV-032 记录，git_head 一致 | PASS | LEDGER 追加 `0147` 行，`git_head` 与本报告信封一致 |
| A20 | PROJECT_INDEX/DAG/tasks/audit/protocol 未被修改 | PASS | `git status --porcelain` 零涉及 |

## Scope Deviations

无。改动严格限于 Writable Scope。

## Known Issues

1. LEDGER 行与 NODE_REPORT 消息文件按既有节点惯例在源码提交之后追加落盘（A19 的
   `git_head` 引用要求先有提交），因此提交后工作区含这两个未提交文件——与
   DEV-020 起多个节点审计记录的"LEDGER 工作区状态观察"同一性质，非本节点引入。
2. 生产环境（默认 `noopAudioResolutionPorts`）下本节点接上的触发路径观察不到
   AUDIO region 离开 `IDLE`（门槛条件诚实生效，见 DECISIONS D1）——与
   DEV-030/031 的"诚实反映现状"先例一致，非缺陷。

## Blockers

无。

## Future Considerations

- DEV-034/035 接入真实异步 TTS 时，需对本节点重新发 CR：把 `AUDIO.READY` 的
  raise 挪到真实异步操作 resolve 之后（`AUDIO.FAIL` 同理挪到 reject 之后），
  `PREPARING` 将从零耗时过渡态变为真实等待态（DECISIONS D2）。
- M5（AI Host）落地后，PLAYING_HOST/DUCKED 的真实触发源接线是后续节点职责。

## Decisions

见 `specs/dev/DEV-032/DECISIONS.md`（D1–D6，随本提交入库）。
