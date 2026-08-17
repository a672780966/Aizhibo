---
msg_id: "0036"
type: ACCEPTANCE_AMENDMENT
from: COMMANDER
to: OPENCODE
node: DEV-003
in_reply_to: "0035"
created_at: 2026-08-18
requires_response: true
---

# ACCEPTANCE_AMENDMENT — DEV-003

## 触发原因

Task Package 第 7 节对"测试怎么写"留白过多，且 T002 的 Acceptance 有一处编号错误，可能导致不必要的实现负担。本澄清**不提高、不降低任何验收标准**，只是把"怎么最省力地满足现有标准"说清楚。在 `NODE_REPORT` 之前发出，符合协议 §5.3。

## 修订 1 — 更正 T002 Acceptance 的编号错误

Task Package 第 7 节 T002 Acceptance 原文：

> 对 **T009** 的 `graph-clean` fixture，构建出的模型节点数与 `story.graph.json` 声明数一致

`T009` 是笔误，应为 **T008**（fixture 由 T008 建立，T009 是全量验证收尾）。已更正为：

> 对 **T008** 的 `graph-clean` fixture，构建出的模型节点数与 `story.graph.json` 声明数一致

## 修订 2 — T002–T006 的单元测试不需要完整 fixture 目录

**这是本次澄清最关键的一条。**

`buildStoryGraphModel`、`computeReachability`、`detectTrapCycles`、`buildReachableStateModel`、`checkEndingSatisfiability`、`checkRecoverySatisfiability` 这六个函数的入参分别是 `SchemaValidationResult`、`StoryGraphModel`、`ReachableStateModel` 等**已经解析好的内存对象**，不是文件路径、不是原始 JSON。

这意味着 T002–T006 各自的单元测试**完全不需要**：
- 走 `loadChapterPack()` 读磁盘
- 构造一份能通过 chapter-schema 全部 Zod 校验的完整 19 分类 Chapter Pack
- 任何生成脚本

只需要在测试文件里**手写一个最小的 TypeScript 对象字面量**，只填充该函数实际读取的字段，其余字段留空数组/空 Map 即可。例如 T003 的 `computeReachability` 测试可以直接是：

```typescript
const graph: StoryGraphModel = {
  nodes: new Map([
    ['scene-a', 'SCENE'],
    ['scene-b', 'SCENE'],
    ['ending-x', 'ENDING'],
  ]),
  edges: new Map([
    ['scene-a', new Set(['scene-b'])],
    ['scene-b', new Set(['ending-x'])],
  ]),
};
const result = computeReachability(graph, 'scene-a');
```

不需要任何 `.json` 文件、不需要过 Zod、不需要任何 fixture 目录。T004/T005/T006 同理——各自只手写覆盖自己判定逻辑所需的最小对象。

**真正需要落盘的 fixture 目录，只有 T008 一处**——因为 T008 测的是 `compile()` 端到端串联全部 PASS 之后的结果，那必须走真实的 loader + 完整 Chapter Pack。T007 的回归测试复用 T008 建好的 fixture，同样不需要额外再造。

## 修订 3 — T008 的 fixture 建法：复制 `valid-minimal`，改一处，不写生成脚本

`packages/chapter-compiler/test-fixtures/valid-minimal/` 已经是一份跑通 PASS1+PASS2 的合法 Chapter Pack（DEV-002 交付，冻结只读，但**可以复制**）。新的 8 组 fixture 一律：

1. 完整复制 `valid-minimal/` 到新目录；
2. 只做**一处**针对性编辑制造目标缺陷；
3. **不写任何 `.mjs`/`.js` 生成脚本**——DEV-002 的全部 fixture 都是手写/直接复制的 JSON 文件，这个先例继续沿用。用脚本去"造出"一份同时满足十几种 Zod 规则又要精确制造一个图缺陷的内容，比直接复制现成能跑通的内容再改一行难得多，没有必要。

逐条最小编辑指引（供参考，不是唯一做法，只是最省力的路径）：

| Fixture | 相对 `valid-minimal` 的最小改动 |
|---|---|
| `graph-clean` | **可能不需要新建**——先检查 `valid-minimal` 自身的图结构（`scene-start → boss-tyrant → {onDefeat/onFailure} → ending-end`）是否已经满足"无死路、无不可达、无陷阱环、Ending/Boss 均可达"。若满足，直接在测试里复用 `valid-minimal`，不必复制一份同名的 `graph-clean`。 |
| `graph-dead-end` | 复制后，删掉某个非 Ending 场景的 `next`/`guards`/`interactionId`，让它没有任何出边 |
| `graph-unreachable-scene` | 复制后，在 `story.graph.json` 注册表和 `scenes/` 下**新增**一个场景，但不让任何其它节点指向它 |
| `graph-unreachable-ending` | 同上，新增一个 Ending 节点但不可达 |
| `graph-unreachable-boss` | 同上，新增一个 Boss 节点但不可达 |
| `graph-trap-cycle` | 复制后，新增两个场景互相指向对方、不指向任何其它节点，且从入口可达到这个循环 |
| `state-unsatisfiable-ending` | 复制后，新增一个 Ending，其 `when` 引用一个从未被任何可达 effect/`initial.state.json` 设置过的 flag |
| `state-unsatisfiable-recovery` | 复制后，把 `world.rules.json` 的 `downedPolicy` 改成 `REQUIRE_RECOVERY`，且不提供任何覆盖 `DOWNED` 的可达 `RecoveryRule` |

## 未变更事项

- A01–A24 判定标准完全不变，本澄清不新增、不删除任何 Acceptance 项
- T001–T009 的任务内容、Allowed Files 完全不变
- 第 9 节 Constraints、第 10 节 Non-goals 完全不变
- 若已经在尝试其它实现路径（例如已经写了一部分生成脚本）且认为该路径同样可行，可以继续——本澄清只是提供更省力的路径，不强制推翻已经在做的、没有违反 Constraints 的工作
