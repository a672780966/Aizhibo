---
msg_id: "0231"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-051
in_reply_to: "0230"
created_at: 2026-09-05
requires_response: true
---

# FIX_PACKAGE — DEV-051-FIX-01

## 范围

只改 `packages/ai-host/src/commentPipeline.test.ts`，**不改**
`commentPipeline.ts`/`index.ts`/`package.json` 任何实现代码（本轮
三处发现都是测试覆盖力不够，不是实现缺陷）。

## 要修的三处

### F-02 — A11 tie-break 测试未真正并列

现有测试用 `beta(count=2)` vs `alpha(count=1)` 验证 selectCandidate
优先级排序，但两者 count 本身不相等，没有真正走到"count 并列，按
latest.receivedAt 降序"这个分支。

**要求**：新增一个独立测试用例：构造两个不同文本的簇，让它们的
count 通过重复 ingest 达到完全相同的值（例如都 ingest 2 次），但
让其中一个簇的最后一条消息的 `receivedAt` 明显更晚（比如晚 100 个
单位）；断言 `selectCandidate()` 返回的是 receivedAt 更晚的那个簇的
消息文本。这样才能真正证明"count 相等时比较 receivedAt"这条分支
被测试到，而不是巧合被 count 更大的分支掩盖。

### F-03 — A16 只验证了 maxLength 默认值，没验证 maxPending 默认值

**要求**：新增一个独立测试用例，直接验证默认 `maxPending` 是
100：不传 `maxPending` 配置项，ingest 恰好 101 条不同文本（各自
独立成簇，count 都是 1），断言最终簇数量不超过 100（例如断言
第 1 条 ingest 的文本对应的簇已被淘汰，或者用某种方式验证簇总数
被限制在 100 以内）。可以参考 A14 现有淘汰测试的写法，但这次是
专门为了证明"缺省值确实是 100"，不是为了证明淘汰逻辑本身对不对。

### F-04 — denylist 测试缺少有状态正则的 lastIndex 重置回归证明

DEV-050A 的 egressGate 曾经因为忘记在每次 `.test()` 调用前重置
`pattern.lastIndex = 0` 而导致带 `/g`（或 `/y`）标志的正则在多次
调用间产生状态污染，最终让本该被拦截的文本因为 `lastIndex` 残留
而绕过检测。`commentPipeline.ts` 的 denylist 检查复用了同一个
`pattern.lastIndex = 0` 重置手法（见 `ingest()` 里 `for (const
pattern of denylist)` 循环），但当前测试只用了不带 `/g` 标志的
普通正则，没有真正证明这个重置手法在本文件里同样生效。

**要求**：新增一个独立测试用例，使用带 `/g` 标志的正则作为
denylist（例如 `/badword/g`），连续 ingest 两条都应该被该正则命中
拦截的文本（参照 DEV-050A-FIX-02 里两段文本 lastIndex 位置的构造
思路：让第二条文本里"badword"出现的位置，如果不重置 lastIndex、
从残留的 lastIndex 位置往后搜索就会搜不到），断言两条都被正确
丢弃、都没有产生簇。这样如果未来有人不小心去掉了
`pattern.lastIndex = 0` 这一行，这个测试会真的失败。

## 完成后

1. 六条命令全部跑一遍并记录退出码。
2. 更新 `specs/dev/DEV-051/REPORT.md` 里第 4/5 节，补充这三个新
   测试对应的说明。
3. `git add`：仅 `commentPipeline.test.ts` + `REPORT.md`。
4. `git commit`，首行：`DEV-051-FIX-01: strengthen tie-break, maxPending default, and stateful-regex denylist test coverage`。
5. 写入（不提交）新的 NODE_REPORT 消息文件与 LEDGER 追加行，格式
   同上一轮 `0228`。
6. STOP，等待 Commander 独立验证 + 再次审计。
