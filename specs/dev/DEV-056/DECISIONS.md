# DEV-056 DECISIONS

本文件记录 DEV-056（Host LLM Provider）实现中的关键决策与理由。Task
Package 第 6 节要求的要点逐一覆盖（D1–D3）。

## D1 — 为何不实现任何真实网络调用（只定义接口 + noop 占位）

**决策**：本节点只交付两样东西——`HostLLMProvider` 可替换接口（Dev
Spec 字面要求的抽象层本身）+ 一个诚实的 `noopHostLLMProvider` 占位
实现。占位永远返回 `{ ok: false, reason: 'no Host LLM provider
configured' }` / `{ status: 'DOWN', error: ... }`，不发起任何网络
请求、不伪造成功结果。不写任何 HTTP 客户端、不 import `fetch`、不
引入任何第三方 LLM SDK。

**理由**：
- Dev Spec 第五施工组 DEV-056（第 2696–2698 行）全文只有"只需一个
  可替换 Provider API"这一句话，没有指定任何具体 LLM 厂商、API
  协议、认证方式。核对全篇 Dev Spec，再无任何其他地方定义过 Host
  LLM Provider 的具体调用协议。
- 在厂商/协议均未指定的此刻编写真实 HTTP 客户端，等于自己发明一套
  猜测性接线协议约定（比如假设 OpenAI 兼容格式、某个特定鉴权头、
  某种错误码映射）。一旦未来真实选定的厂商不兼容这套假设，就是
  白白浪费的代码。
- 同项目既有取舍先例完全一致：`platform-twitch` 的
  `TwitchAuthPort`/`noopTwitchAuthPort`（DEV-040，DEV Spec 对
  Twitch 鉴权同样未给协议细节）"先定义可替换接口 + 诚实占位默认值，
  真实凭证到位后再补真实实现"。
- 等真实账号/厂商选定后，再通过 FIX/CR 补齐真实实现，接口契约
  （`generateReply`/`getHealth`）届时保持不变——这正是"可替换
  Provider API"这一抽象层的价值所在。

## D2 — 为何 Health 用本地类型镜像，不引入 @interactive-story/shared 依赖

**决策**：`Health` 类型（`status: 'OK' | 'DEGRADED' | 'DOWN'` +
`lastSuccessAt?`/`latencyMs?`/`error?`）在 `hostLLMProvider.ts` 内
本地定义、不导出，仅作为接口方法 `getHealth` 的返回类型使用；不
import `@interactive-story/shared` 的 `health.ts`。

**理由**：
- 形状与 `packages/shared/src/health.ts` 的契约逐字段一致——本地
  镜像不是另起炉灶，而是同一个契约为避免 workspace 依赖而做的
  本地复制。
- 完全沿用 `platform-twitch/src/twitchAuth.ts`（DEV-040）的既有
  先例：twitchAuth.ts 同样是本地 `Health` 类型镜像而非引入 shared
  依赖，并已在注释里写明与 `packages/shared/src/health.ts` 逐字段
  一致的出处。
- 保持 `ai-host` 现有五个模块（`egressGate`/`commentPipeline`/
  `hostPersona`/`hostMood`/`hostScheduler`）零
  `@interactive-story/shared` 依赖的既有边界不变——本节点不改变
  这条边界，未来若出现真正需要跨包共享类型的理由再另行决策。

## D3 — 为何 generateReply 只接收 prompt: string，不组装 Host Context 八项输入

**决策**：`generateReply(prompt: string): Promise<HostLLMResult>` 只
接收一个由调用方拼好的字符串 prompt。不定义 Host Context 八项输入的
参数形状、不做任何拼装、不读取任何真实状态。

**理由**：
- "把 Host Context（频道信息/观众记忆/故事上下文等八项输入）拼成
  真正喂给 LLM 的 prompt"是未来某个尚未建造的 Runtime 组合层的
  职责，不是本节点的职责——与 DEV-052/053/054/055 同构节点对
  Host Persona/Mood/Scheduler 的处理方式一致（Dev Spec 未定义的
  组装职责不提前发明）。
- 本节点只提供"调用 LLM 生成一段回复文本"这个动作的可替换接口
  本身。接口越窄越稳：`prompt: string` 是任何真实 LLM 厂商接入时
  都必然需要的形状，不携带任何厂商特定的猜测性结构。
- 调用方注入模式让接口可被纯测试完整覆盖（本节点 4 条测试），
  不依赖任何 IO/时序/全局状态。
