# DEV-035 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

- 新增 `createElevenLabsTtsProvider`：使用 Node 原生 `fetch` 调用 ElevenLabs
  Streaming API，以 `sha256(voiceId:text).mp3` 确定性命名并通过
  `stream/promises.pipeline` 流式写入调用方提供的 `outputDir`。
- 新增 `createOptionalElevenLabsTtsProvider`：无 key 时严格返回 DEV-034 的
  `noopTtsProviderPort` 本体，有 key 时组合真实 Provider。
- 新增 `getElevenLabsHealth` 与 `getOptionalElevenLabsHealth`：主动探测只读的
  `/v1/user`，HTTP/网络错误返回 `DOWN`，无 key 不发请求。
- `index.ts` 追加导出全部公开符号；未接入 runtime-kernel、未实现缓存或 dice
  编排；未新增 npm 依赖。

## 3. Changed Files

Writable Scope 内共 6 个文件：

```text
packages/audio-engine/src/elevenLabsTtsProvider.ts
packages/audio-engine/src/elevenLabsTtsProvider.test.ts
packages/audio-engine/src/index.ts
specs/dev/DEV-035/INDEX.md
specs/dev/DEV-035/DECISIONS.md
specs/dev/DEV-035/REPORT.md
```

`ttsProvider.ts`、`resolveAudioSource.ts`、`packages/runtime-kernel/**`、
`apps/renderer/**` 以及 Task/Spec/Audit/Protocol 文件均未修改。

## 4. Tests Executed

六条命令严格按要求顺序执行，全部退出码 0：

| # | 命令 | 结果 |
|---|---|---|
| 1 | `pnpm install` | 0；11 workspace projects，Already up to date |
| 2 | `pnpm typecheck` | 0 |
| 3 | `pnpm lint` | 0 |
| 4 | `pnpm format:check` | 0；All matched files use Prettier code style |
| 5 | `pnpm build` | 0 |
| 6 | `pnpm test` | 0；104 test files passed，551 tests passed（DEV-034 基线 544，新增 7） |

Provider 测试的所有网络调用均通过 `fetchImpl` 注入假实现；测试未发出真实网络
请求。`DECISIONS.md` 已包含原生依赖、确定性命名、runtime-kernel、缓存、主动健康
探测及 `/v1/user` 选择的决策记录。

## 5. Acceptance Results

| # | 判定 | 结果 | 依据 |
|---|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS | Tests Executed #1 |
| A02 | `pnpm typecheck` 退出码 0 | PASS | Tests Executed #2 |
| A03 | `pnpm lint` 退出码 0 | PASS | Tests Executed #3 |
| A04 | `pnpm format:check` 退出码 0 | PASS | Tests Executed #4 |
| A05 | `pnpm build` 退出码 0 | PASS | Tests Executed #5 |
| A06 | `pnpm test` 退出码 0、零回归、零真实网络请求 | PASS | 104 files / 551 tests；fetch 全部注入 |
| A07 | 无 key 时返回 `noopTtsProviderPort` 本体 | PASS | 测试使用 `toBe` 身份比较 |
| A08 | 200 响应流式写文件且内容匹配 | PASS | 临时目录、真实可读流 body 测试 |
| A09 | 同一 `(voiceId,text)` 文件名幂等 | PASS | 同一请求两次返回同一路径 |
| A10 | HTTP 错误/网络异常返回失败联合、不抛出 | PASS | 401、空 body、抛异常测试 |
| A11 | URL/header/body 构造正确 | PASS | 编码 voiceId、`xi-api-key`、JSON 断言 |
| A12 | 无 key 健康检查 DOWN 且零网络请求 | PASS | 调用计数保持 0 |
| A13 | 健康检查 200/非 200/异常分别 OK/DOWN/DOWN | PASS | 注入 fetch 的参数化测试 |
| A14 | 未新增 npm 依赖 | PASS | package.json 未修改，使用 Node 原生 API |
| A15 | 冻结的 `ttsProvider.ts`/`resolveAudioSource.ts` 未变 | PASS | 交付 diff 为空 |
| A16 | runtime-kernel/renderer 未修改 | PASS | 交付 diff 为空 |
| A17 | `DECISIONS.md` 覆盖第 6 节全部要点 | PASS | D1–D7 |
| A18 | 节点文档齐全、T001–T003 勾选、Status=READY_FOR_REVIEW | PASS | `specs/dev/DEV-035/` |
| A19 | 恰 1 条新提交、首行符合要求、提交时 porcelain 为空 | PASS | 本次交付 commit 核验 |
| A20 | LEDGER 含 NODE_REPORT 且 git_head 一致 | PASS | commit 后追加消息与 LEDGER 行 |
| A21 | PROJECT_INDEX/DAG/tasks/audit/protocol 未修改 | PASS | 交付 diff 为空 |

## 6. Scope Check

只施工 DEV-035。没有推进任何其他 DEV 节点；没有新增外部依赖、真实账号验证、
缓存系统、runtime-kernel 调用点、AUDIO_READY 编排或其他禁止范围内容。

## 7. Commit

提交信息首行：`DEV-035: result tts (elevenlabs provider)`。

`DECISIONS.md` 已包含在该提交中。

## 8. Handoff

NODE_REPORT 发往 `AUDITOR`，抄送 `COMMANDER`；审核锚点与交付快照见
`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-035.md`。
