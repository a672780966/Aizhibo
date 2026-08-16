# SPEC ADDENDUM 002

Development Specification V1.0 增补稿（二）
Drafted by: Claude Commander
Date: 2026-08-16
Status: **FROZEN**（结构性缺口填补，套用 ADDENDUM-001 已批准的起草纪律，非新产品决策）

---

## 0. 性质

在起草 TASK-PACKAGE-DEV-001 时发现三处规范/增补稿均未定义、但已被自己引用的类型，以及一处 Commander 此前的错误归属表述。三处新增均满足 ADDENDUM-001 §0 起草纪律（不引入新子系统、不引入表达式语言、不引入新状态容器），属机械性的、结构一致的缺口填补，不构成产品分叉，故不再走 D0x 用户逐项批准流程，仅公开留痕供事后否决。

---

## B1. 归属纠正——WorldState 属 DEV-001，非 DEV-004

Commander 在 DEV-000 Task Package 第 10 节 Non-goals 中曾写：「`WorldState` 属 DEV-004」。**该表述有误，予以更正。**

Dev Spec V1.0 第 65 节 DEV-001 交付物清单原文包含 **World State**：

> 实现：Scene / Interaction / Choice / Action / Result / Rule / **World State** / Narrative / Asset / Audio

正确归属：

| 内容 | 归属 |
|---|---|
| `WorldState` / `ViewerState`（若适用）的**静态形状**（Zod schema + 推导类型） | **DEV-001**（`packages/chapter-schema`） |
| 对 `WorldState` 施加 `Condition` 求值、`StateEffect` 变更的**运行时逻辑** | DEV-004（`packages/rule-engine`，消费 DEV-001 导出的类型，不重新定义） |

`ViewerState`（第 15 节）**不**在本次 DEV-001 范围内——第 19 节 Chapter Pack 目录结构中没有任何文件对应「单个观众状态」，它是运行时持久化关注点而非章节作者产物，其 Zod schema 归属延后到实际需要它的节点（如 DEV-010 Persistence）再定义，不在此提前实现。

此纠正已同步反映在 `specs/dev/DAG.md`。

---

## B2. `DangerState`——首次定义

第 14 节 `WorldState.danger: DangerState` 引用了 `DangerState`，但 Dev Spec 全文与 `ADDENDUM-001` 均未定义它。

```typescript
type DangerState = {
  level: number         // 非负整数，初始 0，由 StateEffect { container: "danger", field: "level", op: INC|DEC|SET } 变更
  tensionKey: string    // 索引进 world.rules 或 host.public 的 tensionLabels（§38 PublicRuntimeState.currentTension 的来源）
}
```

### 设计理由

`ADDENDUM-001 §A6` 的 `StatePath` 已经把 `"danger"` 列入 `container` 枚举、并预留了 `field?: string // 仅 npc / danger 使用`——说明起草时已经假设 `danger` 是可寻址字段的容器，只是没有把形状写出来。本定义只是把这个已经隐含的假设落成具体类型，不引入新机制。

`tensionKey` 而非直接存字符串标签，是为了和 `HostPublicSpec.tensionLabels`（`ADDENDUM-001 §A15`）保持同一套「键 → 展示文案」间接层，避免运行时状态里出现面向观众的自然语言文案（那会违反 P-01：运行时状态应是事实，不是呈现文本）。

### Compiler 检查项

- `tensionKey` 在 `world.rules.json` 或 `host.public.json` 声明的 `tensionLabels` 中必须存在
- `level` 的初始值由 `initial.state.json` 提供，非负

---

## B3. `HostPolicy`——首次定义

第 20 节 `SceneNode.hostPolicy: HostPolicy` 引用了 `HostPolicy`，但从未定义其形状。第 39 节定义的是**运行时权限档位**（ALLOWED / LIMITED / MUTED），本定义把它接到章节内容上。

```typescript
type HostPolicy = "ALLOWED" | "LIMITED" | "MUTED"
```

不做成对象包装（例如 `{ level: "..." }`），因为第 39 节本身就是一个三态枚举，没有携带额外参数的需求；包装会是无消费者的speculative extension。

### 使用面

`SceneNode.hostPolicy`、`BossPhase.hostPolicy`（`ADDENDUM-001 §A11`，Boss cinematic 应为 `MUTED`）均使用此类型。

---

## B4. `ResultDictionary` / `ResultEntry`——`results/` 目录的具体形状

第 22 节描述了 Result Dictionary 的**规则**（六等级必须显式覆盖，`mapsTo` 或 `unreachable`），`ADDENDUM-001 §A14` 定义了 `PlayerEffect` / `ViewerScope`，但两者从未被装进一个具体的**文件级 schema**。`ActionDefinition.resultSetId`（`ADDENDUM-001 §A4`）目前是悬空引用。

```typescript
type Quality = "DISASTER" | "FAILURE" | "COSTLY_SUCCESS" | "SUCCESS" | "GREAT_SUCCESS" | "SPECIAL"

type ResultEntry =
  | {
      quality: Quality
      resultId: string
      worldEffects: StateEffect[]        // ADDENDUM-001 §A6
      playerEffects: PlayerEffect[]      // ADDENDUM-001 §A14
      narrativeId: string                // → ResultNarrative.id，ADDENDUM-001 §A7
      visibility: "PUBLIC" | "DEFERRED"
    }
  | {
      quality: Quality
      mapsTo: Quality                    // 第 22 节：该等级不适用时的显式映射
    }
  | {
      quality: Quality
      unreachable: true                  // 第 22 节：该等级理论不可达
    }

type ResultDictionary = {
  id: string              // 被 ActionDefinition.resultSetId 引用
  entries: ResultEntry[]  // 必须覆盖全部六个 Quality，一个 quality 恰一条 entry
}
```

### Compiler 检查项（并入 PASS 4 Rule Coverage，归属 DEV-006，见 `DAG.md` CR-006）

- `entries` 恰好覆盖六个 `Quality`，无遗漏、无重复
- `mapsTo` 目标必须指向同一 `ResultDictionary` 内某条**非 `mapsTo`** 的 entry（禁止 `mapsTo` 链式指向另一个 `mapsTo`，避免间接死循环）
- 完整 entry 的 `resultId` 全局唯一（供 Event Log 与 Audio Cache 之类下游按 id 索引）

---

## B5. 落点

| 新增类型 | 归属模块（DEV-001 内部文件） |
|---|---|
| `DangerState` | `src/worldState.ts`（与 `WorldState`、`NPCState` 同处） |
| `HostPolicy` | `src/scene.ts` |
| `ResultEntry` / `ResultDictionary` / `Quality` | `src/result.ts`（与 `PlayerEffect`、`ViewerScope` 同处） |

`Quality` 此前散落在 `ADDENDUM-001 §A5`（`DiceProfile.qualityThresholds`）与 `§A14`（`ResolveResult` 引用）中以字面量重复出现，本稿起将其提升为具名类型 `Quality`，供 `DiceProfile`、`ResultDictionary` 共同引用，避免六个字符串字面量在多处重复定义后彼此漂移。这是纯粹的 DRY 整理，不改变任何字段语义。

---

## 6. 待独立决策（保持不变）

`CR-019`（getHealth 自落地起）不适用于 `packages/chapter-schema`——它是纯数据形状定义包，无运行时服务、无可报告的健康状态。已在 `TASK-PACKAGE-DEV-001` 中明确标注，防止误判为遗漏。
