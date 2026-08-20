# DEV-005 DECISIONS

本节点的四条设计决策，全部在 T003–T007 施工期间定案。**本文件随最终提交入库**（DEV-004
上一轮 FIX 的教训：REPORT 引用但未提交，证据链断裂被判 FAIL——本次不重蹈覆辙）。

## D1 — 确定性哈希方案（T003）

骰子点数的唯一随机来源是 FNV-1a 32 位哈希（`spec` §65/§8 要求 Seeded PRNG 且禁止
`Math.random()`；Task Package 第 9 节红线）。实现要点（`src/hash.ts`）：

- offset basis `0x811c9dc5`，prime `0x01000193`，按 UTF-16 code unit 逐字符
  `hash ^= char; hash *= prime`（`Math.imul` 保证 32 位乘法），末尾 `>>> 0` 归一为
  `[0, 2^32)` 无符号整数。
- 不引入第三方库（Constraint 5），手写约 10 行；无状态、纯函数——同输入永远同输出。
- 调用键为字符串 `\`${seed}:${rollIndex}:${drawIndex}\``，`drawIndex` 是显式参数，不存在
  "生成器推进"或隐藏计数器（Constraint 3）。

**测试向量（已交叉核对）：**

| 输入 | fnv1a32 输出（十进制） | 来源 |
|---|---|---|
| `""` | 2166136261 | FNV-1a 规范 offset basis `0x811c9dc5`（独立已知值） |
| `"a"` | 3826002220 | 公开参考向量 `0xe40c292c`（独立已知值） |
| `"foobar"` | 3214735720 | 公开参考向量 `0xbf9cf968`（独立已知值） |
| `"chapter1"` | 1871303641 | 本包锁定向量 |
| `"seed-abc:0:0"` | 888117373 | 本包锁定向量 |
| `"seed-abc:0:1"` | 871339754 | 本包锁定向量 |
| `"seed-abc:1:0"` | 778168726 | 本包锁定向量 |
| `"replay-me"` | 3202568447 | 本包锁定向量 |

前三条用规范/公开值验证实现正确性；后五条把实现锁定为不可变契约（录入 `hash.test.ts`）。

## D2 — 骰子记法退化默认值（T004）

`parseDiceNotation` 用 `^(\d*)d(\d+)$`（大小写不敏感，先 trim）解析 `diceType`。**所有**
不匹配输入——`"abc"`、空串、`"d"`、`"2d"`、`"d6+1"`、`"2d6d8"` 等——一律返回
`{ count: 1, sides: 1 }`，即"恒定摸到 1 点"的安全默认，**不抛异常**（Constraint 4
防御性原则）。理由：

- 叙事骰子的引擎面对的是"已编译内容"，但 `DiceProfile.diceType` 是自由字符串，运行期
  可能出现任意值；抛异常会把一次界面/内容错误升级为整个会话崩溃。
- 退化为 1 点 + 无修正的设计含义是"这次骰子不贡献任何波动"，配合 Quality 阈值仍能产出
  合法结算等级，不会让流程卡死。
- 附加防御：正则虽匹配但 `count=0` / `sides=0`（如 `"0d6"`、`"d0"`）同样退化默认值——
  `(hash % 0)` 在 JS 里是 `NaN`，不能让 NaN 进入点数计算。

## D3 — 模偏（modulo bias）不修正（T005）

`drawDie` 用 `(fnv1a32(...) % sides) + 1` 映射到 `[1, sides]`。当 `sides` 不整除 `2^32`
时存在模偏（低面数略好于高面数）。**明确不修正**。理由（Task Package T005 #4 明示）：

- 本产品是叙事骰子，不是博彩系统；spec §8 对"统计公平性"没有任何量化验收要求。
- 修正（拒绝采样或乘性映射）会增加代码与测试复杂度，换来的收益在本产品语境下不可度量。
- 确定性不受影响（同一输入永远同一输出，Replay 前提满足），模偏只影响"分布是否均匀"，
  与第 61 节 Replay Test 无关。
- 若未来出现真实数值公平性需求（例如竞猜/下注玩法），属新产品决策，需 Commander 裁决后
  再引入，本节点不做投机实现。

## D4 — qualityThresholds 覆盖/重叠校验的已知缺口（T007）

**已知缺口，如实记录，不在本节点修复**：`qualityThresholds` 是否完整覆盖 diceType 实际数值
范围（`[count, count*sides + modifier 可能区间]`）、区间是否重叠——这条静态校验此前未被任何
DEV 节点认领（不属于 DEV-002 PASS1/2，也不属于 DEV-006 PASS4 Rule Coverage；PASS4 管的是
"每个 quality 都有合法结果"，不是"骰子数值分区本身完整无缝"）。本节点只做运行时防御：

- `resolveQuality` 遍历阈值区间，返回第一个 `min <= v <= max` 匹配项；全部不匹配（落在缺口）
  返回 `undefined` 不抛异常。
- 区间重叠（理论上编译期应防止）防御性取**数组第一个**匹配，不合并、不报错。
- 不在本节点新增校验逻辑——那会是范围外的越界实现（Task Package Non-goals 明示）。

留待 Commander 决定归属（谁在编译期补上"数值分区完整性"校验，或转为 CHANGE_REQUEST）。

## D5 — 输出字段对齐 DiceRollRecordPayload 而非复用类型（T007）

`DiceRollResult` 前六个字段（`seed`/`rollIndex`/`diceType`/`rawValue`/`modifier`/
`finalValue`）与 `runtime-kernel` 冻结的 `DiceRollRecordPayload` 逐字一致，但**不 import
`runtime-kernel`**——对齐是约定而非类型复用（Task Package §1 明示：字段形状对齐是为未来
DEV-009 能直接套用，构造事件、决定 DICE.ROLLED/PUBLISHED 触发时机是 Kernel 职责）。本包
额外携带 `quality` 与 `appliedModifiers`（逐条修正明细），满足 spec §8"每次骰子全部进入
Event Log"背后的审计意图，且不改变已冻结 payload 的形状。

## D6 — 包级 tsconfig references 的取舍（T002）

按 Task Package T002 #2 **字面**要求，包级 tsconfig `references` 指向 `chapter-schema` 与
`rule-engine`。与 DEV-002 FIX 移除 chapter-compiler 包级 references 的历史做法并存：根因
（`tsc -b --noEmit` 不发射产物）已由 `SCOPE_RULING 0031` 把根 typecheck 脚本改为
`tsc -b && tsc -b --noEmit` 解决，与 references 存在与否无关；依赖链上 chapter-schema 是
叶子包、rule-engine 只依赖 chapter-schema，无级联缺口，六条命令实测全绿可证。同 DEV-004
DECISIONS D1 的先例，若 Commander 认为应统一为"无包级 references"，属判定方式调整，
需另行指示。