# 发布前缺口清单（PRE-LAUNCH GAPS）

本文件由 Claude Commander 维护。首次整理：2026-09-09（M8 真实可施工
范围完成后，按 USER 既定顺序"先推完 M8 → 整理发布前缺口清单 →
逐项填补"起草）。

## 目的与范围

M1–M8 全部真实可施工 DAG 节点已 `DONE`/`BLOCKED`（见
`specs/PROJECT_INDEX.md`）。但"DAG 节点全部走完"≠"可以正式公开
运行"——Dev Spec 第 69 节定义了独立于 DAG 节点编号的**最终上线
Gate（G01–G14）**（`specs/baseline/DEV_SPEC_V1.0.md:2964-3009`），
"只有全部通过才能正式公开运行"。本文件盘点：

1. 对照 G01–G14，逐条给出当前真实状态（非猜测，均附证据）；
2. 盘点 DAG 节点完成之外、仍会阻挡真实上线的代码/配置缺口；
3. 盘点已知因缺真实凭据/人工验收而暂缓、非代码缺陷的事项；
4. 汇总当前 `BLOCKED` 的 DAG 节点。

不重开任何已冻结的 DAG 节点裁决；本文件是**只读盘点+待办清单**，
"逐项填补"阶段的实际施工仍走既定 Task Package/审计流程。

---

## 一、最终上线 Gate（Dev Spec 第 69 节）现状核对

| Gate | 定义 | 现状 | 证据 |
|---|---|---|---|
| G01 | Chapter Compiler PASS | ✅ 满足 | DEV-002/002A/003 `DONE`，编译器测试套件随 CI 常跑常绿 |
| G02 | 100,000 次 Simulation PASS | ❌ 未做 | `specs/PROJECT_INDEX.md:383`（DEV-007 裁决原文）明确记录：CI 内只做 50 局规模机制回归，**明确 Non-goal** 不跑真实 10,000+/100,000+ 局，因为"G02 是上线前产品级 Gate，需真实 Chapter 内容"——需要真实内容产出后才能执行，属产品级一次性验收任务，非常规 CI 项 |
| G03 | Replay 100% deterministic | 部分满足 | DEV-011（Deterministic Replay）`DONE`，机制级确定性由单元测试覆盖；未在 G02 规模的真实局数上做过大样本复核 |
| G04 | Twitch reconnect PASS | ✅ 满足 | DEV-045 `DONE`，指数退避重连 + 回归测试；`watchdog.ts` 的 `TWITCH_DISCONNECT` 分支复用此机制（`ALREADY_HANDLED`） |
| G05 | Event duplicate 0 次重复计票 | ✅ 满足 | DEV-043（Message Deduplication）`DONE`，bounded FIFO 去重 + 回归测试 |
| G06 | Host Hidden Information Leak = 0 | ✅ 满足（三道防线） | `specs/dev/DAG.md:119,379` 记录编译期（DEV-002A）、类型层（DEV-009）、运行时（DEV-050）三道防线均 `DONE` |
| G07 | AI Host failure 不影响 Story | 部分满足/未经真实验证 | 架构上 `noopHostLLMProvider`（`packages/ai-host/src/hostLLMProvider.ts:20-23`）等 4 个 AI Port 全部诚实 noop 降级，Story 侧不阻塞——但从未接入过一个**真实**会失败的 LLM Provider，"failure 不影响 Story"目前只验证了"never-called 不影响 Story"，非"real call that fails 不影响 Story" |
| G08 | TTS failure 不影响 Story | 部分满足 | `createOptionalElevenLabsTtsProvider`（`packages/audio-engine/src/elevenLabsTtsProvider.ts:109-116`）是真实 HTTP 客户端，缺 Key 时降级 noop；真实网络失败（超时/5xx/额度耗尽）路径的降级行为需要真实 Key 才能实测，目前只验证了缺 Key 场景 |
| G09 | Runtime Crash 可以恢复 | ❌ 未满足 | `specs/dev/DAG.md:476` 明确：DEV-066（Crash Recovery）`BLOCKED`——恢复逻辑本身（`persistence.loadLatestSnapshot`/`restoreSession`、`operator-api` `RESTORE_LKG`）已存在且可用，但**没有生产进程可供崩溃/重启**（下方缺口 1），"恢复"目前无真实宿主可验证 |
| G10 | Renderer Crash 可以恢复 | ❌ 未满足 | 同 G09 根因：`watchdog.ts:27` `RENDERER_CRASH` 分支返回 `NOT_YET_WIRED`，同因缺口 1 |
| G11 | OBS Failover PASS | ❌ 未满足 | DEV-065 `BLOCKED`；`platform-obs`（DEV-064）已有真实 OBS WebSocket v5 客户端（`switchScene` 可用），但"何时切换"的判断权按 CR-020 归属 SAFETY 区，SAFETY 区仍是零转移的单状态占位（见下方缺口 3） |
| G12 | 24h Soak PASS | ❌ 未做 | 全仓搜索确认没有任何 soak 测试脚本/CI job；且无生产进程可供长跑（缺口 1），物理上无法执行 |
| G13 | 72h Soak PASS | ❌ 未做 | 同 G12 |
| G14 | 168h Soak PASS | ❌ 未做 | 同 G12 |

