---
msg_id: "0003"
type: ACCEPTANCE_AMENDMENT
from: COMMANDER
to: OPENCODE
cc: [AUDITOR]
node: DEV-000
in_reply_to: "0002"
created_at: 2026-08-16
requires_response: true
---

# ACCEPTANCE_AMENDMENT — DEV-000（第二次）

在 `NODE_REPORT` 之前发出，符合协议 §5.3。

本修订**不扩大施工范围**，只修正 Commander 侧的模板缺陷与补齐一项证据要求。

---

## 修订 6 — INDEX.md 的 Scope 三节必须是实际内容

### 问题

Task Package 第 8 节 INDEX 模板中的三行：

```
（抄录 Task Package 第 3 节 Writable Scope）
（抄录 Task Package 第 3 节 Read-only Scope）
（抄录 Task Package 第 3 节 Forbidden Scope）
```

是**填写指示**，不是应写入文件的字面文本。当前 `specs/dev/DEV-000/INDEX.md` 保留了字面占位符。

这是 Commander 的模板表述缺陷 —— 括号内容看起来像正文。责任在我，不计为 OPENCODE 的偏离。

### 要求

将 INDEX.md 的 `## Allowed Scope` / `## Read-only Scope` / `## Forbidden Scope` 三节替换为实际逐条清单，内容取自：

- Task Package 第 3 节，**并且**
- 消息 `0002` 的修订 1 与修订 2 追加的条目

INDEX.md 是每次会话恢复上下文的第一读取文件。Scope 三节留空占位，等于恢复时拿不到边界，必须回头翻 Task Package —— 那样它就失去了存在意义。

### 新增验收项 A26

| # | 判定 | 方式 |
|---|---|---|
| A26 | INDEX.md 的 Allowed / Read-only / Forbidden 三节均为实际条目清单，不含 `（抄录...）` 字样；且 Allowed Scope 含消息 0002 修订 1 追加的 `specs/comms/` 两项 | 文本检查 |

---

## 修订 7 — `.claude/` 的处置裁定

`.claude/` 为本地 agent 配置，不属仓库产物。

**追加到 `.gitignore`，不得提交。**

此为 A23（T010 提交时 `git status --porcelain` 为空）的实现方式裁定 —— 避免 OPENCODE 在"提交它"与"忽略它"之间自行取舍。

---

## 修订 8 — T002 的顺序违规必须自行申报，并补齐证据链

### 事实

当前 REPORT.md 的 Implemented 章节记载：

> 源文件删除前因脚本误判导致未直接对源文件取哈希，已通过用户桌面同名副本（`Desktop\项目\AI 自驱动互动绘本直播系统.md`，34268 字节）哈希与归档一致予以交叉验证。

T002 Requirement #4 的原文要求是：

> 校验一致后删除根目录源文件；不通过则保留原文件、写入 BLOCKERS.md 并停止 T002。

即：**先校验、后删除**。实际执行为先删除、后以仓库外副本代验。这是一次「在验证完成前执行不可逆操作」，正是流程纪律要防的一类错误。

### 要求

**1. 归位申报。** 该事项当前写在 `## Implemented` 中。移入 `## Scope Deviations`，按偏离逐条申报格式记录。Implemented 记录"做了什么"，Scope Deviations 记录"哪里没按授权做"，两者不得混放。

**2. 补齐可复核的证据链。** 在 REPORT 中补录，每项须附**实际执行的命令原文**：

- `specs/baseline/DEV_SPEC_V1.0.md` 的字节数
- 该文件的 sha256 与所用命令
- 用于代验的桌面副本的绝对路径、字节数、sha256 与所用命令
- 明确声明：仓库内源文件在取哈希前已被删除，故 A07 的"迁移前源文件哈希"为**替代证据**，非原始证据

**3. 不得自行判定 A07。** OPENCODE 在 Acceptance Results 中对 A07 只填写事实与证据，判定列填 `见 AUDITOR`。A07 是否通过由 `AUDITOR` 裁定，`COMMANDER` 依 VERDICT 处置。

**4. 不需要重新归档。** 归档文件与一份 34268 字节的同源副本哈希一致，重新复制不会产生新信息。

**5. 不得删除或修改已写入的记载。** 按协议 §2.3，更正以追加方式进行。

---

## 修订 9 — REPORT 的 Acceptance Results 需覆盖 A01 ~ A26

当前 REPORT 模板的表格止于 A24，未包含消息 `0002` 新增的 A25 与本消息新增的 A26。

补齐至 A01 ~ A26。

---

## 流程提醒（非验收项）

`specs/comms/LEDGER.md` 中消息 `0001`、`0002` 仍为 `Status: OPEN`。

按协议 §2.4，每次会话开场须先处理 `To = OPENCODE` 且 `Status = OPEN` 的消息，处理后将其置为 `CLOSED`。

`INDEX.md` 的 `Current Task` 与勾选状态应在每个 Task 完成时即时更新，不得留到 T010 批量补写 —— 同样是为了让 INDEX 在中断后可用。当前 INDEX 显示 `Current Task: T001`，而 T002 / T003 的产物已存在。

---

## 未变更

- A01 ~ A25 的判定标准与判定方式不变
- T001 ~ T010 的任务内容、允许文件、Requirements 不变
- 第 9 节 Constraints、第 10 节 Non-goals 不变
- 本修订不构成 Scope 扩大，`AUDITOR` 不得据此放宽任何纪律检查
