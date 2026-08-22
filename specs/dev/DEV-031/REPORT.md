# DEV-031 REPORT

## Status

READY_FOR_REVIEW

## Implemented

- **T002**：`packages/runtime-kernel/package.json` 追加
  `"@interactive-story/audio-engine": "workspace:*"`；`tsconfig.json` 的
  `references` 追加 `{ "path": "../audio-engine" }`（既有 5 条未动）；`ports.ts`
  追加 `audioResolution: AudioResolutionPorts` 字段与
  `defaultPorts.audioResolution = noopAudioResolutionPorts`（`AudioPort`/
  `noopAudioPort`/`audio` 字段逐字节未动）；`ports.test.ts` 的
  "defaultPorts bundles all four ports" 用例更新为覆盖五个端口（含
  `defaultPorts.audioResolution === noopAudioResolutionPorts` 断言，A11）。
- **T003**：新增 `resultAudioResolution.ts`——`resolveResultAudio(resolved, text,
  ports)` 纯函数：空 `resolved` 或空 `text` → `undefined`（不调
  `resolveAudioSource`）；否则 `contentId = resolved.map(r => r.narrativeId).join('+')`
  保序不排序（D1），`voiceId='narrator-default'`/`voiceSettings={}` 占位符（D2），
  调用 DEV-030 冻结的 `resolveAudioSource` 并原样返回。测试 5 用例覆盖
  A07/A08/A09/A10（顺序敏感自定义 Port 证明 `'a+b'` 命中、`'b+a'` 不命中）与
  透传语义。
- **T004**：`machine.ts` 两处 CR（precedent DEV-025）：context 类型与初始值追加
  `resultAudio: AudioResolutionResult | undefined`；`onResolve` 在 `narrationText`
  算出后调用 `resolveResultAudio` 并放进返回对象；`onResultPlaying` 的
  `RESULT_PLAYING` 命令追加 `audio: context.resultAudio` 字段。其余 action 逐字节
  未动（A14，git diff 比对确认 diff 仅含上述四处 + import）。`presentationCommand.ts`
  未改（foldState 先例，D4）。集成测试新增 2 用例：默认 Ports 全链路 →
  `RESULT_PLAYING.audio = {source:'SUBTITLE_ONLY'}`（fixture 叙事文本非空，已用
  断言 `text !== ''` 如实验证）；注入 `findPregenerated` 恒定命中的
  `ports.audioResolution` → `audio = {source:'PREGENERATED', file:'assets/pregen/
  narration.mp3'}`，证明接线真实生效（A12/A13）。
- **T005**：`index.ts` 追加导出 `resolveResultAudio` 与透传的
  `AudioResolutionResult`/`AudioResolutionSource` 类型。新增
  `apps/renderer/src/render/pickResultAudio.ts`（防御性映射最近一条
  `RESULT_PLAYING` 的 `audio`，非法形状一律 `undefined` 不抛异常，A16；6 测试
  覆盖无命令/无 audio 字段/非法形状/PREGENERATED+CACHE 带 file/RUNTIME_TTS+
  SUBTITLE_ONLY 透传/最新非法复位不残留）。`App.tsx` 仅追加：当
  `source ∈ {PREGENERATED, CACHE}` 且 `file` 为字符串时渲染
  `<audio autoPlay src={file} key={`${dialogue.key}-${file}`} />`（不 loop，
  key 复用既有 `dialogue.key`）；`RUNTIME_TTS`/`SUBTITLE_ONLY`/`undefined` 不渲染
  任何元素。未改动任何既有 JSX 行；Renderer 未新增任何 workspace 依赖（A17）。
- **T001/T006**：节点文档齐全（INDEX/REQUIREMENTS/ACCEPTANCE/DECISIONS/REPORT）；
  六条命令全绿；单次提交。

## Changed Files

```
packages/runtime-kernel/package.json                       （追加 1 行 dependency）
packages/runtime-kernel/tsconfig.json                      （追加 1 条 reference）
packages/runtime-kernel/src/ports.ts                       （追加 import + audioResolution 字段 + defaultPorts 1 行）
packages/runtime-kernel/src/ports.test.ts                  （四端口用例更新为五端口）
packages/runtime-kernel/src/resultAudioResolution.ts       （新增）
packages/runtime-kernel/src/resultAudioResolution.test.ts  （新增）
packages/runtime-kernel/src/machine.ts                     （仅 onResolve/onResultPlaying 两处 + context 类型/初始值 + import）
packages/runtime-kernel/src/machine.test.ts                （追加 2 个集成测试用例，未改既有用例）
packages/runtime-kernel/src/index.ts                       （追加导出）
apps/renderer/src/render/pickResultAudio.ts                （新增）
apps/renderer/src/render/pickResultAudio.test.ts           （新增）
apps/renderer/src/App.tsx                                  （仅追加 import + pickResultAudio 调用 + RESULT audio 元素）
pnpm-lock.yaml                                             （importer 注册行，install 机械产物）
specs/dev/DEV-031/REPORT.md                                （新增）
specs/dev/DEV-031/DECISIONS.md                             （新增）
specs/comms/LEDGER.md                                      （0142 行 ISSUED→CLOSED 开工标记）
```

