# DEV-028 REPORT

## Status

READY_FOR_REVIEW

## Implemented

- **T002（真实断线重连）**：`apps/renderer/src/server/wsServer.test.ts` 新增 `it`
  块——真实 `client1.close()` 并等待关闭完成，`connect()` 建立全新 `client2` 重发
  `RENDERER_HELLO`，断言 `client2` 收到 `PRESENTATION_RESYNC`、`commandSeq` 延续
  （1、2 后为 3，不重置为 1）、`state` 反映断线前最新折叠状态（`PRES_READY` 后为
  `{phase:'READY'}`）。验证"首次连接与重连走同一条路径"（CR-012）——既有的共享
  `helloHandler` + `send()` 广播当前 `wss.clients` 结构在真实断线重连下工作正常。
- **T003（同连接幂等性）**：`packages/runtime-kernel/src/presentationCommand.test.ts`
  新增 `it` 块——同一 `wrapPresentationPort` 实例在两次 `send` 后连续两次
  `hello?.()`（中间无任何 `send`），断言两条 `PRESENTATION_RESYNC` 的 `commandSeq`
  各自递增（3、4，不重复、不跳号）、`state` 内容**完全相同**
  （`{phase:'READY', currentSceneId:'scene-start'}`）——"重复请求只是重新宣告当前
  状态、不腐化状态"的字面幂等性验证。
- **T004（多客户端分发一致性）**：`wsServer.test.ts` 新增 `it` 块——两个真实 `ws`
  client 同时在线，先挂好等待器再 `port.send({kind:'PRES_READY'})` 一次，断言两个
  客户端收到内容一致的命令（均为 `{commandSeq:1, command:{kind:'PRES_READY'}}`），
  验证分发确实是广播给全部在线连接而非只给最后连接的。
- **本节点零生产代码改动**（第 1 节关键架构决策）："序号分配"（DEV-012
  `wrapPresentationPort`）与"分发"（DEV-020 `createWebSocketPresentationPort`）均
  已实现并测过，本节点只补 CR-012 要求、此前从未被测过的 RESYNC 幂等性三属性
  （DECISIONS D1）。未发现任何生产代码 bug，无需发 `EXECUTOR_QUERY`。
- **测试手法先例复用**（第 5 节 Inputs）：`wsServer.test.ts` 既有 `startServer`/
  `connect`/`waitForMessage` helper 与 `clients`/`servers` 清理直接复用；断线等待用
  内联 `client.once('close')` Promise；幂等测试复用既有 `sent`/`hello` 捕获模式。

## Changed Files

```text
apps/renderer/src/server/wsServer.test.ts                    （仅追加 2 个 it 块：断线重连、
                                                                多客户端分发；既有 2 个用例未改）
packages/runtime-kernel/src/presentationCommand.test.ts      （仅追加 1 个 it 块：同连接幂等性；
                                                                既有 4 个用例未改）
specs/dev/DEV-028/INDEX.md
specs/dev/DEV-028/REQUIREMENTS.md
specs/dev/DEV-028/ACCEPTANCE.md
specs/dev/DEV-028/REPORT.md
specs/dev/DEV-028/DECISIONS.md
specs/comms/LEDGER.md（0134 行状态 ISSUED→CLOSED：Codex 开工标志，唯一允许的原地位改）
```

`pnpm-lock.yaml` 无 diff（`pnpm install` 提示 Already up to date，零新增依赖）；
`wsServer.ts`/`presentationCommand.ts`/`machine.ts`/`ports.ts`/`index.ts`/`App.tsx`
及其余全部生产代码、既有测试文件、DEV-020～027 冻结文件、根配置、治理/规范文件全部
零改动。

## Tests Executed

六条命令严格按要求顺序执行：

