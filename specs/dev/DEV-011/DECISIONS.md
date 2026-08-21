# DEV-011 DECISIONS

## D1 — 重放投票，不重放 RuntimeEvent

`RuntimeEvent` 是 runtime-kernel 产出的输出日志，机器只接受 `RootEvent`，因此不能把历史
`RuntimeEvent` 直接重新发送给 Actor。外部输入中真正影响状态的部分是投票；BOOT、STORY.DONE、
INTERACTION.OPEN、LOCK、NARRATIVE.DONE 都由与 DEV-007 相同的相位驱动器确定性地产生。重放
因此从日志提取 `INTERACTION.VOTE` 轮次，再复用相同驱动循环从零运行。

## D2 — 投票轮次边界

连续扫描历史日志，`INTERACTION.VOTE` 累积当前轮，遇到 `INTERACTION.LOCKING` 就提交该轮并
清空缓存；其它 RuntimeEvent 类型只跳过。这保留了事件序列中的真实轮次，也支持没有投票的
LOCKING 轮次与多互动章节。

## D3 — 比较字段排除 id/timestamp

默认比较 `type`、`payload`、`chapterId`、`visibility`、`sessionId`。`id` 由事件序号派生，通常
稳定；`timestamp` 使用生产环境的 `systemClockPort` 时来自墙钟，原始运行与重放的时间不同不
代表 World/Story/Player 状态发散。因此默认排除二者，同时提供确定性虚拟时钟场景的全字段
深比较，避免排除字段掩盖真正的机制问题。

## D4 — 与 DEV-010 LKG 的边界

DEV-010 的写穿透 LKG 是从最近 persisted snapshot 恢复崩溃中的 Actor；DEV-011 不读取快照、
不依赖 persistence，而是只给 Chapter、seed、完整 Event Log 从零重建并验证确定性。两者互补，
本节点不扩展 persistence，也不实现部分序号重放。

## D5 — 死循环与不匹配处理

重放驱动器沿用 DEV-007 的 `maxSteps` 防护，默认 200；记录需要投票而没有下一轮时立即抛出
明确错误，步骤耗尽也抛错，不静默返回一个看似成功的 Actor。多余投票轮次在正常完成后同样
视为输入与章节不匹配并报错。

## D6 — 虚拟时钟验证适配

DEV-007 冻结的 `virtualClockPort` 是模块级单调计数器，而不是可重置工厂。为遵守本节点不得
修改既有 `virtualPorts.ts` 的边界，测试分别在每次运行前记录一个 origin，并以同一导出的
virtual clock 生成相对时间；两次 actor 看到的事件时间都从相同相对起点开始。生产 replay
实现不篡改时钟，也不把这个测试适配器暴露为新 API。
