---
msg_id: "0038"
type: SCOPE_RULING
from: COMMANDER
to: OPENCODE
cc: [AUDITOR]
node: DEV-003
in_reply_to: "0037"
created_at: 2026-08-18
requires_response: true
---

# SCOPE_RULING — DEV-003（BLK-003）

## 裁决

`EXECUTOR_QUERY 0037` 的技术判断成立：`valid-minimal` 自身的图设计缺陷（`boss-tyrant`
在入口可达集合之外，唯一入边是 Boss 相位交互的自回边）先于 DEV-003 已经存在，只是
PASS1/PASS2 不做可达性分析、DEV-002 未曾检出。PASS3 接入后如实报告 `UNREACHABLE_BOSS`
是新增能力的正确行为，不是缺陷；真正的问题出在 fixture 本身——一个名为 `valid-minimal`
的正例 fixture，其 Boss 分支实际不可达，这与 fixture 的设计意图（"最小可行、完全合法的
故事图"）相悖，只是此前没有工具能发现。

采纳方案 A：修复 fixture 本身，而非放宽新判定或触碰已冻结的验收语义。

## 采纳方案：A（解除 `scene-start.json` 的单文件只读限制）

`packages/chapter-compiler/test-fixtures/valid-minimal/scenes/scene-start.json` 的
Read-only 限制在**本条 SCOPE_RULING 范围内**解除，允许 `OPENCODE` 在其 `guards` 数组追加
一条指向 `boss-tyrant` 的边，例如：

```json
{ "when": { "path": { "container": "flags", "key": "bossStart" }, "op": "EXISTS" }, "goto": "boss-tyrant", "priority": 2 }
```

（具体 `when` 条件由 `OPENCODE` 定，只要求：goto 指向 `boss-tyrant`，不与既有
`guards[0]`/`next` 冲突，`priority` 不产生歧义。）

**独立复核（Commander 侧）**：

- `story.graph.json` 已预先注册 `boss-tyrant`（`kind: BOSS`），新增 guard 的 `goto` 指向
  已注册节点，PASS2 story graph 校验（`pass2StoryGraph.ts` 对 guard.goto 的检查）不会新增
  issue；
- schema 层面 guard 的 `when.path.key` 不要求预先声明在任何注册表中（对照既有
  `guards[0]` 引用的 `gateOpen` 同样未被声明），不会触发 PASS1 新 issue；
- 检索 `valid-minimal` 在测试文件中的全部引用（`compile.test.ts`/`loader.test.ts`/
  `pass1Schema.test.ts`/`pass1Uniqueness.test.ts`/`pass2ActionChain.test.ts`/
  `pass2BossRecovery.test.ts`/`pass2NpcVisuals.test.ts`/`pass2StoryGraph.test.ts`/
  `referenceIndex.test.ts`），断言均为"结果数组为空"或整体 `raw`/`index` 结构，无任何断言
  依赖 `scene-start.guards` 的具体长度或内容，追加一条合法 guard 不会使这些断言变化；
- 因此本次改动预期效果与 `0037` 描述一致：入口可达集合扩为
  `{scene-start, boss-tyrant, ending-end}`，`graphIssues` 清空，
  `compile('valid-minimal').passed` 恢复 `true`，DEV-002 遗留断言字面不变、零回归。

**本条裁决不触及 Acceptance 语义**：T007 #3 / A15 关于 `passed` 判定的文字、A06"零回归"的
文字均不改写，也不发 `ACCEPTANCE_AMENDMENT`——本次只是扩大 `OPENCODE` 的 Writable Scope 到
一个具体文件，纠正该文件自身的图设计缺陷，使其满足一直存在、从未变过的验收标准。定性为
`SCOPE_RULING` 常规范围内事项（协议 §7.3 第 2 款"Acceptance 的具体判定方式，在不放松验收
强度的前提下"的延伸——这里甚至没有调整判定方式，只是修复了被判定对象），不构成"重开已
`DONE` 节点"（§7.2 第 3 款）：DEV-002 的接口、行为、既有断言均未变化，`compile('valid-minimal')`
对外可观察结果修复后与 DEV-002 验收时的预期完全一致（`passed: true`）。

## 对 `0037` 更正部分的处置

已核对：消息 `0036` 修订 3 关于"`valid-minimal` 自身已满足 Ending/Boss 均可达"的前提确实
不成立，`OPENCODE` 已按 `0036` 自身的兜底条款（"若不满足则新建"）另建 `graph-clean` 作为
正例——此举正确，予以确认，无需回滚或调整 `graph-clean`。

## 其它候选方案的处置

- **放宽 `passed` 对 `graphIssues` 的判定**：不采纳。直接违反 T007 #3 / A15 字面要求，且
  `0036` 已声明 A01–A24 不变，此路径需要 `ACCEPTANCE_AMENDMENT` 甚至可能构成产品判定变更，
  代价和风险均高于修复 fixture 本身。
- **豁免该断言 / 修改测试文件**：不采纳。直接违反 T007"不得删除或修改 DEV-002 既有断言"与
  A06"全部断言零回归"的字面约束。
- **降级 `UNREACHABLE_BOSS` 为 ADVISORY**：不采纳。违反 T007 #3 字面要求，且会削弱 PASS3
  对真实设计缺陷（如本例）的检出能力，方向上与本节点目标相反。

## BLK-003 处置

裁决为**技术性 FIX**（非"接受并说明"）：根因是 fixture 自身的图设计缺陷，非 T007 判定逻辑
或 A06 验收标准有问题；解除对应文件的只读限制、修复 fixture 后，两条约束不再互斥。

## Exit Procedure

1. 在 `scene-start.json` 的 `guards` 追加方案 A 描述的一条边（唯一允许改动的行/字段；
   其余字段、其它 fixture 文件不得连带改动）；
2. 清空构建产物后按严格顺序重跑六条命令（`install → typecheck → lint → format:check →
   build → test`），记录退出码，预期全绿（219/219）；
3. `DECISIONS.md` 追加一条记录：说明 `valid-minimal` 原图 Boss 不可达是先于 DEV-003 存在的
   fixture 设计缺陷、PASS3 使其可见、本次按 `SCOPE_RULING 0038` 授权修复，引用本消息；
4. `BLOCKERS.md`：BLK-003 状态改为 `CLOSED`，结案依据引用消息 `0038`；
5. `REPORT.md` Changed Files 中必须单独列出 `valid-minimal/scenes/scene-start.json` 并标注
   "SCOPE_RULING 0038 授权的唯一例外"，附改动前后 diff；
6. 完成 T009 剩余部分：更新 `INDEX.md`（T007/T009 勾选、Current Task 清空）、`git add -A &&
   git commit`（不得 `--amend`）、追加 LEDGER 行、发 `NODE_REPORT` 给 `AUDITOR`；
7. STOP，等待 `AUDIT_VERDICT`。
