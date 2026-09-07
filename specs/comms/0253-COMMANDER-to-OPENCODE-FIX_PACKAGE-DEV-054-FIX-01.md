---
msg_id: "0253"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-054
in_reply_to: "0252"
created_at: 2026-09-07
requires_response: true
---

# FIX_PACKAGE — DEV-054-FIX-01

## 范围

只改这两个测试文件，**不改**任何实现代码
（`db.ts`/`hostViewerMemory.ts`/`hostRunningJokes.ts`/
`hostMemory.ts` 全部零改动，本轮三处发现都是测试覆盖力不够，
不是实现缺陷）：

```
packages/persistence/src/hostViewerMemory.test.ts
packages/persistence/src/hostRunningJokes.test.ts
packages/host-memory/src/hostMemory.test.ts
```

## 要修的三处

### F-01（MAJOR，A08）—— 二次 upsert 的时间戳行为完全没被测试

`hostViewerMemory.test.ts` 里"updates the note on a second upsert"
这条测试只断言了 `note` 字段。但 `HostViewerMemoryEntry`/
`getHostViewerMemory` 根本不暴露 `created_at`/`last_seen_at`
两列，所以这条测试**没有任何能力**证明"二次 upsert 时
`created_at` 保持首次插入的值不变、`last_seen_at` 更新为最新
时间"这条 Acceptance 要求（A08）。

**要求**：在这条测试（或新增一条测试）里，改用直接对内存数据库
执行原生 SQL 查询 `host_viewer_memory` 表的 `created_at` 和
`last_seen_at` 两列（参照同文件里 `deleteExpiredHostViewerMemory`
那几条测试已经在用的"直接 `db.prepare(...).get()`/`db.prepare(...).run()`
操作原始表"手法）。具体验证：第一次 upsert 后记下这一行的
`created_at` 值；等待或人为构造一个不同的时间戳后再做第二次
upsert（可以用原生 SQL 在两次 upsert 之间人为把 `created_at`
往前改一点再验证第二次 upsert 不会把它改回来，或者更简单地：
第二次 upsert 后查询这一行，断言 `created_at` 与第一次记下的值
完全相等（没有被覆盖），同时断言 `last_seen_at` 这一列确实存在
且不为空。

### F-02（MAJOR，A12）—— purge 没有测试"双平台差异化保留"，也没测 running jokes

`hostMemory.test.ts` 现有的 purge 测试只传了 `{ twitch: 1000 }`
一个平台，另一个平台（youtube）完全没在参数里出现，靠"没传参数
的平台不受影响"来验证——这只测了"未列出的平台不受影响"这半个
要求，没有测更核心的"两个平台都显式列出、但保留时长不同，同龄
数据只有短保留期的那个被清理"这个真正体现"按平台差异化配置"能力
的场景。而且完全没有测试 `host_running_jokes` 这张表是否真的被
`purge` 覆盖到（`purge` 内部应该同时调用
`deleteExpiredHostViewerMemory` 和
`deleteExpiredHostRunningJokes`，现有测试只验证了前者）。

**要求**：重写或新增测试，覆盖：
1. 给 platformA 和 platformB 都记一条观众备注，用原生 SQL 把
   两条记录的 `last_seen_at` 都改成同样早的时间。调用
   `purge({ platformA: 很短的保留期, platformB: 很长的保留期 })`
   （两个平台都显式列出）。断言 platformA 的记录被清理
   （`recallViewer` 返回 `undefined`），platformB 的记录因为
   保留期更长而不被清理（`recallViewer` 仍能读到）。
2. 给某个 platform 添加一条 running joke，用原生 SQL 把这条记录
   的 `created_at` 改成很早的时间，调用 `purge({ 这个platform:
   很短的保留期 })`，断言 `listRunningJokes` 之后不再包含这条
   joke（验证 `purge` 确实同时清理了 `host_running_jokes`）。

### F-03（MINOR，A09）—— 插入顺序测试缺乏区分力

`hostRunningJokes.test.ts` 里验证"按 `created_at` 升序返回"的
测试，写入顺序（joke-1/joke-2/joke-3）与人工设置的 `created_at`
递增顺序完全一致，如果实现漏掉 `ORDER BY` 直接按 SQLite 默认
插入序返回，这条测试也会碰巧通过。

**要求**：把写入顺序和 `created_at` 顺序反过来——比如先写入
joke-1，但用原生 SQL 把它的 `created_at` 设置成最晚的时间；
再写入 joke-2，`created_at` 设置成中间的时间；最后写入 joke-3，
`created_at` 设置成最早的时间。然后断言 `listHostRunningJokes`
返回的顺序是 joke-3、joke-2、joke-1（按 `created_at` 升序，
不是按插入顺序）。

## 完成后

1. 六条命令全部跑一遍并记录退出码，确认全部通过（测试数量应该
   还是 701 左右，只是加强/重写了几条已有测试，如果新增了独立的
   断言用例，数量可能略增，以实际为准）。
2. 更新 `specs/dev/DEV-054/REPORT.md` 里第 4/5 节，补充这几处
   加强测试的说明。
3. `git add`：仅 `hostViewerMemory.test.ts`/`hostRunningJokes.test.ts`/
   `hostMemory.test.ts`/`REPORT.md` 四个文件。
4. `git commit`，首行：`DEV-054-FIX-01: strengthen timestamp-preservation, per-platform purge, and ordering test coverage`。
5. 写入（不提交）新的 NODE_REPORT 消息文件与 LEDGER 追加行，
   msg_id 用 `0254`，格式同上一轮 `0250`。
6. STOP，等待 Commander 独立验证 + 再次审计。
