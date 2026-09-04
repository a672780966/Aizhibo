# DEV-050A REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-050A.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `createEgressGate(config).attempt(input)`：C1→C5 顺序短路判定，
  第一个命中的规则即为 DROP 结果；全部通过 → ALLOW。
- C1 权限：`permission==='MUTED'` 直接 DROP；档位本身由调用方传入，
  不在本节点计算。
- C2 Hidden 词表：消费 `ForbiddenLexicon.always`/`bySceneId[sceneId]`，
  规范化子串匹配。
- C3 平台合规：`platformDenylist` 正则数组，构造参数注入。
- C4 重复：最近 N 条已放行文本环形缓冲去重。
- C5 长度与频率：长度上限 + 滑动窗口频率上限（可注入 clock）。
- 只有真正 ALLOW 的尝试计入 C4/C5 历史状态。

## Scope（Task Package 第 3 节）

Writable：`packages/ai-host` 全新包（`package.json`/`tsconfig.json`/
`src/{index,egressGate,egressGate.test}.ts`）、根 `tsconfig.json`
（追加 references）、`specs/dev/DEV-050A/*.md`、
`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-*.md`。

Forbidden（摘录）：不改 `chapter-compiler`/`runtime-kernel`；不接入
事件日志；不计算权限档位；不加载真实平台配置文件；不接入
`DEV-046`/`DEV-057`；不新增第三方依赖/额外新包。

## Task Order

T001 新包骨架 + 节点文档 → T002 `egressGate.ts` 实现 + 测试 → T003
`index.ts` 导出 + 全量验证 + REPORT + commit（**恰一条提交，
LEDGER/NODE_REPORT 写入工作区但不提交**）。