**小结：14 项 Gate 中，5 项满足（G01/G04/G05/G06 + 部分 G03），3 项
部分满足但未经真实故障场景验证（G03/G07/G08），6 项完全未满足
（G02/G09/G10/G11/G12/G13/G14 —— 注：G02 单独计，故总数含重叠）。
G09/G10/G11/G12/G13/G14 六项的根本原因高度收敛为下方缺口 1（无生产
组合根）与缺口 3（SAFETY 区仍占位）两项，不是六个独立问题。**

---

## 二、硬性阻挡真实上线的代码/配置缺口

### GAP-01 — 不存在生产组合根（composition root）/ 生产入口进程

**现状**：`packages/*/package.json` 全部 26 个包只有 `"main":
"dist/index.js"`（库 barrel），无一个声明 `bin`/`start`。唯一可执行
应用是 `apps/renderer`（纯前端 Vite 应用，`apps/renderer/src/main.tsx`），
无后端接线。仓库内没有任何文件把 `runtime-kernel` +
`platform-twitch`/`platform-youtube`/`platform-bilibili` + `ai-host` +
`host-memory` + `platform-obs`/`interaction-engine` 接成一个真实运行
进程。`packages/watchdog/src/watchdog.ts:34` 原文即为
`'no production process exists yet that could be restarted'`。

**影响**：这是当前**最大的单一缺口**——今天没有任何一条路径能把
系统作为整体跑起来。直接导致 G09/G10/G11/G12/G13/G14 六项 Gate
物理上无法验证，且是 DEV-065/066/067 三个 `BLOCKED` 节点的共同根因
之一。

**处置**：需要一个新的顶层应用（如 `apps/host-process` 或
`services/live`），按既定 Task Package 流程排期——不属于任何已冻结
DAG 节点范围，需 USER 决定是否/何时新开节点覆盖。

### GAP-02 — SAFETY 状态区仍是零转移单状态占位

**现状**：`packages/runtime-kernel/src/placeholderRegions.ts:12-19`：

```ts
const idlePlaceholder = (id: string) => ({
  initial: 'IDLE' as const,
  states: { IDLE: { description: `${id} placeholder (M4/M5/M6)` } },
});
export const safetyRegion = idlePlaceholder('SAFETY');
```

Dev Spec 第 55 节要求的 `HEALTHY/DEGRADED/RECOVERING/FAILOVER/
EMERGENCY_STOP` 五态机零代码。

**影响**：直接导致 DEV-065（OBS Failover）、DEV-067（Emergency Stop）
`BLOCKED`；`operator-api` 的 `SWITCH_OBS_FAILOVER`/`EMERGENCY_STOP`
两个动作因此常驻失败（见 GAP-05）；G11 无法满足。

**附带发现**：同文件的 `hostRegion`/`platformRegion` 占位注释仍写
"HOST -> M5"/"PLATFORM -> M4"，但 M4/M5 已全部 `DONE`——这两个区域是
否已在别处获得真实状态、还是遗留死占位，需单独确认（见 GAP-12）。

**处置**：需 USER 就 SAFETY 状态机排期（不属于任何已冻结节点范围，
DEV-065/066/067 解冻的前提）。

### GAP-03 — 4 个 AI 相关 Port 全仓零真实网络调用

**现状**（更正此前记忆中"3 个 noop Port"的口径——实际是 4 个）：

- `HostLLMProvider` —— 仅 `noopHostLLMProvider`
  （`packages/ai-host/src/hostLLMProvider.ts:20-23`）
- `HostTtsProvider` —— 仅 `noopHostTtsProvider`
  （`packages/ai-host/src/hostTtsProvider.ts:27-30`）
- `AiChapterGeneratorPort` —— 仅 `noopAiChapterGeneratorPort`
  （`packages/ai-chapter-generator/src/aiChapterGeneratorPort.ts:20-29`）
- `AiRepairPort` —— 仅 `noopAiRepairPort`
  （`packages/ai-compiler-repair-loop/src/aiRepairPort.ts:20-29`）

