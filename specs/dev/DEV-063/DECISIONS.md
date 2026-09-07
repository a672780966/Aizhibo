# DEV-063 DECISIONS

本文件记录 DEV-063（Watchdog，M6 第四个节点）施工中做出并落库的
决策。Task Package 第 6 节与 Dispatch 要求覆盖四个"为何"要点，逐
条以真实理由说明如下。

## D1 — 为何 L3 的三个场景（Renderer crash / Twitch disconnect / Runtime process restart）当作**封闭集合**写真实分支，而不是像 DEV-062 error-registry 的 `category` 那样开放

两个节点的表面动作都是"定义一组错误场景/取值"，但二者服务的对象
性质完全不同，这正是"一个封闭、一个开放"的分水岭。

error-registry 的 `category` 是**面向全仓库、面向未来的错误分类
表面**：它的输入是"代码库里任何模块（Host LLM、Host TTS、Viewer
memory、Story TTS、Chapter Integrity……）在任何时刻上报的一条错误
记录"，第 56 节给出的类别清单是举例（冒号加示例），不是穷尽清
单。任何未来模块都可能产生一个今天清单里没有的新错误类别，所以
DEV-062 把它做成自由文本 string——封闭枚举会在第一个新类别出现时
立刻过时（详见 DEV-062 D1）。它是"某个模块产生了、事后需要归类
的报告"的分类学。

Watchdog 的 `WatchdogTrigger` 则是**本节点自己的管辖边界本身**：
Dev Spec 第 56 节 L3 用一句话点名了恰好三个可恢复场景——"Renderer
crash / Twitch disconnect / Runtime process restart → 自动恢复"。
这句话不是"随便举三个例子供未来扩展"，它定义了"Watchdog 到底在
看什么"：这三件事就是本节点的 charter，是范围划定语句，不是事后
分类学。USER 2026-09-08 已就此裁决：L3 这三个场景当作封闭集合处
理，写成真正的三路判断分支，而不是一句通用 noop。Dev Spec 第 63
节本身零正文、DAG.md 备注为空，第 56 节 L3 是本节点唯一权威范围
来源——把这三值做成 `'RENDERER_CRASH' | 'TWITCH_DISCONNECT' |
'RUNTIME_PROCESS_RESTART'` 字面量联合，是逐字抄录规范原文，没有
任何发明成分；漏掉任何一个或加上任何一个第四值，都偏离了 charter。

所以：error-registry 的 `category` 开放，因为它是一个**任何模块
都能往里写**的开放分类表面（今天清单外的类别必然出现）；Watchdog
的 `WatchdogTrigger` 封闭，因为它是一个**只有这三个命名场景**的
管辖声明——不开放的扩展点。`decideWatchdogAction` 用 `switch` 覆
盖全部三个字面量、无 `default` 分支：三个 `case` 已穷尽整个联合
类型，配合返回值类型与 `noFallthroughCasesInSwitch`，一旦未来有人
给 `WatchdogTrigger` 加第四个值而忘了补分支，TypeScript 会立刻报
函数缺返回路径——封闭集合的收益正在于此。

## D2 — 为何 `TWITCH_DISCONNECT` 解析为 `ALREADY_HANDLED`，而不是在本节点重新实现重连

第 56 节对 L3 的处理方针是"自动恢复"。对 Twitch 断线这个场景，
"自动恢复"已经被实现了：DEV-045 在 `packages/platform-twitch` 里
交付了指数退避自动重连（`specs/dev/DAG.md` 第 193 行）。Watchdog
的职责是**判断对这个场景应该采取什么动作**，不是接管动作本身。

如果本节点再写一份重连逻辑，仓库里就会出现两份互相竞争的 Twitch
重连实现：谁生效、谁被调用、行为差异如何收敛都无从谈起，而且
`platform-twitch` 的重连是真实运行在连接层里的，Watchdog 侧任何
"再重连一次"的动作都会与它打架（比如断线瞬间双方各自发起重连、
退避时钟错乱）。重复的恢复逻辑不是冗余防御，是互相矛盾的执行者。

