---
msg_id: "0261"
type: CHANGE_REQUEST
from: COMMANDER
to: USER
node: DEV-054
in_reply_to: "0260"
created_at: 2026-09-07
requires_response: true
status: APPROVED
---

# CHANGE_REQUEST — DEV-054 重开（USER 已批准）

## 变更对象

`packages/persistence` 的 `host_viewer_memory` 表 schema +
`hostViewerMemory.ts` 的 `HostViewerMemoryEntry` 类型/CRUD 函数 +
`packages/host-memory` 的 `HostMemory.rememberViewer`/
`recallViewer` 方法签名。`host_running_jokes`/
`hostRunningJokes.ts`/`purge`/`getHealth` 不受影响，维持现状。

## 理由

DEV-054 起草时检索"Viewer Memory"关键词，未搜到 Dev Spec 独立的
**第 42 节"Host Memory"**（章节标题与节点名不同字，属 Commander
起草时的检索遗漏）。第 42 节明确写"不要一开始做复杂向量
Memory……使用结构化数据库"，并给出具体字段列表：`viewerId` /
`nickname` / `interactionCount` / `lastSeen` / `knownRunningJokes` /
`hostAffinity` / `notableEvents`，且强调"长期只保存：明确结构化
事实"。这是一段无"例如"字样的规范性字段列表（不同于第 38 节
`PublicRuntimeState` 用"例如"明确留出裁量空间的写法），应视为
权威 schema，而不是本节点可以用单一自由文本 `note` 字段替代的
"未定义内容"。

`specs/dev/DAG.md` 第 56-60 行记录的 CR-017 执行澄清（DEV-010
起草时，2026-08-21）称"host_viewer_memory/host_running_jokes
目前没有任何已定义的 shape"——该判断本身也遗漏了第 42 节，是更早
一次的同类检索疏漏，本 CR 一并订正对这段历史记录的现实理解（不
改写 LEDGER 历史行本身，只在此说明）。

## 影响面

- DEV-054：`DONE`，接口冻结，本 CR 重新打开。
- 尚无任何下游节点消费 `host-memory`/`persistence` 的这部分接口
  （`ai-host` 现有四个模块——`egressGate`/`commentPipeline`/
  `hostPersona`/`hostMood`——均不 import `host-memory`）。DEV-055
  （Host Scheduler）的调度因子列表（第 41 节）也不包含 Viewer
  Memory。**当前改动的下游影响面为零**，是修正这个 schema 成本
  最低的时间点。
- 尚无任何真实部署的持久化 `.db` 文件（项目仍处于源码开发阶段，
  未上线直播），`CREATE TABLE IF NOT EXISTS` 的表结构变更不涉及
  任何数据迁移问题。

## 不变更的后果

若不在此刻修正，后续 DEV-055/056/057（Host Scheduler/LLM
Provider/TTS）等真正消费 Viewer Memory 的节点会在错误的 `note`
自由文本接口上继续搭建业务逻辑，届时再发现并修正的成本（涉及
更多下游代码回改）远高于现在。

## USER 批准

USER 已在 2026-09-07 通过交互式选择明确批准"现在就发 CR 修正
DEV-054"（AskUserQuestion 记录，非规范/产品设计的自行批准）。

## Next Steps

Commander 起草 DEV-054-CR-01 修正指令，dispatch 给 OPENCODE 执行，
六命令验证 + AUDITOR 重新审计，通过后 DEV-054 重新转 `DONE`。
