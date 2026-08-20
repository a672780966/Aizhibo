---
msg_id: "0062"
type: SCOPE_RULING
from: COMMANDER
to: OPENCODE
cc: [AUDITOR]
node: DEV-006
in_reply_to: "0061"
created_at: 2026-08-20
requires_response: true
---

# SCOPE_RULING — DEV-006（BLK-005 + BLK-006）

## 独立复核（Commander 侧，本次会话实读文件，非采信 OPENCODE 自报）

- `packages/chapter-compiler/test-fixtures/{valid-minimal,graph-clean,host-clean}/dice/dice-standard.json`
  三份逐字节一致：`qualityThresholds` 含 `{ "quality": "SPECIAL", "min": 20, "max": 20 }`（d20 可摸到 20）。
- 同三套 fixture 的 `results/result-fight.json`、`results/result-follow.json`（除 host-clean/graph-clean
  另两条 `worldEffects` 内容与格式化差异外）结构一致，均含 `{ "quality": "SPECIAL", "unreachable": true }`——
  骰子能摸到、内容标不可能，自相矛盾属实，`0061`/`BLOCKERS.md` 描述准确。
- `packages/rule-engine/src/actionResolve.ts` 现状核对：T003/T004 代码已写好，`import type { DiceRollResult }
  from '@interactive-story/dice-engine'` 是当前唯一触发 BLK-006 环的一行；`resolveAction` 实际只读取
  `input.dice.quality` 一个字段。
- `packages/dice-engine/src/index.ts` `DiceRollResult` 形状核对：`{ seed: string; rollIndex: number;
  diceType: string; rawValue: number; modifier: number; finalValue: number; quality: Quality | undefined;
  appliedModifiers: AppliedModifier[] }`；`AppliedModifier`（`modifiers.ts`）为 `{ amount: number; reason: string }`。
- `DEV-005 DECISIONS.md D5` 先例核对属实：dice-engine 输出字段对齐 `runtime-kernel` 冻结的
  `DiceRollRecordPayload`，但**不 import runtime-kernel**——"对齐是约定而非类型复用"已是本项目已确立的纪律，
  BLK-006 倾向方案 B 是同一纪律的镜像应用（rule-engine 对齐 dice-engine，不 import dice-engine）。

两个 BLOCKING 判断均成立，独立复核结论与 OPENCODE 一致。

## 裁决 BLK-005：采纳方案①

`valid-minimal`/`graph-clean`/`host-clean` 三套 clean fixture 的以下 6 个文件，**Read-only 限制在本条
SCOPE_RULING 范围内解除**，仅限 `results/result-fight.json`、`results/result-follow.json` 两个文件、仅限
`SPECIAL` 条目一处内容：

```
packages/chapter-compiler/test-fixtures/valid-minimal/results/result-fight.json
packages/chapter-compiler/test-fixtures/valid-minimal/results/result-follow.json
packages/chapter-compiler/test-fixtures/graph-clean/results/result-fight.json
packages/chapter-compiler/test-fixtures/graph-clean/results/result-follow.json
packages/chapter-compiler/test-fixtures/host-clean/results/result-fight.json
packages/chapter-compiler/test-fixtures/host-clean/results/result-follow.json
```

**具体改法**：不改 `dice-standard.json`（d20 能摸到 20 这个事实保留，SPECIAL 阈值不删）。把每个文件里
`{ "quality": "SPECIAL", "unreachable": true }` 换成一条完整结果条目，字段形状镜像同文件里 `GREAT_SUCCESS`
条目（`resultId`/`worldEffects`/`playerEffects`/`narrativeId`/`visibility: "PUBLIC"`），`resultId`/`narrativeId`
按现有命名规律各自新起一个不冲突的 id（如 `res-fight-special`/`narr-fight-special`，`res-follow-special`/
`narr-follow-special`），`worldEffects`/`playerEffects` 与该文件里 `GREAT_SUCCESS` 条目保持同样内容（各自文件
本来就有的 effect，不新发明）。理由：三套 fixture 定位是"clean"（PASS4-clean），"能摸到但标不可能"是内容
本身的缺陷，删阈值是回避事实（d20 本来就能摸到 20），补全结果条目才是让 fixture 名副其实。

T007 的 `coverage-clean` 正例改为直接复用修正后的既有 clean fixture（省略新建，按 Task Package §3 "若确认
某既有 fixture 已满足可省略"）；`coverage-gap` 反例从修正后的 fixture 复制改一处（把某个可摸到 quality 的
结果重新标回 `unreachable: true`）。