诚实的结论因此只有一个：这个场景**已经被处理**——既有机制在别
处且真实存在，Watchdog 不需要也不应该做任何额外动作。`detail`
如实点名 `platform-twitch` 与 DEV-045，把"为什么不需要动"的证据
写进返回值，而不是丢一句干巴巴的占位文案。

## D3 — 为何 `RENDERER_CRASH` 与 `RUNTIME_PROCESS_RESTART` 都诚实解析为 `NOT_YET_WIRED`，而不是假装某种恢复动作"已执行"

对照仓库现实逐场景核对：

- **Renderer crash**：代码库里不存在任何 Renderer 崩溃检测机制，
  也不存在崩溃后自动重启 Renderer 的机制（Renderer 侧既有交付是
  静态 Avatar 状态等演出数据，不是进程监督）。没有检测，就没有
  触发点；没有重启器，就没有恢复动作可执行。
- **Runtime process restart**：仓库里不存在任何长期运行的生产入
  口进程（apps/ 与 packages/ 都是库与类型层交付），没有进程可供
  "重启"。这一现实约束在 DEV-060A 与 DEV-061 的决策中已反复确认
  记录——operator-api 的 8 个占位 action 与 health-registry 不硬
  编码真实来源，都是同一约束的不同侧面。

对本节点而言，这两个场景"应该自动恢复"的机制都还不存在。此时唯
一诚实的取值是 `NOT_YET_WIRED`：机制尚未建成，Watchdog 如实宣告
"没有东西可恢复、也没有恢复者"，把缺位点名到具体机制（Renderer
崩溃检测/重启机制、可重启的生产进程），而不是假装某个恢复动作
"成功执行"了。这正是 `WatchdogActionKind` 只有 `ALREADY_HANDLED`
与 `NOT_YET_WIRED` 两个取值、**没有第三个"真的执行了恢复动作"取
值**的原因：本节点不实现任何真实恢复动作本身（不重启进程、不检
测崩溃、不重连），任何声称某动作已执行的取值都会是谎言。两条
`detail` 各自点名不同的事实（"没有检测/重启机制" vs "没有可重启
的进程"），也避免了两条 `NOT_YET_WIRED` 沦为复制粘贴的同一句通用
占位——它们指向两个真实不同的缺位。当 DEV-065/066/067（Failover
与真实装配）落地后，这两条的取值将由集成节点改写，本节点不提前
发明。

## D4 — 为何本包对 error-registry / health-registry / platform-twitch / runtime-kernel / operator-api / renderer **零依赖**

`WatchdogTrigger` 是本节点**自己管辖范围内的封闭词汇**：它直接来
自 Dev Spec 第 56 节 L3 的原文点名，不依赖任何其他包提供数据。最
常见的诱惑是把 `WatchdogTrigger` 从 `error-registry` 的自由文本
`category` 字段做字符串匹配推断出来（"category === 'Renderer
crash' 就当作 RENDERER_CRASH 触发"）——那会在两个包之间建立一种
**脆弱的、基于魔法字符串的隐性耦合**：两个包并没有就这些字符串
签过任何契约，`category` 是开放文本（DEV-062 刻意为之），未来任
何模块都可以用同名字符串表达完全不同的语义，或把同义场景写成不
同文案，字符串一漂移 Watchdog 的触发就静默失效。把契约建立在没
有契约的字符串上，是把自己对范围的定义外包给别人的自由文本。

而 error-registry / health-registry / platform-twitch /
runtime-kernel / operator-api / renderer 里也没有任何"可供
Watchdog 判断该做什么动作"的现成输入：L3 三个场景里一个已被
DEV-045 处理（因此才返回 `ALREADY_HANDLED`，不需要读
`platform-twitch` 的源码去确认——DAG.md 的既有事实记录已足够）、
两个没有任何既有机制（D3）。真实装配（把 error-registry 记下的
L3 错误接到 Watchdog 判断、把判断结果接到未来的恢复执行者）是未
来集成节点的职责，不是本节点的职责；在那之前，任何 import 都只
会是单相思的、没有调用方的死代码耦合。零依赖同时保证了本包的类
型/行为不随其他包演化漂移——封闭词汇 + 纯函数判断，这正是
Watchdog 现在能交付的全部真实内容。
