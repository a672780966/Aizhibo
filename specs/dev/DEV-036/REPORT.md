# DEV-036 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

- 新增 `audioCache.ts`：
  - `computeAudioCacheKey`：对 `{voiceModelVersion, voiceId, text,
    voiceSettings}` 做确定性序列化（`voiceSettings` 键先排序再
    `JSON.stringify`）后 `sha256` 十六进制摘要。`voiceModelVersion` 参与摘要，
    只改模型版本必然得到不同 key（本节点核心，修正 DEV-035 幂等命名哈希
    `sha256(voiceId:text)` 缺少 `voiceModelVersion`/完整 `voiceSettings` 的缺口）。
  - `createAudioCache({cacheDir, voiceModelVersion})`：`voiceModelVersion` 作为
    构造参数（部署级常量），不进 `AudioResolutionRequest`。`findCached` 用目录
    前缀扫描（`readdirSync().find(name => name.startsWith(key))`），`cacheDir`
    不存在返回 `undefined` 不抛异常；`store` 用 `fs.copyFileSync`（复制非移动），
    保留源文件真实扩展名（不硬编码 `.mp3`），`cacheDir` 不存在则先
    `mkdirSync(recursive)`。
  - `getAudioCacheHealth(cacheDir)`：参照 `persistence.getHealth`（DEV-010 先例）
    风格，写临时探测文件再删除，成功 → `OK`（含 `latencyMs`/`lastSuccessAt`），
    任何异常 → `DOWN`（含 `error`），同步实现，无模块级可变状态。
- `index.ts` 追加导出 `audioCache.js` 全部公开符号。
- 未接入 `AudioResolutionPorts`/`resolveAudioSource`/`runtime-kernel` 任何调用点
  （接线是未来节点职责）；未修改冻结的 `resolveAudioSource.ts`/
  `ttsProvider.ts`/`elevenLabsTtsProvider.ts`；未新增 npm 依赖。

## 3. Changed Files

Writable Scope 内共 7 个文件：

```text
packages/audio-engine/src/audioCache.ts
packages/audio-engine/src/audioCache.test.ts
packages/audio-engine/src/index.ts
specs/dev/DEV-036/INDEX.md
specs/dev/DEV-036/ACCEPTANCE.md
specs/dev/DEV-036/DECISIONS.md
specs/dev/DEV-036/REPORT.md
```

`ACCEPTANCE.md` 本次修正 A13 行补上权威副本（Task Package 第 12 节）已有的
`（未被修改）` 括注，恢复与权威版本逐字一致（协议 §1.4，权威版本仍是 Task
Package）。`resolveAudioSource.ts`、`ttsProvider.ts`、`elevenLabsTtsProvider.ts`、
`packages/runtime-kernel/**`、`apps/renderer/**` 以及 Task/Spec/Audit/Protocol
文件均未修改。

## 4. Tests Executed

六条命令严格按要求顺序执行，全部退出码 0：

| # | 命令 | 结果 |
|---|---|---|
| 1 | `pnpm install` | 0；workspace 11 projects，Already up to date |
| 2 | `pnpm typecheck` | 0 |
| 3 | `pnpm lint` | 0 |
| 4 | `pnpm format:check` | 0；All matched files use Prettier code style |
| 5 | `pnpm build` | 0 |
| 6 | `pnpm test` | 0；105 test files passed，560 tests passed（DEV-035 基线 551，新增 9） |

`audioCache.test.ts` 共 9 条：`computeAudioCacheKey` 确定性（相同输入→相同 key）、
`voiceModelVersion` 敏感性（仅模型版本不同→不同 key）、`voiceSettings` 键顺序
不敏感、`voiceSettings` 值敏感；`findCached` 目录不存在→`undefined` 不抛异常；
`store`→`findCached` 往返（`.ogg` 扩展名验证非硬编码 `.mp3`、内容一致、源文件仍
存在证明复制非移动）；两个 `voiceModelVersion` 共享 `cacheDir` 互不串扰端到端
（真实临时目录）；`getAudioCacheHealth` 可写目录→`OK`（含 `latencyMs`）、
非法路径→`DOWN`（含 `error`）不抛异常。测试全部使用真实临时目录（
`mkdtemp`），无网络、无外部依赖。