**不采纳方案②**（放宽 T006 #3 断言逐字保留 + 接受 clean fixture 处于 coverage 失败态）——同 BLK-003/BLK-004
先例，"clean" 名不副实的方案劣于修正内容本身。

## 裁决 BLK-006：采纳方案 B

`packages/rule-engine` **豁免** Task Package T002 #2（tsconfig `references` 追加 `../dice-engine`）与
T004 #1 字面的"`import type { DiceRollResult } from '@interactive-story/dice-engine'`"要求：

1. `actionResolve.ts` 删除 `import type { DiceRollResult } from '@interactive-story/dice-engine'`；
2. 本地新定义一个结构类型（命名 `ResolveRollResult`，不叫 `DiceRollResult` 以免与外部同名类型混淆），字段与
   `DiceRollResult` 逐字对齐：
   ```ts
   interface ResolveRollResult {
     seed: string;
     rollIndex: number;
     diceType: string;
     rawValue: number;
     modifier: number;
     finalValue: number;
     quality: Quality | undefined;
     appliedModifiers: { amount: number; reason: string }[];
   }
   ```
   （`Quality` 已从 `@interactive-story/chapter-schema` import，沿用不变；`appliedModifiers` 内联结构，不新增
   具名类型，因为本节点唯一消费的字段是 `quality`，其余字段只为对齐形状占位）；
3. `ResolveInput.dice: DiceRollResult` 改为 `ResolveInput.dice: ResolveRollResult`；
4. `package.json`/`tsconfig.json` **不追加** `@interactive-story/dice-engine` 依赖/`references`——环随之消失。
5. `DECISIONS.md` 追加一条记录：说明与 `DEV-005 DECISIONS D5`（"对齐是约定而非类型复用"）同一纪律的镜像应用，
   引用本条 `SCOPE_RULING 0062`，注明 T002 #2 与 T004 #1 字面要求已豁免。

对应地：

- `T002` Acceptance 改判为「`dependencies`/`references` 均**不**追加 dice-engine，`package.json` 的
  `dependencies` 恰为 `{ chapter-schema }` 一项」；
- `A07`（"`rule-engine` 的 `dependencies` 恰为 `{ chapter-schema, dice-engine }`"）与 `A14`（当前文字隐含
  "只有类型 import"）需要在 `REPORT.md` 中如实标注偏离原文、给出理由（引用本 `SCOPE_RULING`），不构成扣分项。

**不采纳方案 A**（把 `DiceRollResult` 形状迁入 `shared`/`chapter-schema`）——改动面更大、需解锁两个冻结包，
方案 B 零改动冻结包，代价更小。

## BLK-005/BLK-006 处置

均裁决为**技术性 FIX**（非"接受并说明"）：BLK-005 根因是既有 fixture 内容自相矛盾，PASS4 接入后首次暴露；
BLK-006 根因是 T002/T004 字面要求与两个已冻结包的既有引用关系结构性冲突，非代码质量问题。两者解除对应文件/
字面要求的限制后即可推进，不构成"重开已 DONE 节点"——`dice-engine`/DEV-005 接口不变，`chapter-compiler`
PASS1–PASS3/PASS5/PASS6 既有行为不变。

## Exit Procedure

1. 按上述具体改法修正 6 个 `result-*.json` 文件（仅 SPECIAL 条目，其它既有条目不动）；
2. `actionResolve.ts` 按方案 B 改用本地 `ResolveRollResult`，`actionResolve.test.ts` 手写对象测试同步调整
   （不再需要从 dice-engine import 类型）；
3. `package.json`/`tsconfig.json` 保持只含 `chapter-schema` 一项依赖/引用，**不追加** dice-engine；
4. T005/T006/T007 按 Task Package 原有要求施工（PASS4 判定逻辑不受本裁决影响）；
5. 清空构建产物后按严格顺序重跑六条命令（`install → typecheck → lint → format:check → build → test`），
   记录退出码；
6. `DECISIONS.md` 追加两条记录（BLK-005 fixture 修正理由 + BLK-006 D5 镜像应用理由），均引用本消息 `0062`；
7. `BLOCKERS.md`：BLK-005/BLK-006 状态改为 `CLOSED`，结案依据引用 `0062`；
8. `REPORT.md` 如实标注 A07/A14/T002 相对原文的偏离，附改动前后 diff；
9. 完成 T008：更新 `INDEX.md`、`git add -A && git commit`（不得 `--amend`）、追加 LEDGER 行、发 `NODE_REPORT`
   给 `AUDITOR`；
10. STOP，等待 `AUDIT_VERDICT`。
