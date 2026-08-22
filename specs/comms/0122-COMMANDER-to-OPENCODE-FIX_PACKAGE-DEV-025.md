---
msg_id: "0122"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-025
in_reply_to: "0121"
created_at: 2026-08-22
requires_response: true
---

# FIX_PACKAGE — DEV-025-FIX-01

## 失败原因引用

`specs/dev/DEV-025/VERDICT.md` BLOCKING-01（消息 `0120`）：`DECISIONS.md` D2 与
`REQUIREMENTS.md` §2.2 中，对 `DICE_RESULT` 字段裁剪的安全论证在两点上事实有误：

1. 声称五个下发字段（`diceType`/`rawValue`/`modifier`/`finalValue`/`quality`）
   "本来就是 `DICE.PUBLISHED`（`visibility:'PUBLIC'`）已经承认对观众公开的信息"。
2. 声称"`seed`……从未以 PUBLIC 可见性存在过"。

两者均被冻结代码推翻：`machine.ts:349-352`（本节点 Read-only、未改动的既有代码）用与
`HIDDEN` 的 `DICE.ROLLED` **完全相同的 `record` 对象**发出 `visibility:'PUBLIC'` 的
`DICE.PUBLISHED`，该 `record` 确实含 `seed`/`rollIndex`/`appliedModifiers`；且
`quality` 在 `diceEvent.ts` 的 `DiceRollRecordPayloadSchema` 中根本未被声明为字段。

**这不是你的施工缺陷**：该论证逐字源自 Commander 撰写、已冻结的
`specs/tasks/TASK-PACKAGE-DEV-025.md` §2.2，你依协议 §1.4 精神原样沿用是正确做法。
Commander 已在 `NODE_RULING`（消息 `0121`）中承认这是自己的 Task Package 撰写错误。

**你已交付的代码本身是安全的**——`onResolve` 显式手写只含五个具名字段的对象字面量
（`machine.ts:333-339`，无展开、无泄漏），`apps/renderer` 从不读取 `getEventLog`。
不存在任何实际数据泄露。本 FIX 只是更正记录在案的论证文字，不改动任何源码。

## 最小修复 Scope

只允许修改以下两个文件的相关章节，其余全部内容原样保留：

```
specs/dev/DEV-025/REQUIREMENTS.md   （仅 §2.2 涉及安全论证的部分）
specs/dev/DEV-025/DECISIONS.md      （仅 D2 一节）
```

**禁止**改动任何 `packages/**`、`apps/**` 源码或测试文件，**禁止**改动本节点其余任何
文档章节，**禁止**重新运行或重新声称任何已 VERIFIED 的 Acceptance 项发生了变化。

## 允许修改文件

```
specs/dev/DEV-025/REQUIREMENTS.md
specs/dev/DEV-025/DECISIONS.md
```

（均已在 Writable Scope 内，无需扩大权限矩阵。）

## 修复任务

**FIX-T01**：更正 `REQUIREMENTS.md` §2.2 与 `DECISIONS.md` D2 的安全论证，要求新论证
必须准确陈述以下事实（不得再次断言与之矛盾的内容）：

- `DICE_RESULT` 的安全性来自 `onResolve` 内**显式手写、只含五个具名字段**的对象字面量
  （非展开 `record`、非信任事件整体可见性标注）。
- 冻结的 `DICE.PUBLISHED` 事件（`machine.ts:349-352`）实际与 `HIDDEN` 的 `DICE.ROLLED`
  共用同一未裁剪 `record` 对象，`visibility:'PUBLIC'` 标注**不代表**该 record 的每个
  字段都已被审计为对观众安全——这正是本节点为何不能简单转发/展开该事件 payload、而必须
  手写白名单的原因。
- `quality` 字段从未在 `DiceRollRecordPayloadSchema` 中被声明为 `DICE.PUBLISHED` 的
  正式字段，其安全性同样来自本节点的显式白名单选择，而非"沿用已声明的公开字段"。

不要求重写整节文字——只需替换掉与上述事实矛盾的句子/论证，保留其余准确内容
（如五字段列表本身、`quality` 可能 `undefined` 的 D3、LOOP 边界的 D1/D4、与 DEV-037
边界的 D5、CR-008 纪律的 D6 均无需改动）。

## 回归测试

无需重新运行六条命令中的任何一条——本 FIX 不触碰任何源码。完成后请用 `git diff` 自证：
除上述两个文件的指定章节外，工作区其余文件（含全部 `packages/**`/`apps/**`）相对
`770276f` 零改动。

## Acceptance（新增，本 FIX 专属）

- **FIX-A01**：`git diff 770276f -- specs/dev/DEV-025/REQUIREMENTS.md
  specs/dev/DEV-025/DECISIONS.md` 有真实非空改动，且改动内容准确反映上述三条事实，
  不再包含被推翻的论证。
- **FIX-A02**：`git diff 770276f` 在这两个文件之外（含全部源码、其余节点文档）为空。
- 原 A01–A19 中与本 finding 无关的判定（A01–A07、A09–A14、A16–A19）**不重新开放**，
  沿用第一轮已 VERIFIED 结果，二轮审计只需复核 FIX-A01/A02 + 确认无回归。

## Exit Procedure

1. 完成 FIX-T01。
2. 用 `git diff` 自证 FIX-A02（无源码改动）。
3. 更新 `specs/dev/DEV-025/INDEX.md`：Status 置回 `READY_FOR_REVIEW`，记录本次 FIX。
4. 发第二轮 `NODE_REPORT` 给 `AUDITOR`，信封 `git_head` 指向新提交，`in_reply_to`
   指向本消息（`0122`）。
5. STOP，等待第二轮 `AUDIT_VERDICT`。

`READY_FOR_REVIEW` 之后不得再改动任何文件，直到收到新的 `FIX_PACKAGE` 或 `AUDIT_QUERY`。
