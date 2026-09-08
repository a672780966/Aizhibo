# DEV-072 DECISIONS

本文件记录 DEV-072（AI Compiler Repair Loop，M7 第三个节点）施工中的
关键决策。权威需求来源为 `specs/tasks/TASK-PACKAGE-DEV-072.md`。

## D1 — 不建真实 AI Repair 网络客户端：Dev Spec 未给出任何可对接协议

Dev Spec 对 DEV-072 只给出标题「AI Compiler Repair Loop」和一张
ASCII 流程图（第 2770-2781 行），未给出任何具体的 AI Repair 网络
协议、鉴权方式、请求/响应格式。这与 DEV-071（AI Chapter Generator）
面对 LLM 协议时的处境完全相同，因此采用与
`packages/ai-host/src/hostLLMProvider.ts`（DEV-05X 系列）和
`packages/ai-chapter-generator/src/aiChapterGeneratorPort.ts`（DEV-071）
完全相同的方案：只建 `AiRepairPort` 接口 + `noopAiRepairPort` 诚实
占位实现（`repairDraft` 恒定 `ok:false` / `getHealth` 恒定
`status:'DOWN'`，均与输入无关），不建真实网络客户端、不发明协议。
这与 DEV-040/041/064（Twitch/OBS，面对真实公开协议建真实客户端）的
先例并不矛盾——**协议是否存在才是判据**；本节点面对的是不存在任何
可查证协议文档的抽象 AI Repair 调用。`Health` 类型按
hostLLMProvider.ts 自身镜像 shared 契约的同一纪律做本地镜像（逐字段
一致，不 import），保持零跨包耦合。

## D2 — 不实现 Schema Normalizer：Dev Spec 未为其分配任何 DEV 节点编号

Dev Spec 第 25-26 节把链路描述为 AI Draft → Schema Normalizer →
Compiler → Compiler Error → AI Repair → Compiler → PASS，但 **Schema
Normalizer 在 Dev Spec 里没有对应的 DEV 节点编号**——没有任何节点被
授权负责把 AI 生成的原始草稿文本转成 Compiler 能加载的 Chapter Pack
文件目录，也没有任何节点负责把「修复后的草稿」重新写回磁盘文件。
发明 Schema Normalizer 的实现即超出本节点已授权范围，与
DEV-065/066/067（无真实生产入口进程）被裁定 `BLOCKED` 是同一类现实
约束。因此本节点不裁定 `BLOCKED`——它仍有大量真实、确定性、可施工
的内容：真实调用既有 DEV-002 Compiler、把错误结构化输出转成可读的
修复请求文本、一个诚实的三态闭集决策函数——只裁定「不发明 Schema
Normalizer、不发明草稿落盘机制」。

## D3 — `REPAIR_NOT_APPLIED` 是诚实的终止状态而不是继续循环

当 repair provider 返回 `{ ok: true, repairedDraft }` 时，本节点没有
任何机制能把这段草稿文本变回可编译的 Chapter Pack 文件（Schema
Normalizer 未分配节点编号，见 D2），也没有草稿落盘机制——「继续
compile」没有对象可 compile。若假装继续循环（把 repairedDraft 直接写
盘再 compile），等于用一段未经定义的文本格式臆造一个编译入口，是把
猜测当事实。因此 `REPAIR_NOT_APPLIED` 带着明确的 reason 诚实终止，
把「如何应用修复」留给未来被授权的节点；这既符合 Dev Spec 未定义的
边界，也保证了流程图各框之间唯一真实存在的那一段（Compile → Errors
→ AI Repair）被真实执行并如实报告结果。

## D4 — 只跑一次 compile→repair，不做重试上限

Dev Spec 的 ASCII 流程图只画了一次 Compile → Errors → AI Repair →
Compile，未定义任何重试上限或次数。发明具体重试次数（如「最多重试
3 次」）即凭空定义协议行为；且在本节点没有落盘机制的约束下（D3），
重试循环本就没有可迭代的对象——第二次 compile 与第一次输入相同、
输出必然相同。因此 `runCompileRepairLoop` 只做一次 compile 尝试 +
（若失败）一次 repair 尝试，闭集三态穷尽所有可观察结果，无 default
兜底；未来若 Dev Spec 定义真实 AI Repair provider 协议并授权落盘
机制，重试策略应在彼时重新设计。

## D5 — `buildRepairRequest` 只忠实转述问题，不生成修复建议

修复请求文本是发给未来真实 AI Repair provider 的输入；「猜测应该如何
修复」是 provider 自己的职责。若本节点在转述之外附带自撰的修复建议，
等于把未经验证的猜测当作事实混入 provider 的决策依据，且这些建议
无法被任何确定性测试验证。因此 `buildRepairRequest` 只把 Compiler
已经报告的问题**逐字、完整**转述为可读文本：带 `message` 字段的
issue（load/reference/graph/state/hiddenInfo/ruleCoverage）输出
message 原文，`uniquenessIssues` 没有 message 字段则用
category/id/conflictingFiles 拼一条完整可读描述，schemaResult 内每个
分节的 failed 校验错误（文件路径 + zod issue message）同样覆盖——
「每一处真实存在的问题都完整出现在输出里」这一性质可被测试机械
验证（A11）。`passed: true` 时抛出 `Error` 而非返回空文本：编译已
通过、没有可转述的问题时调用本函数是调用方逻辑错误，明确失败优于
静默产出空请求。
