# DEV-002A BLOCKERS

## BLK-004 — PASS6 接入后，冻结的 `valid-minimal` 与 `graph-clean` 无法保持 `passed: true`

Status: **CLOSED**（SCOPE_RULING 消息 `0044`，技术性 FIX）
Raised at: 2026-08-18
Closed at: 2026-08-18
Closed by: COMMANDER（裁决）+ OPENCODE（执行）
Referenced by: 消息 `0043`（EXECUTOR_QUERY，blocking: true）→ `0044`（SCOPE_RULING）

### 受影响 Task

T008（compile() 编排扩展，其 Acceptance 要求"valid-minimal 触发 hiddenInfoIssues: []"与
"遗留断言零回归"）与 T010（全量验证）。T001–T007、T009 已完成且不受阻塞。

### 事实

1. Task Package T008 #3 明文要求：`passed` 判定追加 `&& hiddenInfoIssues.length === 0`；
   T008 Acceptance 明文要求：`valid-minimal` 触发 `hiddenInfoIssues: []`。
2. DEV-002 遗留断言：`compile('valid-minimal')` 必须返回 `passed: true`；DEV-003 遗留断言：
   `compile('graph-clean')` 必须返回 `passed: true` 且 `graphIssues`/`stateIssues` 为空。
3. 但 **`valid-minimal` 与 `graph-clean` 的 `host.public.json` 均为空配置**
   （`flagVisibility: {}`、`sceneDisclosures: {}`——DEV-002/003 无 PASS 消费 host 内容，从未
   需要填充）。按本节点四条判定中的"未声明即违规"（A15 判定 1）与场景覆盖（判定 1b），
   PASS6 必然产出 BLOCKING Finding：

   - `valid-minimal`：6 个全局可达状态键（`npc.npc-guide.present/alive/disposition`、
     `danger.level`、`danger.tensionKey`、`chapterVariables.bossHp`）全部未声明 +
     `scene-start` 未覆盖 → `hiddenInfoIssues` 非空 → `passed: false`；
   - `graph-clean`：同上 8 键（含 `flags.gateOpen`/`flags.forestClear`，由可达效果 SET 产生）
     未声明 + `scene-start`/`scene-tavern`/`scene-forest` 三个可达场景未覆盖 → `passed: false`。

4. 独立实跑（本会话，PASS6 接入后）：`pnpm test` 252/254 通过，**恰 2 个失败**，即上述两条
   遗留断言（`expected false to be true`）。`compile(valid-minimal).hiddenInfoIssues` 的完整
   输出见本文件末附；`graph-clean` 同构（多出 `flags.gateOpen`/`flags.forestClear` 两条与两个
   场景覆盖项）。
5. 消息 `0042` 任务包第 3 节把 `test-fixtures/valid-minimal/**` 与 `graph-*/**` 列为
   Read-only；T009 的 `host-clean` 正例兜底条款（"若确认 valid-minimal 已满足四条判定可复用"）
   经核对不成立——`valid-minimal` 的 host 配置为空，不满足穷举/覆盖，故已另建 `host-clean`
   正例（实跑 `passed: true`，`hiddenInfoIssues: []`），但**遗留断言**（valid-minimal /
   graph-clean 的 passed:true）仍须依赖这两个冻结 fixture 自身的 host 配置补齐，无法由
   新正例替代。

### 约束

- `valid-minimal/**`、`graph-*/**` 属本节点 Read-only Scope，OPENCODE 不得自行修改；
- T008 禁止删除或修改既有断言；A06 要求 DEV-000/001/002/003 遗留测试零回归；
- 本 blocker 之外的验收项（A01–A05、A07–A23，除 A06 的这两条断言外）均不受影响。

### OPENCODE 倾向方案（方案 A：授权补齐两个冻结 fixture 的 host.public.json）

`SCOPE_RULING` 解除 `valid-minimal/host.public.json` 与 `graph-clean/host.public.json` 的只读
限制，允许把两个文件从空配置补成**完全合规**的最小配置：

