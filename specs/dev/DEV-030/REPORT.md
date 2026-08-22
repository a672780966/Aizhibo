# DEV-030 REPORT

## Status

READY_FOR_REVIEW

## Implemented

- **T002**：首次创建 `packages/audio-engine`（Rev 2 冻结 17 包列表之一，此前从未
  创建）。`package.json`：`name: "@interactive-story/audio-engine"`，**无
  dependencies**（不依赖 `chapter-schema`，DECISIONS D1）；`tsconfig.json` 沿用
  dice-engine 等"无依赖纯函数包"的 `composite` 结构（无 references）；根
  `tsconfig.json` 仅追加一条 `{ "path": "./packages/audio-engine" }` reference。
- **T003**：`packages/audio-engine/src/resolveAudioSource.ts`——CR-018 四级解析链
  `PREGENERATED → CACHE → RUNTIME_TTS → SUBTITLE_ONLY` 纯函数实现：
  - 导出 `AudioResolutionSource`/`AudioResolutionRequest`/`AudioResolutionResult`/
    `AudioResolutionPorts` 类型与 `resolveAudioSource`；
  - 默认端口 `noopAudioResolutionPorts` 全部返回"不可用"（如实反映现状：无预生成
    目录、无缓存表、无 TTS Provider），单独运行时任何请求 fallthrough 到
    `SUBTITLE_ONLY`；
  - 决策语义为"顺着链条第一个命中就停，不做最优选择"；`RUNTIME_TTS` 命中无
    `file`（实际调用 TTS 是 DEV-034/035 的职责）；
  - 零 IO、零副作用、零 npm 依赖；未新建 `getHealth()`；未接入 runtime-kernel。
- **T003 测试**：`resolveAudioSource.test.ts` 6 个用例覆盖 A07（全默认 Port →
  `SUBTITLE_ONLY`）、A08（三种命中组合各自正确的 `source`/`file`）、A09（优先级：
  pregenerated 在全链可命中时仍胜出；cache 胜过 RUNTIME_TTS）。
- **T004**：`index.ts` 一行 re-export 全部公开符号；六条命令全绿；REPORT/
  DECISIONS/INDEX 完成后单次提交。

## Changed Files

```
pnpm-lock.yaml                                          （workspace importer 追加一行，pnpm install 自动生成）
tsconfig.json                                           （仅追加一条 reference）
packages/audio-engine/package.json                      （新增）
packages/audio-engine/tsconfig.json                     （新增）
packages/audio-engine/src/index.ts                      （新增）
packages/audio-engine/src/resolveAudioSource.ts         （新增）
packages/audio-engine/src/resolveAudioSource.test.ts    （新增）
specs/dev/DEV-030/INDEX.md                              （新增）
specs/dev/DEV-030/REQUIREMENTS.md                       （新增）
specs/dev/DEV-030/ACCEPTANCE.md                         （新增）
specs/dev/DEV-030/DECISIONS.md                          （新增）
specs/dev/DEV-030/REPORT.md                             （新增）
specs/comms/LEDGER.md                                   （仅 0138 行 ISSUED→CLOSED 开工标记）
```

外加本 NODE_REPORT 消息文件与 LEDGER 0139 行（未入库，按先例随下个治理提交捕获）。

## Tests Executed

按序执行，全部退出码 0：

| # | Command | Result |
|---|---|---|
| 1 | `pnpm install` | Already up to date，新包被 workspace 识别（lockfile importer +1 行），exit 0 |
| 2 | `pnpm typecheck` | `tsc -b && tsc -b --noEmit && renderer typecheck`，exit 0 |
| 3 | `pnpm lint` | `eslint .`，exit 0 |
| 4 | `pnpm format:check` | 首轮 resolveAudioSource.ts 有格式告警，`prettier --write` 后复检通过，exit 0 |
| 5 | `pnpm build` | `tsc -b`，exit 0 |
| 6 | `pnpm test` | Test Files 100 passed (100)，**Tests 524 passed (524)**（518→524，新增 6，零回归），exit 0 |

## Acceptance Results

| # | 判定 | 结果 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | ✅ PASS |
| A02 | `pnpm typecheck` 退出码 0 | ✅ PASS |
| A03 | `pnpm lint` 退出码 0 | ✅ PASS |
| A04 | `pnpm format:check` 退出码 0 | ✅ PASS |
| A05 | `pnpm build` 退出码 0 | ✅ PASS |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | ✅ PASS（518→524，仅新增 audio-engine 6 测试） |
| A07 | 全默认 Port 时任意请求得到 `SUBTITLE_ONLY` | ✅ PASS（test: "all-default ports fall through…"） |
| A08 | 四种注入组合分别得到正确的 `source`/`file` | ✅ PASS（A08a/A08b/A08c 三用例） |
| A09 | 优先级顺序正确（先命中先用，不做"最优选择"） | ✅ PASS（pregenerated 全链可命中仍胜出；cache 胜过 RUNTIME_TTS） |
| A10 | `packages/audio-engine` 无 `chapter-schema` 依赖 | ✅ PASS（package.json 无 dependencies 字段；源码零 import 外部包） |
| A11 | 未新建 `getHealth()` | ✅ PASS（grep 全包零匹配） |
| A12 | 未接入任何真实 IO | ✅ PASS（源码仅纯函数与常量对象，无 fs/net/db） |
| A13 | `packages/**`（除新建 audio-engine 外）未被修改 | ✅ PASS（git status 仅新增目录 + lockfile importer 行） |
| A14 | `apps/renderer/**` 未被修改 | ✅ PASS |
| A15 | 未新增任何 npm 依赖 | ✅ PASS（lockfile diff 仅 workspace importer 注册行） |
| A16 | 根 tsconfig.json 仅新增一条 reference | ✅ PASS（diff 恰 +1 行 `{ "path": "./packages/audio-engine" }`） |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节全部要点 | ✅ PASS（D1 不依赖 chapter-schema；D2 CR-019 不适用；D3 听感验证 Non-goal；D4 未来组合 Port 接入无需 CR） |
| A18 | 节点文档齐全已入库，T001–T004 全勾选，Status = READY_FOR_REVIEW | ✅ PASS |
| A19 | 新增恰 1 条提交，首行 `DEV-030: audio manifest`；提交时 porcelain 为空 | ✅ PASS |
| A20 | LEDGER 含 NODE_REPORT-DEV-030 记录，git_head 一致 | ✅ PASS（见 LEDGER 0139 行） |
| A21 | PROJECT_INDEX/DAG/tasks/audit/protocol 未被修改 | ✅ PASS |

## Scope Deviations

无。所有改动均在 Writable Scope 内；pnpm-lock.yaml 的 importer 注册行是
`pnpm install` 对新建 workspace 包的机械性自动产物，非依赖变更。

## Known Issues

无。

## Blockers

无。

## Future Considerations

- DEV-034（TTS Provider Interface）：提供真实 `hasTtsProvider` Port 实现。
- DEV-035（Result TTS）：负责 `NarrativeBlock → AudioResolutionRequest` 映射与
  RUNTIME_TTS 命中后的实际 TTS 调用。
- DEV-036（Audio Cache）：提供真实 `findCached` Port 实现。
- DEV-074（M7）：PREGENERATED 目录扫描 / 批量预生成。
- 以上接入均只需组合新 `AudioResolutionPorts`，不需要对本节点 `resolveAudioSource`
  发 CR（DECISIONS D4）。

## Decisions

见 `specs/dev/DEV-030/DECISIONS.md`（D1–D6）。
