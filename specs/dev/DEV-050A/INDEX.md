# DEV-050A INDEX

Status: IN_PROGRESS

## Current Node

DEV-050A — Host Egress Gate

## Objective

新建 `packages/ai-host` 首个文件 `egressGate.ts`：五道确定性检查
（C1 权限档位由调用方传入/C2 Hidden 词表消费 DEV-002A 的
`ForbiddenLexicon`/C3 平台 denylist 注入/C4 重复去重/C5 长度与频率）
短路判定 `ALLOW|DROP`。不改写不重试；不计算权限档位本身；不接入
`runtime-kernel` 事件日志；不加载真实平台配置文件；不接入
`DEV-046`/`DEV-057`（未来集成节点职责）。

## Allowed Scope

```
packages/ai-host/package.json                （新增）
packages/ai-host/tsconfig.json                （新增）
packages/ai-host/src/index.ts                 （新增）
packages/ai-host/src/egressGate.ts            （新增）
packages/ai-host/src/egressGate.test.ts       （新增）
tsconfig.json（根，references 追加 ai-host）
pnpm-workspace.yaml（仅在必要时改动）
specs/dev/DEV-050A/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/chapter-compiler/src/pass6ForbiddenLexicon.ts（DEV-002A 冻结）
packages/chapter-compiler/src/index.ts（Read-only）
packages/platform-core/package.json/tsconfig.json（Read-only，新包结构参照）
其余同既有节点惯例
```

## Forbidden Scope

```
修改 packages/chapter-compiler/**、packages/runtime-kernel/**
把 Egress Gate 接入 runtime-kernel 事件日志
计算/推断当前 Host Permission 档位
实现文本改写/脱敏/重试
加载真实平台配置文件
接入 DEV-046 Send Chat / DEV-057 Host TTS
新增除 ai-host 外的任何新包
新增第三方 npm 依赖
```

## Task Order

- [ ] T001 新包骨架 + 节点文档
- [ ] T002 egressGate.ts 实现 + 测试
- [ ] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