`DECISIONS.md`（D1–D6）已写入并随本次提交入库。

## 5. Acceptance Results

| # | 判定 | 结果 | 依据 |
|---|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS | Tests Executed #1 |
| A02 | `pnpm typecheck` 退出码 0 | PASS | Tests Executed #2 |
| A03 | `pnpm lint` 退出码 0 | PASS | Tests Executed #3 |
| A04 | `pnpm format:check` 退出码 0 | PASS | Tests Executed #4 |
| A05 | `pnpm build` 退出码 0 | PASS | Tests Executed #5 |
| A06 | `pnpm test` 退出码 0、既有全部测试零回归 | PASS | 105 files / 560 tests（551→560，零回归） |
| A07 | 相同输入→相同 key，仅 `voiceModelVersion` 不同→不同 key | PASS | `computeAudioCacheKey` 前两条测试 |
| A08 | `voiceSettings` 键顺序不同但内容相同→相同 key | PASS | 键顺序测试（`stability`/`similarity_boost` 反序） |
| A09 | `findCached`：`cacheDir` 不存在→`undefined`，不抛异常 | PASS | `does-not-exist` 子目录测试 |
| A10 | `store`→`findCached` 往返：路径可读、内容一致、扩展名一致 | PASS | `.ogg` 源文件往返测试 |
| A11 | 两个不同 `voiceModelVersion` 共享 `cacheDir` 互不串扰（端到端） | PASS | 真实临时目录双 cache 测试 |
| A12 | `getAudioCacheHealth` 可写→`OK`；不可写/非法路径→`DOWN`，不抛异常 | PASS | 可写目录 OK；文件之下路径/NUL 路径 DOWN |
| A13 | `AudioResolutionRequest` 未新增 `voiceModelVersion` 字段 | PASS | 交付 diff 为空 |
| A14 | `resolveAudioSource.ts`/`ttsProvider.ts`/`elevenLabsTtsProvider.ts` 逐字节未变 | PASS | 交付 diff 为空 |
| A15 | `packages/runtime-kernel/**`、`apps/renderer/**` 未被修改 | PASS | 交付 diff 为空 |
| A16 | 未新增任何 npm 依赖 | PASS | package.json 未修改，仅 Node 原生 fs/crypto/path |
| A17 | `DECISIONS.md` 覆盖第 6 节全部要点 | PASS | D1–D6 |
| A18 | 节点文档齐全、`INDEX.md` T001–T003 勾选、Status=READY_FOR_REVIEW | PASS | `specs/dev/DEV-036/` |
| A19 | 恰 1 条新提交、首行 `DEV-036: audio cache`、提交时 porcelain 为空 | PASS | 本次交付 commit 核验 |
| A20 | LEDGER 含 NODE_REPORT 且 git_head 一致 | PASS | commit 后追加消息与 LEDGER 行 |
| A21 | PROJECT_INDEX/DAG/tasks/audit/protocol 未修改 | PASS | 交付 diff 为空 |

## 6. Scope Check

只施工 DEV-036。没有推进任何其他 DEV 节点；没有修改
`AudioResolutionRequest`/`resolveAudioSource.ts`/`ttsProvider.ts`/
`elevenLabsTtsProvider.ts`/`runtime-kernel`/`renderer`；没有复用或修改 DEV-035
内部幂等命名哈希（`computeAudioCacheKey` 独立实现，含 `voiceModelVersion` 与
完整 `voiceSettings`）；没有新增 npm 依赖；没有接入任何调用点；没有实现缓存淘汰
或 Host TTS 真实消费路径（Non-goals）。

## 7. Commit

提交信息首行：`DEV-036: audio cache`。

`DECISIONS.md` 已包含在该提交中。

## 8. Handoff

NODE_REPORT 发往 `AUDITOR`，抄送 `COMMANDER`；审核锚点与交付快照见
`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-036.md`。