（INDEX/REQUIREMENTS/ACCEPTANCE 三份文档由 Commander 随 Task Package 预先创建，
本节点仅更新 INDEX 的勾选与状态。）

外加本 NODE_REPORT 消息文件与 LEDGER 0143 行（未入库，按先例随下个治理提交捕获）。

## Tests Executed

按序执行，全部退出码 0：

| # | Command | Result |
|---|---|---|
| 1 | `pnpm install` | Done，lockfile 仅 importer 注册行，exit 0 |
| 2 | `pnpm typecheck` | `tsc -b && tsc -b --noEmit && renderer typecheck`，exit 0 |
| 3 | `pnpm lint` | `eslint .`，exit 0 |
| 4 | `pnpm format:check` | 首轮 7 文件有格式告警，`prettier --write` 后复检通过，exit 0 |
| 5 | `pnpm build` | `tsc -b`，exit 0 |
| 6 | `pnpm test` | Test Files 102 passed (102)，**Tests 537 passed (537)**（524→537，新增 13，零回归），exit 0 |

## Acceptance Results

| # | 判定 | 结果 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | ✅ PASS |
| A02 | `pnpm typecheck` 退出码 0 | ✅ PASS |
| A03 | `pnpm lint` 退出码 0 | ✅ PASS |
| A04 | `pnpm format:check` 退出码 0 | ✅ PASS |
| A05 | `pnpm build` 退出码 0 | ✅ PASS |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | ✅ PASS（524→537，新增 13：resultAudioResolution 5 + pickResultAudio 6 + machine 集成 2） |
| A07 | `resolveResultAudio([], anyText, noop)` → `undefined` | ✅ PASS（"empty resolved → undefined, ports never consulted"） |
| A08 | `resolveResultAudio(nonEmpty, '', noop)` → `undefined` | ✅ PASS（"non-empty resolved but empty text → undefined"） |
| A09 | `resolveResultAudio(nonEmpty, text, noop)` → `{source:'SUBTITLE_ONLY'}` | ✅ PASS |
| A10 | `contentId` 按 `resolved` 原顺序拼接、不排序 | ✅ PASS（顺序敏感自定义 Port：`'a+b'` 命中、`'b+a'` 不命中） |
| A11 | `Ports.audioResolution` 为追加字段，`defaultPorts.audioResolution === noopAudioResolutionPorts` | ✅ PASS（ports.test.ts 五端口用例含 toBe 断言） |
| A12 | 端到端默认 Ports：`RESULT_PLAYING.audio` 为诚实 `SUBTITLE_ONLY` | ✅ PASS（fixture 叙事非空，`audio={source:'SUBTITLE_ONLY'}`；断言含 `text !== ''`） |
| A13 | 端到端注入 `ports.audioResolution`：`RESULT_PLAYING.audio` 反映注入结果 | ✅ PASS（`{source:'PREGENERATED', file:'assets/pregen/narration.mp3'}`） |
| A14 | `machine.ts` 中两处之外的全部 action 逐字节未变 | ✅ PASS（git diff 仅 import + context 类型/初始值 + onResolve + onResultPlaying） |
| A15 | `Ports.audio`/`noopAudioPort`/`audioRegion.ts`/`packages/audio-engine/**` 未被修改 | ✅ PASS（git status 无上述文件） |
| A16 | `pickResultAudio` 对缺失/非法 `audio` 防御性返回 `undefined`，不抛异常 | ✅ PASS（6 用例含 'junk'/null/未知 source/缺 file） |
| A17 | `apps/renderer` 未新增任何 workspace 依赖 | ✅ PASS（apps/renderer/package.json 无 diff） |
| A18 | `DECISIONS.md` 存在，覆盖第 6 节全部要点 | ✅ PASS（D1 保序；D2 占位符+未来重开边界；D3 与 Ports.audio 区别；D4 两处 CR；D5 不实现四类内容；D6 CR-019 不适用） |
| A19 | 节点文档齐全已入库，T001–T006 全勾选，Status = READY_FOR_REVIEW | ✅ PASS |
| A20 | 新增恰 1 条提交，首行 `DEV-031: master audio player`；提交时 porcelain 为空 | ✅ PASS（提交前已验证） |
| A21 | LEDGER 含 NODE_REPORT-DEV-031 记录，git_head 一致 | ✅ PASS（见 LEDGER 0143 行） |
| A22 | PROJECT_INDEX/DAG/tasks/audit/protocol 未被修改 | ✅ PASS（git status 无上述路径） |

## Scope Deviations

无。所有改动均在 Writable Scope 内；pnpm-lock.yaml 的 importer 注册行是
`pnpm install` 对新增 workspace 依赖的机械性自动产物。

## Known Issues

无。

## Blockers

无。

## Future Considerations

- 逐句/多角色配音：需重新设计 `composeResultSetNarration` 输出形状并对
  `onResolve`/`resultAudioResolution.ts` 重新发 CR（DECISIONS D2，预期中的重开）。
- `narrator-default` 占位符由 DEV-034/语音选角节点替换为真实值。
- Chapter Intro/Boss/Ending 类 Master Audio：等各自的叙事发射逻辑出现时，重复
  本节点接入模式，不需要对 `resolveAudioSource` 发 CR（DECISIONS D5）。

## Decisions

见 `specs/dev/DEV-031/DECISIONS.md`（D1–D6）。
