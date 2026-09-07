# DEV-062 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-062 — Error Registry

## Objective

新建 `packages/error-registry`：`ErrorLevel`（`L1`–`L4`，第 56 节
封闭四值集合）+ `record`/`list` 记录原语。第 62 节本身零正文，
DAG.md 备注为空，唯一权威范围来自第 56 节"故障等级"——本节点只
记录、不处理（忽略/降级/自动恢复/Failover 是未来节点的职责）。
`category` 为自由文本，不做封闭枚举/自动推断。

## Allowed Scope

```
packages/error-registry/package.json            （新增）
packages/error-registry/tsconfig.json            （新增）
packages/error-registry/src/index.ts             （新增）
packages/error-registry/src/errorRegistry.ts       （新增）
packages/error-registry/src/errorRegistry.test.ts  （新增）
tsconfig.json                                       （根，追加一条 references 条目）
specs/dev/DEV-062/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
（本节点不需要读取任何既有包源码作为实现依据）
```

## Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
接入 packages/persistence
新建任何 HTTP 端点或接入 packages/operator-api
实现第 56 节任何一级的处理方针
把 category 做成封闭枚举，或实现 category→level 自动推断逻辑
新增第三方 npm 依赖
```

## Task Order

- [x] T001 节点文档
- [x] T002 error-registry 包 + 测试 + 根 tsconfig 引用 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T002（已完成，待 AUDITOR 验收）

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**；工作区不得残留任何
施工用临时文件。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
