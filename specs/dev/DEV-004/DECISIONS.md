# DEV-004 DECISIONS

## D1 — 包级 tsconfig references 的取舍（与 DEV-002 FIX 的调和）

DEV-002 FIX（消息 `0029`）曾移除 chapter-compiler 的**包级** tsconfig references，当时根因是
`tsc -b --noEmit` 不发射依赖产物（BLK-002，后由 `SCOPE_RULING 0031` 把根 typecheck 脚本改为
`tsc -b && tsc -b --noEmit` 解决，与 references 存在与否无关）。本任务包 T002 #2 却**字面**要求
rule-engine 包级 tsconfig `references: [{ path: '../chapter-schema' }]`。

决定：**按任务包字面执行**（保留包级 references），理由：
- `chapter-schema` 是叶子依赖包（仅依赖 zod 这个 node_module，自身无任何项目 references），不
  存在"依赖未被构建"的级联问题；
- 根 `pnpm typecheck` 脚本（`tsc -b && tsc -b --noEmit`）已由 `0031` 修复为先构建后检查，依赖
  产物必然先就绪；
- 六条命令全绿实测可证（版本间退出码均 0），未复现 DEV-002 当初的失败模式。

若 Commander 认为应统一为"全部包级 references 移除、仅根 solution 引用"的既有约定，属判定
方式调整，需另行指示（本节点 REPORT Scope Deviations 已如实记录）。

## D2 — `discovered`/`activeThreats` 的寻址语义

ADDENDUM-001 §A6 与任务包 T003 对这两个数组容器只定义"成员判定是否存在"（`EXISTS`）。本包
`resolveStatePath` 对它们返回**成员布尔**（`array.includes(key)`），因此：
- `evaluateCondition` 对这两个容器上除 `EXISTS` 外的比较符统一返回 `false`（T004 #6）；
- `applyEffect` 对它们的写入（`PUSH`/`REMOVE`）走专门处理，不等同于 `writeStatePath` 的"赋值"。
不实现"按数组下标取值/写入"语义——ADDENDUM 与任务包均无此需求（记录于 REPORT Future
Considerations，若未来需要属新增语义，需 Commander 裁决）。

## D3 — INC/DEC 的数值语义

`INC`/`DEC` 增量为 `effect.value`（类型为 number 时），否则默认 `1`；目标当前值非数字时视为从
`0` 累加（T005 #3，防御性默认）。这是对 schema 中 `StateEffect.value` 为可选的直接落地：
带显式 value 的增量生效，缺省即 ±1。