**排除项**：`TtsProviderPort`（`packages/audio-engine`）**不在此列**——
`createElevenLabsTtsProvider` 是真实可用的 ElevenLabs HTTP 客户端，
只在缺 Key 时降级 noop，属 GAP-06（凭据缺口），非代码缺陷。

**影响**：Host 对话生成、Host 语音合成、AI 章节生成、AI 编译修复
四条能力线在当前仓库中从未有一次真实外部调用；G07 的"failure 不
影响 Story"目前只验证了"从不调用"这一种情况。

**处置**：按既定 noop-降级设计原则，这是**有意的架构决策**，非
缺陷——只在选定真实 Provider（含供应商/协议/账号）时才转为实现
工作。是否/何时选型属产品决策，需 USER 排期。

### GAP-04 — 零部署配置

**现状**：仓库无 `Dockerfile`/`docker-compose.yml`/`deploy/`/`infra/`。
`.github/workflows/ci.yml` 只跑 install/typecheck/lint/format/build/
test，无发布/打包/部署/密钥注入步骤。specs 内无任何托管目标定义。

**影响**：即使 GAP-01 的生产组合根建成，目前也没有任何自动化路径
把它部署到任何环境。

**处置**：需 USER 决定目标托管环境（自建服务器/云平台/容器编排等）
后才能排期，不属于任何已冻结 DAG 节点范围。

### GAP-05 — Operator API 11 个动作中 8 个恒定失败

**现状**：`packages/operator-api/src/operatorDispatch.ts:45-63`——只有
`MUTE_HOST`/`UNMUTE_HOST`/`RESTORE_LKG` 真实生效；其余 8 个
（`PAUSE`/`RESUME`/`CLOSE_INTERACTION`/`FORCE_RESOLVE`/
`REPLAY_CURRENT_AUDIO`/`RESTART_SCENE`/`SWITCH_OBS_FAILOVER`/
`EMERGENCY_STOP`）均无条件返回 `ok:false` 并附带诚实原因（如
`SWITCH_OBS_FAILOVER` 原因"OBS integration not yet built (planned
DEV-064/DEV-065)"）。

**影响**：直接是 GAP-01/GAP-02 在运营控制台侧的表现，非独立缺陷；
随 GAP-01/02 解决而自然解决的比例待评估（部分动作如
`RESTART_SCENE`/`PAUSE`/`RESUME` 可能还需运行时侧新增能力，不
100% 是接线问题）。

### GAP-06 — 全仓零真实凭据（预期内，非代码缺陷）

**现状**：`TWITCH_CLIENT`/`TWITCH_CLIENT_SECRET`/`TWITCH_REFRESH_TOKEN`
（`platform-twitch/src/twitchAuth.ts:115-117,133-135`）、
`YOUTUBE_CLIENT`/`YOUTUBE_CLIENT_SECRET`/`YOUTUBE_REFRESH_TOKEN`
（`platform-youtube/src/youtubeAuth.ts:95-97`）、
`BILIBILI_ACCESS_KEY_SECRET`（`platform-bilibili/src/bilibiliAuth.ts:251`）、
`ELEVENLABS_API_KEY`（`audio-engine/src/elevenLabsTtsProvider.ts:113,150`）、
`OPERATOR_API_TOKEN`（`operator-api/src/operatorAuth.ts:32`，未配置时
默认拒绝，安全默认值非缺陷）——全部只读取环境变量名，从未配置真实
值；无 `.env`/`.env.example`/密钥管理集成。

**处置**：这是**预期状态**（USER 已明确裁定"不会绑定任何账号和
密钥，占位就行了"）——列在此处仅作为发布前**待办清单**，而非
待修复缺陷：正式上线前需实际申请/配置 Twitch OAuth App+Refresh
Token、YouTube OAuth Client+Refresh Token、Bilibili 开放平台
Access Key/Secret、ElevenLabs API Key、真实 Operator API Bearer
Token，以及 GAP-03 四个 AI Port 各自选型后的凭据。

### GAP-07 — CR-018 §4.6 拼接听感人工试听验收未完成

**现状**：`specs/dev/DAG.md:601-616`（DEV-074 节点裁决原文）：
"不声称 CR-018 §4.6 拼接听感原型的人工试听验收已完成——该验收
`DEV-030/DECISIONS.md` D3 已如实记录为未完成，至今无后续节点执行，
仍待人工执行"；同见 `specs/audit/CR-RESOLUTIONS-001.md:358`。

**影响**：若人工试听判定拼接听感不可接受，CR-018 的既定后备方案是
"仅预生成 PRIMARY 分支音频块，其余走运行时 TTS"——这是一次真实的
架构分叉决策，目前悬而未决。

**处置**：需人工执行一次试听验收（非 AI Agent 可代劳），USER 决定
何时安排。

---