- `valid-minimal/host.public.json`：`flagVisibility` 声明全部 6 个可达状态键为 `HIDDEN`；
  `sceneDisclosures` 覆盖 `scene-start`（`knownFactIds: []`、`tensionKey: "calm"`）；
  `tensionLabels` 不变。
- `graph-clean/host.public.json`：`flagVisibility` 声明全部 8 个可达状态键为 `HIDDEN`
  （`flags.gateOpen`/`flags.forestClear` 被非兜底结局 `ending-nice` 的 `when` 引用，按判定 4
  隔离性本就应当 `HIDDEN`，标记 `HIDDEN` 完全正确）；`sceneDisclosures` 覆盖
  `scene-start`/`scene-tavern`/`scene-forest`（`knownFactIds: []`）。

效果：四条判定全部通过，`hiddenInfoIssues` 均为 `[]`，`passed` 恢复 `true`；PASS1–PASS5 结果
完全不变（host.public.json 不被任何 PASS 1–5 消费）；既有断言逐字保留、零回归；也是"未声明
即违规"白名单纪律的正确示范（每个键都被显式分类，只是恰好全为 HIDDEN）。

不推荐路径（均改 T008 #3/A06 字面语义，非 Commander 自主裁决范围）：跳过空配置的穷举/覆盖
检查；放宽 hiddenInfoIssues 对 passed 的纳入；修改既有测试断言。

### 解除条件

收到 `SCOPE_RULING` 后：若批准方案 A，按裁决补齐唯一两个文件，重跑六条命令（预期全绿
254/254），继续 T010。若裁决为其它路径，按裁决执行。

### 结案（2026-08-18，消息 `0044`）

Commander 裁决采纳方案 A，并独立复核确认：两个 fixture 的 host 配置为空属实；`checkFlag
Exhaustiveness`/`checkSceneCoverage`/`checkIsolation` 只读 key 存在性/标记，把所有可达键标
`HIDDEN`、覆盖全部可达 SCENE 必使三条判定清零；host 内容不被 PASS 1–5 消费（零回归成立）；
`flags.gateOpen` 属隔离性键标 `HIDDEN` 正确、`flags.forestClear` 为普通可达键标 `HIDDEN` 亦
合规。授权补齐 `valid-minimal` 与 `graph-clean` 两个 `host.public.json`。

OPENCODE 按裁决执行：两个文件仅补齐 `flagVisibility`/`sceneDisclosures`（`tensionLabels` 未
动）。清空构建产物后严格顺序六条命令全部退出码 0，`pnpm test` 254/254 全绿（DEV-000/001/
002/003 遗留断言零回归）。BLK-004 结案。

### 附：`compile(valid-minimal).hiddenInfoIssues`（PASS6 接入后，独立实跑输出）

```
[
  { category: FLAG_NOT_DECLARED, message: 'reachable state key "npc.npc-guide.present" is not declared in host.public.json flagVisibility (undeclared keys are treated as leaks)' },
  { category: FLAG_NOT_DECLARED, message: '... "npc.npc-guide.alive" ...' },
  { category: FLAG_NOT_DECLARED, message: '... "npc.npc-guide.disposition" ...' },
  { category: FLAG_NOT_DECLARED, message: '... "danger.level" ...' },
  { category: FLAG_NOT_DECLARED, message: '... "danger.tensionKey" ...' },
  { category: FLAG_NOT_DECLARED, message: '... "chapterVariables.bossHp" ...' },
  { category: SCENE_NOT_COVERED, message: 'reachable SCENE "scene-start" has no entry in host.public.json sceneDisclosures' },
]
```

`graph-clean` 同构：另加 `flags.gateOpen`/`flags.forestClear` 两条 FLAG_NOT_DECLARED 与
`scene-tavern`/`scene-forest` 两条 SCENE_NOT_COVERED。

## 历史

- BLK-001/002（CLOSED）：见 `specs/BLOCKERS.md`（Commander 维护）。
- BLK-003（CLOSED）：`specs/dev/DEV-003/BLOCKERS.md`（SCOPE_RULING `0038` 技术性 FIX，
  同类的"冻结正例 fixture 不满足新 PASS"问题，本 BLK-004 为其 PASS6 对应）。