| Command | Exit code | Result |
|---|---:|---|
| `pnpm install` | 0 | PASS; Already up to date（零新增依赖，`pnpm-lock.yaml` 无 diff） |
| `pnpm typecheck` | 0 | PASS; `tsc -b && tsc -b --noEmit` + renderer 独立 `tsc --noEmit`（首轮修正：`resyncs[0]` 在 noUncheckedIndexedAccess 下可能 undefined，改为 `map` 断言序列 + `?.` 取值，与既有 `sent[0]?.` 手法一致） |
| `pnpm lint` | 0 | PASS; `eslint .`，含两个新增测试块 |
| `pnpm format:check` | 0 | PASS; All matched files use Prettier code style |
| `pnpm build` | 0 | PASS; `tsc -b` |
| `pnpm test` | 0 | PASS; 99 Test Files / 518 Tests（DEV-027 基线 99/515，新增 3 条，既有零回归） |

三个新场景单独运行验证：`wsServer.test.ts`（4 条）+ `presentationCommand.test.ts`
（5 条）共 9 条全部通过。

## Acceptance Results

| # | Result | Evidence |
|---|---|---|
| A01 | PASS | `pnpm install` exit code 0（Already up to date） |
| A02 | PASS | `pnpm typecheck` exit code 0：三步全过（含 `resyncs[0]` undefined 修正后） |
| A03 | PASS | `pnpm lint` exit code 0 |
| A04 | PASS | `pnpm format:check` exit code 0：All matched files use Prettier code style |
| A05 | PASS | `pnpm build` exit code 0（`tsc -b`） |
| A06 | PASS | `pnpm test` exit code 0：99 files / 518 tests；既有全部测试零回归（515→518，仅新增 3 条） |
| A07 | PASS | 断线重连测试：`client2` 收到 RESYNC `commandSeq=3`（延续不重置）、`state={phase:'READY'}`（断线前最新折叠状态） |
| A08 | PASS | 幂等性测试：连续两次 `hello?.()`（中间无 send）产出两条 RESYNC，`commandSeq` 为 3/4 各自递增不重复、`state` 深等相同 |
| A09 | PASS | 多客户端分发测试：两个同时在线客户端收到内容一致的命令（`commandSeq`/`command` 均相同） |
| A10 | PASS | `git diff`：零生产代码文件改动（`wsServer.ts`/`presentationCommand.ts`/`machine.ts`/`ports.ts`/`index.ts`/`App.tsx` 等全部零 diff） |
| A11 | PASS | `git diff`：两个测试文件仅追加 `it` 块；既有 2+4 个用例逐字节未改 |
| A12 | PASS | `pnpm install` 零新增；`pnpm-lock.yaml`、根/包 `package.json` 均无 diff |
| A13 | PASS | `DECISIONS.md` 存在，覆盖第 6 节全部要点（D1 为何零生产代码：序号分配/分发已由 DEV-012/020 实现；D2/D3/D4 三个场景各自验证的属性） |
| A14 | PASS | `specs/dev/DEV-028/` 六份文档齐全且已入库，`INDEX.md` T001–T005 全部勾选且 `Status:` 表头为 `READY_FOR_REVIEW` |
| A15 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-028: presentation command bus`；提交时 `git status --porcelain` 为空 |
| A16 | PASS | LEDGER `NODE_REPORT-DEV-028` 记录 `git_head` 与提交一致 |
| A17 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均零 diff |

## Scope Deviations

NONE。本节点 Writable Scope 内每个 Allowed File 均有真实非空改动：两个测试文件各
新增 `it` 块（T002/T004 与 T003）、六份节点文档（`INDEX.md`/`REQUIREMENTS.md`/
`ACCEPTANCE.md`/`REPORT.md`/`DECISIONS.md`）、`LEDGER.md`（0134 行开工标记
ISSUED→CLOSED，唯一允许的原地位改）。无越权改动、无顺手重构、无新依赖、无生产代码
改动。

## Known Issues

NONE。

## Blockers

NONE。

## Future Considerations

- 多客户端广播一致性已由本节点测试验证，但产品层面的"多真实 Renderer 客户端同时
  工作"（第 67 节多 Worker 并行）仍不在范围内，留待未来节点。
- 若未来 `wsServer` 引入按客户端定向发送/鉴权等传输语义，本节点三个场景可作回归
  基线。

## Decisions

见 `specs/dev/DEV-028/DECISIONS.md`。已随最终提交一并入库。
