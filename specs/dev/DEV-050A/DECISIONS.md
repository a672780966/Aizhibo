# DEV-050A DECISIONS

本文件记录 DEV-050A（Host Egress Gate，M5 第二个节点，CR-010）实现中
的工程决策。Task Package 第 6 节要求至少覆盖四个要点：为何权限档位
由调用方传入而非本节点计算、为何不接入 runtime-kernel 事件日志、
C4/C5 参数缺省值选择理由、为何只对已放行文本计入 C4/C5 历史状态。

## D1 — 为何权限档位（ALLOWED/LIMITED/MUTED）由调用方传入，而非本节点计算

Dev Spec 第 39 节"Host Permission"三档的判定依据是**叙事时刻描述**
（"Choice Wait"/"Master Narration"等）——这是对"当前叙事处于什么
时刻、Host 该不该说话"的语义分类。逐项核对 `runtime-kernel`（DEV-009
冻结）全部具名访问器后确认：`storyPhase`/`interactionPhase` 是状态机
状态名（`BOOT`/`STORY_PLAYING`/`OPEN`/`LOCKED`…），**不是**叙事时刻
分类，也没有任何访问器暴露与"Choice Wait"/"Master Narration"对应的
值——叙事时刻描述在本仓库任何冻结接口里都取不到，本节点无从计算
"此刻该是什么权限档位"。

即便将来有人主张"用 `interactionPhase === 'OPEN'` 近似 = ALLOWED"，
那也是**发明**映射规则：Dev Spec 从未给出 状态名 → 权限档位 的对应
表，把状态机内部状态硬编码成权限档位等于把编排决策焊死在最底层
函数里。判定"此刻是什么权限档位"是**编排（orchestration）语义**，
属于未来 Host Scheduler（或更后续编排节点）的职责；本节点作为被
编排的**策略执行点**，只消费一个已经算好的
`permission: 'ALLOWED'|'LIMITED'|'MUTED'` 参数。

Task Package 第 1 节范围核对已明确语义边界："权限判定只此一处"指
**由权限值决定 ALLOW/DROP 只此一处**（即 C1 的 `MUTED → DROP`），
不是"计算权限值只此一处"。按此边界，`LIMITED` 与 `ALLOWED` 在本节点
同样放行到下一关——Dev Spec 未给出 `LIMITED` 的专属限制规则，不发明。

## D2 — 为何本节点不把 HOST.UTTERANCE_DROPPED 接入 runtime-kernel 事件日志

本节点的 DROP 结果（`{rule, matchedTerm}`）完整携带了"为什么丢"
的信息，`attempt()` 返回值本身就足以承载审计语义。把
`HOST.UTTERANCE_DROPPED` **写进 `runtime-kernel` 的事件日志**则是
另一回事：事件日志由 runtime-kernel 内部状态机动作产生（既有事件
如 `DICE.PUBLISHED`/`INTERACTION.OPEN` 全部源自 machine 内部），
本节点（`packages/ai-host`，runtime-kernel **之外**的新包）若要写入，
必须在 runtime-kernel 上新增一个"外部事件注入"访问器——这是对
DEV-009 冻结的 `runtime-kernel` 公开面的**结构性新增**，超出本节点
范围，且 DEV-050A 的 Forbidden Scope 明文禁止（"把 Egress Gate 接入
runtime-kernel 事件日志…留给未来编排节点"）。

未来编排节点把 Gate 接进真实 Host 管线时，若需日志留痕，可在该处
统一注入事件；本节点只保证 `attempt()` 的返回值是诚实、完整的判定
记录，不越界写日志。此取舍同时满足 A18（未接入 runtime-kernel 事件
日志/DEV-046/DEV-057）。

## D3 — C4/C5 缺省值选择理由（20 行 / 200 字符 / 5 条每 60 秒）

Dev Spec 与 Task Package **都没有给出这三组参数的精确数值**——架构
文档只规定了"最近 N 条已放行文本去重（C4）""长度上限 + 滑动窗口
频率上限（C5）"的**机制**，未冻结默认值。因此本节点选用一组保守的
工程缺省值，全部作为可选配置项开放覆写：

| 参数 | 缺省 | 理由 |
|---|---|---|
| `recentLinesLimit` | 20 | C4 环形缓冲容量。对去重而言 20 条足够覆盖"同一句台词/梗被连续刷屏"的典型场景，同时内存占用可忽略（纯字符串数组，规范化后每条几十字节）。过小（如 3–5）会让合法但偶发重复的文本（如"再来一次！"）被误伤；过大（如 200+）在长会话里会误伤更早出现过的合法复用文本 |
| `maxLineLength` | 200 | C5 长度上限。单条 Host 输出超过 200 字符在绝大多数平台（Twitch 等）本来就该被截断/拒绝，200 是"远高于正常台词、远低于平台硬限"的安全带。Dev Spec 未定义更长文本的合法场景，不调大 |
| `rateLimit` | `{maxLines: 5, windowMs: 60000}` | C5 滑动窗口。5 条/分钟是对"AI Host 正常叙事语速"的宽松上界（正常叙事远低于此），同时足以压制"短时间连发刷屏"的异常行为。窗口 60 秒与直觉的时间尺度一致，便于调用方理解与调参 |

三组值都是**纯工程默认**而非规范冻结：任何接入方都可通过
`EgressGateConfig` 按平台/场景覆写（C3 的 `platformDenylist` 同理，
作为构造参数注入，本节点不发明配置文件加载机制）。T002 测试 #9 与
A16 锁定的是"缺省值存在且生效"（200 字符边界 ALLOW/DROP），不是把
数值本身当成不可变契约。

