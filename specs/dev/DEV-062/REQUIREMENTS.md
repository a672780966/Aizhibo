# DEV-062 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-062.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- 新建 `packages/error-registry`：`ErrorLevel`（`'L1'|'L2'|'L3'|'L4'`，
  第 56 节封闭四值集合）、`ErrorRecordInput`（`level`+`category`+
  `message`）、`ErrorRecord`（继承 Input + `id`+`timestamp`）、
  `ErrorRegistry`（`record`/`list`）、`createErrorRegistry()`。
- `record()`：追加式写入，自动分配自增 `id`（`err-N`）与
  `timestamp`（`new Date().toISOString()`）。
- `list()`：返回全部记录的**副本数组**，按调用顺序排列。
- `category` 为自由文本，不做封闭枚举；不做 category→level 自动
  推断。
- **只记录，不处理**：第 56 节四级各自的处理方针（忽略/降级/自动
  恢复/Failover）一律不在本节点实现。
- 纯内存、零依赖：不 import 任何既有 workspace 包，不接入
  `persistence`，不新建 HTTP 端点。

## Scope（Task Package 第 3 节）

Writable：见 `INDEX.md` Allowed Scope 逐条。

Forbidden（摘录）：不改除本节点外任何既有文件；不接入
`persistence`/HTTP；不实现第 56 节处理逻辑；`category` 不做封闭
枚举/自动推断；不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `error-registry` 包 + 测试 + 根 `tsconfig.json`
引用 + 全量验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT
写入工作区但不提交，工作区不得残留任何施工用临时文件**）。
