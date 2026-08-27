# DEV-035 DECISIONS

## D1 — 使用 Node 原生 API，不新增依赖

使用 Node ≥22 已提供的 `fetch`、`Readable.fromWeb`、`stream/promises.pipeline`、文件系统与
`crypto` API 完成 HTTP 流式写文件。现有运行时能力已经覆盖需求，新增 HTTP 客户端或
ElevenLabs SDK 只会扩大依赖面。

## D2 — 产物使用内容哈希命名

文件名采用 `sha256(voiceId:text).mp3`，而不是时间戳或随机值。同一音色与文本稳定得到
同一路径，满足本节点要求的幂等命名并保持确定性；这不是缓存或去重存储，缓存职责留给
DEV-036。

## D3 — 不接入 runtime-kernel

真实 TTS 请求可能耗时数百毫秒至数秒，而当前 runtime-kernel 的相关 action 是同步链路。
Provider 只作为独立的 `TtsProviderPort` 实现交付；调用时机、等待、降级与 `AUDIO_READY`
编排由 DEV-037 负责，避免提前改动冻结的 runtime-kernel。

## D4 — 不实现缓存

本节点只负责把一次成功的响应流写到调用方传入的 `outputDir`。输出目录不预设，文件名
哈希仅提供稳定命名；真实缓存、生命周期与去重策略属于 DEV-036。

## D5 — 健康检查采用主动探测

`getElevenLabsHealth` 只在被调用时向只读的 `/v1/user` 发起一次探测，不在合成后维护
模块级状态。这样与 persistence 的按需 `getHealth` 风格一致，也避免隐藏的可变状态与
额外网络请求。

## D6 — `/v1/user` 用于密钥健康检查

ElevenLabs 的 `/v1/user` 是验证 API key 的只读端点，不触发语音合成、不消耗合成配额，
适合作为健康检查。2xx 返回 `OK`，HTTP 错误和网络异常均返回带原因的 `DOWN`。

## D7 — 密钥可选且测试注入 fetch

`ELEVENLABS_API_KEY` 缺失或为空时直接返回 DEV-034 的 `noopTtsProviderPort` 本体；健康
检查同样直接返回 `DOWN`。所有测试都注入假 `fetch`，因此测试不依赖账号，也不会发出真实
网络请求。