## D4 — 为何只有真正 ALLOW 的尝试计入 C4/C5 历史状态

C4（重复环形缓冲）与 C5（频率滑动窗口）的目的都是**限制已放行的
出站流量**——它们统计的应当是"Host 实际说了什么、说了多少"，而不是
"Gate 被调用了多少次"。若把 DROP 的尝试也算进去，攻击者（或失控
的 Host 循环）可以**用大量注定被拒的消息把频率窗口占满**——比如
`permission:'MUTED'` 恒定 DROP（C1 最先命中，连 C2–C5 都不看），
或重复粘贴同一句禁词文本（C2/C4 必拒）——从而把后续**合法**消息
误伤挤出，造成"合法消息被饿死"的拒绝服务。

Task Package 第 2.1 节与 Constraint 4 明文规定：**只有真正 ALLOW 的
尝试才计入 C4/C5 的历史状态**。实现上即"全部通过 → ALLOW，并把这次
的规范化文本/时间戳计入环形缓冲与窗口数组"（DROP 路径在命中处立即
`return`，根本不走到记录代码）。T002 测试 #7 专门构造"先多次 MUTED
必拒 → 再发合法文本仍 ALLOW"的场景，锁定被拒尝试不消耗频率预算；
A13 对应此条验收。若未来某接入方想让"被拒原因"也参与统计（比如
针对恶意刷屏加重惩罚），那属于新的策略语义，应作为 Gate 的显式配置
另行设计，不在本节点静默引入。

## D5 — FIX-01：C3 平台 denylist 对 g/y 标志正则不具备确定性（F-01 BLOCKER）

**审计发现（AUDIT_VERDICT 0215，F-01 BLOCKER）**：C3 检查逐条执行
`pattern.test(input.text)`，而 `RegExp.prototype.test()` 对带 `g`
（global）或 `y`（sticky）标志的正则实例有**推进 `lastIndex` 的
副作用**——第一次 `.test()` 命中后，`lastIndex` 被前移到匹配串末尾，
同一实例对下一次输入的 `.test()` 会**从该位置继续搜索**而不是从头
开始。后果：调用方传入一个带 `g` 标志的正则对象，同一实例跨多次
`attempt()` 调用复用时，对同一段违规文本可能出现"第一次命中 DROP、
`lastIndex` 前移后第二次反而未命中被放行"的不确定结果——这是安全
网关的**确定性被破坏**，构成真实可被利用的 DROP 规则绕过路径，而非
风格/健壮性问题。审计方确认实现其余部分正确，缺陷仅在 C3 的
`.test()` 调用未重置状态。

**修复**：在每次 `.test()` 调用前**无条件**执行
`pattern.lastIndex = 0;`。对带 `g`/`y` 标志的正则，这保证每次匹配
都从文本开头重新开始，跨调用结果确定；对**不带** `g`/`y` 标志的
正则（`lastIndex` 本就恒为 0 且 `.test()` 不推进它），给该属性赋值
`0` 是**无副作用的 no-op**——因此不需要按标志位分支，统一重置最
简单也最安全。修复后每次 `attempt()` 对同一违规文本的结果只取决于
文本本身，与调用历史无关。

**回归测试**（FIX-2）：新增用例用**同一个** `/badword/g` 正则实例
（共享 `lastIndex` 状态）连续对两段不同的含违规词文本调用
`attempt()`，断言两次都 DROP `PLATFORM_DENYLIST`——修复前第二次会
因第一次 `.test()` 推进的 `lastIndex` 而漏判放行，该测试在缺陷态下
真实失败、修复态下真实通过。测试同时用不同文本规避 C4 重复去重，
使 C3 成为唯一变量。

## D6 — FIX-01：补齐 A13/A16 直接测试覆盖（F-02/F-03 MAJOR）

**审计发现（AUDIT_VERDICT 0215，F-02/F-03 MAJOR）**：初版测试对两条
验收只有**间接/不完整**覆盖：
- A13（"DROP 的尝试不计入 C4/C5 历史"）只验证了 C5 频率预算未被
  消耗（MUTED 必拒不占额度），**从未验证**被 DROP 的文本没有进入
  C4 重复缓冲——即"同一段先前被 MUTED 丢弃的文本，改用 ALLOWED
  权限再次尝试应正常放行、而非被误判 DUPLICATE"这一半语义没有
  可执行断言。
- A16（缺省值 20/200/5-per-60000ms）只在注释里提及，未直接验证
  默认 C4 历史容量（20 条）与默认 C5 频率上限（5 条/60 秒）本身。

**修复（只新增测试，零改动既有断言）**：
- A13 补测：MUTED 丢弃 `'Hello World'` → 同一文本 ALLOWED 再试 →
  断言 `ALLOW`（若 DROP 进了 C4 缓冲，此处会误判 DUPLICATE）。
- A16 补测（分两段）：
  - C4 默认容量段：`recentLinesLimit` 保持默认 20，连续放行 20 条
    不同文本 → 重复第 1 条仍 DROP DUPLICATE（未出窗）→ 放行第 21
    条不同文本（挤出第 1 条）→ 再重复第 1 条 ALLOW（已被逐出默认
    20 槽窗口）。此段 gate 的 `rateLimit` 放宽为 100/60000ms——
    若也用默认 5/60s，第 6 条连续放行就会被 RATE_LIMIT 拦下，环形
    缓冲永远填不满 20 槽，C4 容量语义无法被单独验证（C5 默认值由
    下一段独立验证）。
  - C5 默认频率段：独立 gate + 注入 clock，`rateLimit` 全默认，窗口
    内放行 5 条 → 第 6 条 DROP RATE_LIMIT → 快进超 60000ms → 恢复
    ALLOW。
