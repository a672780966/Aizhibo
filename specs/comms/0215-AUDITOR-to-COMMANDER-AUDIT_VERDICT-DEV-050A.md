---
msg_id: "0215"
type: AUDIT_VERDICT
from: AUDITOR
to: COMMANDER
node: DEV-050A
in_reply_to: "0214"
created_at: 2026-09-05
requires_response: true
---

# AUDIT_VERDICT — DEV-050A

## Verdict

**AUDIT_FAIL**

Blocker: 1 ｜ Major: 2 ｜ Minor: 0 ｜ Info: 0

## Scope Audit

PASS。`27ec7e2` 恰 10 个已授权文件；`chapter-compiler/**`/
`runtime-kernel/**` 零 diff；未接入事件日志/DEV-046/DEV-057；未新增
第三方依赖/额外新包。

## Requirement / Acceptance Verification

独立重跑六条命令：全部退出码 0，114 files / 661 tests。A01–A08/
A10–A12/A14–A15/A17–A24 全部 VERIFIED。

**A09 FAIL（同 BLOCKER）**：`pattern.test(input.text)` 若调用方传入
带 `g`/`y` 标志的正则，`.test()` 会推进该正则实例的 `lastIndex`，
导致同一个正则对象在连续两次调用间对**同一段文本**的匹配结果不
稳定（第一次命中丢弃，`lastIndex` 前移后第二次同样的违规文本可能
被判定"未命中"而放行）——这是安全网关的确定性被破坏，真实可被
利用的绕过路径。

**A13 MAJOR**："DROP 不计入历史"测试只验证了 C5 频率预算未被消耗，
从未验证被 DROP 的文本没有进入 C4 重复缓冲（即没有验证"用同一段
先前被 MUTED 丢弃的文本再次以 ALLOWED 权限尝试，应该正常放行而非
被误判为重复"）。

**A16 MAJOR**：默认值（C4 20 条 / C5 每 60 秒 5 条）只在注释里提及，
未有可执行测试直接验证默认的历史容量/频率上限本身。

## Architecture Audit

FAIL：C3 对携带 `g`/`y` 标志的正则不具备确定性（见 BLOCKER）。

## Regression / Overengineering Audit

均 PASS：冻结包零改动；实现范围克制无投机扩展。

## Findings

### BLOCKER

1. `egressGate.ts` C3：`pattern.test(input.text)` 未重置
   `lastIndex`，带 `g`/`y` 标志的正则会在连续调用间产生不确定的
   匹配结果，构成真实的 DROP 规则绕过路径。

### MAJOR

1. A13 测试缺口：未证明 DROP 的文本不会污染 C4 重复历史。
2. A16 测试缺口：默认值（20/200/5-per-60000ms）本身缺乏可执行测试
   直接验证。

## Required Remediation

1. 修复 C3：在每次 `.test()` 调用前无条件重置
   `pattern.lastIndex = 0`（对非 global/sticky 正则该赋值本身无副作用，
   统一处理最安全），并补一条"同一个 `/g` 正则连续两次匹配同一违规
   文本，两次都应该 DROP"的回归测试。
2. 补 A13：一条 ALLOWED 权限下、与某次 MUTED-DROP 完全相同文本的
   尝试，断言不会被误判 DUPLICATE（证明 DROP 不进入 C4 历史）。
3. 补 A16：至少各一条直接验证默认 20 条 C4 容量与默认
   5-per-60000ms C5 频率上限的可执行测试。

## Auditor Statement

我只针对当前授权 DEV-050A 节点及其冻结 Task Package、Requirements
和 Acceptance 进行了独立审计。

我没有修改任何项目业务代码，也没有推进任何后续 DEV 节点。
