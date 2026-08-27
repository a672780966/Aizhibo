# DEV-035 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-035.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `createElevenLabsTtsProvider`：真实 ElevenLabs Streaming API 客户端，原生
  `fetch`/`stream/promises`，零新增依赖；文件名用 `sha256(voiceId:text)` 幂等
  命名；HTTP 错误/网络异常均转为 `{ok:false,reason}`，不抛异常。
- `createOptionalElevenLabsTtsProvider`：无 `ELEVENLABS_API_KEY` 时**原样返回**
  DEV-034 的 `noopTtsProviderPort`（身份相等，不是另一份实现）。
- `getElevenLabsHealth`/`getOptionalElevenLabsHealth`：CR-019 本包首次真正
  适用——对 `/v1/user`（不消耗合成配额的只读端点）主动探测，无 key 时不发
  请求直接 `DOWN`。
- 不接入 `runtime-kernel` 任何调用点——真正调用时机与 dice 计时编排是 DEV-037
  的职责（`onResolve` 目前是同步 action，接入需要先把它改成能等待异步结果，
  是一次独立更大的 CR）。
- 不实现缓存/去重存储（DEV-036 职责）。

## Scope（Task Package 第 3 节）

Writable：`elevenLabsTtsProvider.ts(.test.ts)`、`index.ts`（追加）、
`specs/dev/DEV-035/*.md`、`specs/comms/LEDGER.md`（仅追加）、
`specs/comms/NNNN-OPENCODE-to-*.md`。

Forbidden（摘录）：不接入 runtime-kernel；不实现缓存；不实现 dice 计时编排；
不新增依赖；不改 `ttsProvider.ts`/`resolveAudioSource.ts`；不预设输出目录。

## Task Order

T001 节点文档 → T002 `elevenLabsTtsProvider.ts` + 测试（**测试全程零真实网络
请求，全部通过注入 `fetchImpl`**）→ T003 `index.ts` 导出 + 全量验证 + REPORT +
commit + NODE_REPORT。
