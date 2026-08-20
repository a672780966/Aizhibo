# DEV-033 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-033.md` 抄录（Task Package 第 3/6/9/10
节），权威版本为 Task Package 原文。

## 3. Scope

### Writable Scope

```
packages/narrative-composer/package.json
packages/narrative-composer/tsconfig.json
packages/narrative-composer/src/index.ts
packages/narrative-composer/src/composeSingle.ts
packages/narrative-composer/src/composeSingle.test.ts
packages/narrative-composer/src/focus.ts
packages/narrative-composer/src/focus.test.ts
packages/narrative-composer/src/composeResultSet.ts
packages/narrative-composer/src/composeResultSet.test.ts

specs/dev/DEV-033/INDEX.md
specs/dev/DEV-033/REQUIREMENTS.md
specs/dev/DEV-033/ACCEPTANCE.md
specs/dev/DEV-033/REPORT.md
specs/dev/DEV-033/DECISIONS.md（**本节点解释性设计决策最多的一次，几乎肯定要写，且要写得比以往详细**）
specs/dev/DEV-033/BLOCKERS.md（仅在需要时创建）

根 tsconfig.json（追加一行 references 指向 packages/narrative-composer）
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/chapter-schema/**（含 narrative.ts、scene.ts、stateRules.ts、worldState.ts）
packages/rule-engine/**（消费其 evaluateCondition，不修改）
packages/chapter-compiler/**、packages/dice-engine/**、packages/runtime-kernel/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

### Forbidden Scope

```
packages/* 除 narrative-composer 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码、任何文件系统 IO
任何 LLM SDK、任何 NLP 库、任何"生成式"文本处理——本节点是纯拼接，不是生成
基于 NarrativeBlock.tone 做筛选/匹配的逻辑（无 SceneNode.tone 可比对，已核实）
```

## 6. Outputs

1. `composeSingleNarrative(narrative: ResultNarrative, blocksById: Map<string, NarrativeBlock>, worldState: WorldState): string`
2. `interface FocusCategorization { primary: ResultNarrative; support: ResultNarrative[]; context: ResultNarrative[]; deferred: ResultNarrative[] }`、`categorizeFocus(narratives: ResultNarrative[]): FocusCategorization`
3. `interface ComposedResultSet { text: string; deferredNarrativeIds: string[] }`、`composeResultSetNarration(narratives: ResultNarrative[], blocksById: Map<string, NarrativeBlock>, worldState: WorldState): ComposedResultSet`
4. `specs/dev/DEV-033/DECISIONS.md`，详细记录第 9 节全部解释性决策

## 9. Constraints（本节点的解释性决策清单，全部需要记入 DECISIONS.md）

1. **零语言模型**：不引入任何 LLM SDK、Prompt、文本生成逻辑——纯拼接、纯查表。
2. **不做 tone 匹配**：`SceneNode` 没有 `tone` 字段，`NarrativeBlock.tone` 目前只是创作期提示，本节点不实现任何基于它的筛选。
3. **PRIMARY/SUPPORT/CONTEXT/DEFERRED 的判定规则严格按第 7 节 T004 的 2–6 条**，不自行发明替代算法（例如不要因为"觉得应该按 urgency 优先"就改变判定顺序）。
4. **SUPPORT/CONTEXT 只取 primary 槽位简短提及**，不做完整五槽位展开——避免旁白过长。
5. **文本连接策略统一用单空格**，不引入标点/分句逻辑——最简单、最不容易引入拼接错误的方式。
6. **`categorizeFocus` 对空数组输入是本节点唯一允许抛异常的地方**（调用契约违反，不是数据内容缺陷）；其余全部函数对"查不到/条件不满足"一律防御性跳过，不抛异常。
7. `CR-019` 不适用——纯函数库。
8. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

## 10. Non-goals / Out-of-scope

- 不实现任何 TTS/音频相关逻辑（第三施工组，M3）。
- 不实现"DEFERRED 的叙事以后怎么补上"——本节点只标出哪些被延后，不处理延后之后的调度。
- 不基于 `NarrativeBlock.tone` 做任何筛选/匹配（无对应场景数据可比对）。
- 不引入任何 LLM/NLP/文本生成能力。
- 不修改 `packages/chapter-schema`、`packages/rule-engine`。
- 不创建真实产品内容。