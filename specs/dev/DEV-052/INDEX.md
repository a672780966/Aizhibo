# DEV-052 INDEX

Status: IN_PROGRESS

## Current Node

DEV-052 — Host Persona

## Objective

新增 `packages/ai-host/src/hostPersona.ts`：`HostPersona` 静态数据
结构（`name` + `voiceDescription`）+ `getHostPersona()` 访问器。
Dev Spec 未定义具体人设文案，`voiceDescription` 默认值直接复述第
36 节职责列表，不发明性格形容词。不接入 Host Scheduler/LLM
Provider，不做可配置多人设系统。

## Allowed Scope

```
packages/ai-host/src/hostPersona.ts        （新增）
packages/ai-host/src/hostPersona.test.ts   （新增）
packages/ai-host/src/index.ts              （追加导出）
specs/dev/DEV-052/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/ai-host/src/egressGate.ts（Read-only，不 import）
packages/ai-host/src/commentPipeline.ts（Read-only，不 import）
其余同既有节点惯例
```

## Forbidden Scope

```
修改 packages/platform-core/**、packages/platform-twitch/**、packages/runtime-kernel/**、packages/ai-host/src/egressGate.ts、packages/ai-host/src/commentPipeline.ts
发明具体性格形容词/语气风格描述
实现多套人设/可配置切换/持久化存储
接入 Host Scheduler/Host LLM Provider/prompt 拼装
新增第三方 npm 依赖
创建除 ai-host 内文件外的任何新包
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 hostPersona.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
