# DEV-036 DECISIONS

## D1 — `voiceModelVersion` 是构造参数，不是每请求字段

规范第 51 节要求缓存 key 包含 `voiceModelVersion`，但它不是一次请求会变化的数据，
而是"当前部署用的是哪个语音模型版本"——单次部署级别的常量。若放进已冻结的
`AudioResolutionRequest`（DEV-030 冻结：`contentId/text/voiceId/voiceSettings`），
既是对冻结类型的越界修改，也会让每次请求多携带一个不随请求变化的字段。因此放在
`createAudioCache` 的构造参数 `AudioCacheConfig.voiceModelVersion` 中，由
`createAudioCache` 捕获。这样 `findCached(input)` 的签名形状与
`AudioResolutionPorts.findCached(request) => string | undefined` 直接兼容
（`voiceId/text/voiceSettings` 齐全），但本节点不做那次实际接线。

## D2 — 不与 DEV-035 的幂等命名哈希合并

DEV-035 的 `createElevenLabsTtsProvider` 为幂等命名自算 `sha256(voiceId:text)`。
该哈希不含 `voiceModelVersion`、不含完整 `voiceSettings`，只是"同一次调用重复请求
不用发两次网络请求"的局部幂等手段，从未打算充当真正的缓存 key（DEV-035
`DECISIONS.md` D4 已明确缓存是 DEV-036 职责）。本节点是规范第 51 节要求的完整、
正确的缓存 key 算法，两者用途不同；合并只会让 DEV-035 的幂等命名退化为错误的缓存
key（换模型版本会错误复用旧音频），因此保持两套哈希独立。

## D3 — `store` 用复制而非移动

`fs.copyFileSync` 保留调用方对 `sourceFile` 的所有权假设：调用方（未来的
resolveAudioSource/Result TTS 调用链）把一段刚合成出来的音频交给缓存时，它可能
仍需要该文件用于其他目的；移动会让调用方持有的路径失效。复制多花一次 IO，但语义
最小惊讶，不改变任何所有权约定。

## D4 — `findCached` 用目录前缀扫描而非固定扩展名假设

`store()` 保留源文件真实扩展名（`extname(sourceFile)`），不硬编码 `.mp3`——缓存
可能存 `.mp3`/`.ogg`/`.wav` 等任意格式。因此 `findCached` 不能假设固定扩展名，
改为 `readdirSync(cacheDir).find(name => name.startsWith(key))`，用 key 前缀匹配
真实存在的文件。缓存目录不存在（从未写入过任何缓存）时视为未命中返回 `undefined`，
不抛异常——`readdirSync` 失败即返回 `undefined`，与
`AudioResolutionPorts.findCached` 的"未命中 = undefined"语义一致。

## D5 — `getAudioCacheHealth` 探测方式

CR-019（getHealth 自落地起）在本模块首次真正适用（真实文件系统 IO）。参照
`packages/persistence/src/health.ts`（DEV-010 先例）风格：写一个临时探测文件到
`cacheDir` 再删除，成功 → `OK`（含 `latencyMs`/`lastSuccessAt`），任何异常（目录
不可写、路径非法等）→ `DOWN`（含 `error`）。同步实现（`writeFileSync`/
`rmSync`），不引入模块级可变状态，与 persistence 的按需 `getHealth` 风格一致。

## D6 — 不接入任何调用点

`AudioResolutionPorts`/`resolveAudioSource.ts`（DEV-030 冻结）、
`elevenLabsTtsProvider.ts`（DEV-035 冻结）、`packages/runtime-kernel/**` 一律不
修改。本节点只交付一个独立、可测试的缓存实现，形状上可直接满足
`AudioResolutionPorts.findCached` 的签名，但何时/由谁真正把它接进
`resolveAudioSource` 或 Result TTS 的调用链，留给未来节点决定。