## 三、`BLOCKED` DAG 节点汇总（现状核对，与 LEDGER/DAG.md/PROJECT_INDEX.md 一致）

| 节点 | 名称 | 阻塞原因（现状复核） | 解冻条件 |
|---|---|---|---|
| DEV-038 | Audio Ducking | `runtime-kernel` `audioRegion` 无 `PLAYING_HOST→DUCKED` 转移；需要来自 `ai-host`/`platform-twitch` 接线的真实 Host 音频播放信号，因 GAP-01 而不存在 | GAP-01 解决 + 真实 Host 音频信号可用 |
| DEV-065 | OBS Failover | SAFETY 区仍单状态占位（GAP-02） | GAP-02 解决 |
| DEV-066 | Crash Recovery | 无生产进程可供崩溃/重启（GAP-01）；恢复逻辑本身已存在可用 | GAP-01 解决 |
| DEV-067 | Emergency Stop | 同 DEV-065 SAFETY 占位根因，另需跨包编排（`operator-api` + `platform-obs` + `platform-twitch`），此编排从未建立 | GAP-02 + GAP-01 解决 |
| DEV-083 | Twitch Extension | 无候选真实接口、Dev Spec 仅标题、17 包冻结列表无预留空包名——2026-09-09 裁定 `BLOCKED`（本会话，commit `3adbf3e`），与前四项性质不同：前四项等真实前置条件出现即可重新评估，DEV-083 需 USER 先定义真实范围 | USER 明确定义"Twitch Extension"真实范围，或 Dev Spec 补齐正文 |

---

## 四、新发现的次要缺口（未在既有非正式清单中）

### GAP-08 — Interaction Gateway（DEV-082）无去重/无限流

`packages/interaction-engine` 的 fan-in/fan-out 明确不做去重/限流
（DEV-082 Forbidden Scope 裁决，`specs/dev/DEV-082/INDEX.md:120-122`）。
三平台同时接入后，聚合器/发送侧目前对刷屏/单平台过载没有任何防护。
非代码缺陷（DEV-082 范围内明确排除），但是发布前需要评估的真实
运营风险。

### GAP-09 — `hostRegion`/`platformRegion` 占位注释疑似过期

`placeholderRegions.ts:7-8` 注释仍写 "HOST -> M5"/"PLATFORM -> M4"，
但 M4/M5 均已 `DONE`。需确认这两个区域的真实状态是否已在别处正确
接入（如接入 `runtime-kernel` 别的机制），还是遗留死代码/误导性
占位——纯文档/代码卫生问题，建议下次接触 `runtime-kernel` 时顺手
核实，不需单独排期节点。

### GAP-10 — `LivePlatformAdapter` v1 仍标注"未经第二实现验证"

CR-017（`specs/audit/CR-RESOLUTIONS-001.md` §3.4）当年的标注在
DEV-080/081（YouTube/Bilibili）落地后未被正式回收确认——两节点
各自采用平行模块结构而非组装统一 `LivePlatformAdapter`，该标注
是否已经因此事实上解决、还是仍应视为未验证，需一次专门确认（非
新施工，只是文档状态复核）。

### GAP-11 — Bilibili 无法发送弹幕（协议层限制，非缺陷）

`packages/platform-bilibili/src/sendChat.ts` 只导出恒失败常量
`unsupportedBilibiliSendChat`——Bilibili 开放平台协议本身无发送
弹幕接口（DEV-081 诚实记录的能力缺口）。发布前需要在产品/运营层
明确告知：Bilibili 观众可以被听到，但 Host 无法在 Bilibili 侧
打字回复。

### GAP-12 — 观众记忆保留策略 purge 函数存在但无调度

`packages/host-memory/src/hostMemory.ts` 的 `purge(retentionMsByPlatform)`
是真实可用函数（非占位），但仓库内没有任何 cron/scheduler 会定期
调用它——本质是 GAP-01（无生产进程）的一个子表现，列出以确保
"填补生产组合根"时不要漏掉这一条调用点。

### GAP-13 — CI 无发布/部署阶段

`.github/workflows/ci.yml` 只到 test 为止，无 tag/版本号/产物发布/
环境密钥注入步骤——与 GAP-04 同根，但作为 CI 流程的具体缺口单独
列出，便于日后扩展 CI 时核对。

---

## 五、下一步

按 USER 既定顺序，本文件完成"整理"阶段。"逐项填补"阶段的排期/
优先级由 USER 决定——本文件不预设填补顺序。建议关注点（仅供参考，
非裁决）：GAP-01（生产组合根）是解锁 G09/G10/G11/G12/G13/G14 六项
上线 Gate 与 DEV-038/065/066/067 四个 `BLOCKED` 节点的公共前提，
影响面最大。
