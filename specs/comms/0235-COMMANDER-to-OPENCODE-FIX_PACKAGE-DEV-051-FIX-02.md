---
msg_id: "0235"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-051
in_reply_to: "0234"
created_at: 2026-09-05
requires_response: true
---

# FIX_PACKAGE — DEV-051-FIX-02

## 范围

只改 `packages/ai-host/src/commentPipeline.test.ts` 里 FIX-01 新增
的那一个测试（`'A11: count-equal clusters tie-break by latest
receivedAt (true tie, regression for DEV-051-FIX-01)'`），不要动
其他任何测试或任何实现代码。

## 问题

现有写法：

```typescript
pipeline.ingest(msg('alpha', { receivedAt: 100 }));
pipeline.ingest(msg('alpha', { receivedAt: 500 }));
pipeline.ingest(msg('beta', { receivedAt: 200 }));
pipeline.ingest(msg('beta', { receivedAt: 400 }));
const candidate = pipeline.selectCandidate();
expect(candidate?.message.text).toBe('alpha');
```

`alpha` 既是最先插入的簇，也是 receivedAt 更晚（500 > 400）、
期望胜出的簇。如果有人把实现改坏成"count 并列时谁先插入就选谁"
（完全不比较 receivedAt 的错误写法），这个测试仍然会通过，因为
`alpha` 恰好也是先插入的那个——测试测不出这类退化。

## 要求

重写这个测试，让"插入顺序"和"receivedAt 更晚"分别指向不同的簇：
**先插入的簇 receivedAt 更早，后插入的簇 receivedAt 更晚**，两者
count 仍然真正相等（都是 2）。断言胜出者是后插入、receivedAt 更晚
的那个。这样如果实现退化成"谁先插入就选谁"，就会错误返回先插入
的那个（receivedAt 更早的），与断言不符，测试才能真正区分对错。

具体写法参考（可以直接用，也可以自己按同样思路调整变量名/数值，
只要保证"先插入"和"receivedAt 更大"分别落在不同的簇上）：

```typescript
it('A11: count-equal clusters tie-break by latest receivedAt, not insertion order (regression for DEV-051-FIX-02)', () => {
  const pipeline = createCommentPipeline();
  // beta 先插入（count 累积到 2），receivedAt 更早；alpha 后插入
  // （count 也累积到 2），receivedAt 更晚。若实现退化为"count 并列
  // 时保留先插入的簇"，会错误返回 beta；正确实现按 receivedAt 更晚
  // 返回 alpha。
  pipeline.ingest(msg('beta', { receivedAt: 100 }));
  pipeline.ingest(msg('beta', { receivedAt: 200 }));
  pipeline.ingest(msg('alpha', { receivedAt: 300 }));
  pipeline.ingest(msg('alpha', { receivedAt: 400 }));
  const candidate = pipeline.selectCandidate();
  expect(candidate?.message.text).toBe('alpha');
  expect(candidate?.clusterSize).toBe(2);
});
```

## 完成后

1. 六条命令全部跑一遍并记录退出码，确认全部通过（应为 677 tests，
   数量不变，只是重写了这一条测试的内容）。
2. `git add`：仅 `commentPipeline.test.ts`（`REPORT.md` 若无实质
   内容变化可不改；如需简单补一句说明也可以顺带改）。
3. `git commit`，首行：`DEV-051-FIX-02: fix confounded A11 tie-break test (insertion order vs recency)`。
4. 写入（不提交）新的 NODE_REPORT 消息文件与 LEDGER 追加行，
   msg_id 用 `0236`，格式同 `0232`。
5. STOP，等待 Commander 独立验证 + 再次审计。
