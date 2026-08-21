# DEV-024 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-024 — Choice UI

## Objective

第一次对 INTERACTION region 的 `onOpen` 发窄范围 CR，追加已按 `visibleIf` 过滤好的
`choices` 与 `openDurationMs`；`apps/renderer` 展示"字母+文案"选项列表与本地倒计时。
Choice UI 是给观众"看"的展示（OBS Browser Source 采集进直播画面），不是可点击控件——
真实投票来自 Twitch 聊天（M4 未建）。

## Allowed Scope（runtime-kernel：CR + 新增 + 追加）

```
packages/runtime-kernel/src/machine.ts        （仅 Task Package 2.3 节描述的 onOpen 内新增，
                                                 其余全部 action 逐字节不变）
packages/runtime-kernel/src/choiceResolution.ts       （新增）
packages/runtime-kernel/src/choiceResolution.test.ts  （新增）
packages/runtime-kernel/src/index.ts          （仅追加导出）
```

## Allowed Scope（apps/renderer：新增 + 仅追加）

```
apps/renderer/src/render/pickInteractionOpen.ts
apps/renderer/src/render/pickInteractionOpen.test.ts
apps/renderer/src/App.tsx   （追加选项/倒计时渲染，不删除既有场景层/角色/对话框/调试列表/HELLO 逻辑）
```

## Allowed Scope（节点文档与通信）

```
specs/dev/DEV-024/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/runtime-kernel/src/ 下除 machine.ts（唯一授权改动）/choiceResolution.*（新增）/
  index.ts（仅追加）外的全部既有文件（含 machine.test.ts、interactionRegion.ts/.test.ts、
  visualResolution.*、characterResolution.*——本节点不改任何既有文件的既有内容）
packages/runtime-kernel/package.json、tsconfig.json
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
apps/renderer/src/ws/**、apps/renderer/src/server/**、apps/renderer/src/main.tsx、
  apps/renderer/src/render/composeLayers.*、composeCharacters.*、pickDialogueLines.*、
  lineIndex.*、apps/renderer/package.json、tsconfig.json、vite.config.ts、index.html
  ——DEV-020/021/022/023 冻结
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

## Forbidden Scope

```
packages/* 除 runtime-kernel（限定文件）外的任何目录
apps/* 除 renderer（限定文件）外的任何目录
apps/renderer 内 DEV-020/021/022/023 冻结的文件
对 machine.ts 中 onOpen 以外任何 action/guard 的修改（含 onSceneEnter 及其历次 CR 遗留代码）
任何可点击/可交互的选项按钮（第 2 节已说明：观众看的是直播画面，不能点击）
任何真实投票统计/实时票数展示（无批量/限流机制设计，明确延后，见 Non-goals）
任何根级配置文件的修改
新增任何 npm 依赖
```

## Task Order

- [x] T001 节点文档
- [x] T002 resolveVisibleChoices
- [x] T003 machine.ts CR（onOpen）
- [x] T004 index.ts 追加导出
- [x] T005 pickInteractionOpen + App.tsx 渲染
- [x] T006 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001–T006 全部完成。六条命令严格顺序全部退出码 0（93 files / 487 tests 零回归）；A09 端到端
验证 `INTERACTION_OPEN` 含正确 `choices`/`openDurationMs`；`DECISIONS.md` 已入库；REPORT.md
完成，Status = READY_FOR_REVIEW。已向 AUDITOR 发出 NODE_REPORT，等待独立审计。

## Exit Criteria

六条命令全部退出码 0；`machine.ts` 的 git diff 精确限定在 `onOpen` 一处；端到端验证
`INTERACTION_OPEN` 含正确 `choices`/`openDurationMs`；既有 `machine.test.ts` 零回归；
`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出
NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。