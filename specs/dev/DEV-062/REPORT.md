# DEV-062 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

T001–T002 全部完成（本节点为 M6 第三个节点，Error Registry）。Dev
Spec 第 62 节本身零正文（第 2726-2727 行只有标题），DAG.md 备注为
空——唯一权威范围来自第 56 节"故障等级"（`L1`–`L4` 封闭四值 +
每级一句处理方针）。T001 的四份节点文档由 Commander 的 dispatch
提交（2d83617）建立，内容与 Task Package 一致，本次逐字核对确
认，未改动（仅按 T002 更新 INDEX.md 勾选与 Status、填写
REPORT.md）。

**T002 — `packages/error-registry`（新包，本次提交主体）：**

- `package.json`：以 `packages/health-registry/package.json` 为结
  构模板，name 为 `@interactive-story/error-registry`，**零依赖**：
  `dependencies` 字段整体省略——仓库里零依赖包的既有惯例是省略
  字段而非空对象（对照 `audio-engine`/`shared`/`platform-core` 均
  无 dependencies 字段；health-registry 之所以有该字段是因为它真
  依赖 shared 的 `Health` 类型）。
- `tsconfig.json`：与 health-registry 逐字一致（extends
  `../../tsconfig.base.json`，outDir dist / rootDir src，include
  `src/**/*`）。
- `src/errorRegistry.ts`（零 import，不依赖任何 workspace 包）：
  - `ErrorLevel = 'L1' | 'L2' | 'L3' | 'L4'`——第 56 节明确给出
    的封闭四值集合，抄录规范原文（D1）。
  - `ErrorRecordInput`（`level`/`category`/`message` 三必填字段；
    `category` 为自由文本 string，非封闭枚举）、`ErrorRecord`
    （继承 Input + `id` + `timestamp`）、`ErrorRegistry`
    （`record(input): ErrorRecord` / `list(): readonly
    ErrorRecord[]`）。
  - `createErrorRegistry()`：闭包内私有 `records: ErrorRecord[]` 与
    `counter = 0`（均不暴露）；`record(input)` 先 `counter += 1`，
    再以 `{ ...input, id: \`err-${counter}\`, timestamp:
    new Date().toISOString() }` 构造新记录，`push` 后返回该对象；
    `list()` 返回 `records.slice()` 副本（非内部数组引用）。
- `src/index.ts`：一行 barrel：`export * from
  './errorRegistry.js'`。
- `src/errorRegistry.test.ts`：6 个独立测试用例（见第 4 节测试计
  数与 A07–A12 逐条）。
- 根 `tsconfig.json`：references 数组末尾（health-registry 之后）
  追加 `{ "path": "./packages/error-registry" }`，使 `tsc -b` 真正
  构建新包。
- `pnpm-lock.yaml`：新增 `packages/error-registry: {}` importer（零
  依赖包仅追加空 importer 条目）。

**未做（按 Task Package 明示）：** 不实现第 56 节任何一级的"处理"
方针（L1 忽略/L2 降级/L3 自动恢复/L4 Failover+Operator，分别属于
DEV-023 或未来 DEV-063/065/066/067，D2）；`category` 不做封闭枚举
与 category→level 推断（D1）；不接入 persistence、不新建任何 HTTP
端点（D3）；零 workspace 依赖、零第三方依赖、零其他包改动。

## 3. Changed Files

新增：
- `packages/error-registry/package.json`
- `packages/error-registry/tsconfig.json`
- `packages/error-registry/src/index.ts`
- `packages/error-registry/src/errorRegistry.ts`
- `packages/error-registry/src/errorRegistry.test.ts`
- `specs/dev/DEV-062/DECISIONS.md`

修改：
- `tsconfig.json`（根，references 末尾追加 error-registry 一条）
- `pnpm-lock.yaml`（error-registry importer）
- `specs/dev/DEV-062/INDEX.md`（T001–T002 勾选，Status →
  READY_FOR_REVIEW）
- `specs/dev/DEV-062/REPORT.md`（本文）

T001 四份节点文档（INDEX/REQUIREMENTS/ACCEPTANCE/REPORT）来自
Commander dispatch 提交，本次仅更新 INDEX.md 与填写 REPORT.md；
REQUIREMENTS.md / ACCEPTANCE.md 内容与 Task Package 核对一致，
无需改动。

## 4. Tests Executed

全部为 `pnpm <cmd>`，退出码逐一记录：

| # | 命令 | 退出码 |
|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | 0（首次即通过，pnpm 将新包空 importer 记入 pnpm-lock.yaml；复跑 frozen 亦 0） |
| 2 | `pnpm typecheck` | 0 |
| 3 | `pnpm lint` | 0 |
| 4 | `pnpm format:check` | 0（首跑报我的 2 个新文件不合规——tsconfig.json 我误按单行写、测试文件一处折行——`prettier --write` 就地修正后复跑 0） |
| 5 | `pnpm build` | 0 |
| 6 | `pnpm test` | 0 |

`pnpm test`：132 test files / 771 tests 全部通过（零回归；DEV-061
基线 131 files / 765 tests）。新增 1 个测试文件 6 个测试
（765 → 771）：`errorRegistry.test.ts`（6），用例清单：
（1）`record({level:'L1', category:'Host LLM error', message:'no
provider configured'})` → 返回记录 level/category/message 与输入
逐一相等、`id` 非空（且匹配 `err-\d+` 格式）、`timestamp` 满足
`new Date(x).toISOString() === x` 往返（合法 ISO 8601）；
（2）同一 registry 连续三次 `record()`（L1/L2/L3 各一）→ 三个
`id` 两两不同；
（3）全新 registry 在未 `record()` 前 `list()` → `[]`；
（4）连续两次 `record()`（message 分别为 first/second）→
`list()` 长度 2 且 [0] 对应第一次调用、[1] 对应第二次（顺序保
持）；
（5）`list()` 返回值先 `.push()` 一条伪造记录再 `.length = 0` 清
空 → 再次 `list()` 仍只含真实记录（副本独立性证明）；
（6）`L1`/`L2`/`L3`/`L4` 各 `record()` 一次（category/message
各异）→ `list()` 四条记录 level 与输入逐一对应。

## 5. Acceptance Results

| # | 判定 | 结果 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS（0；首次 `--frozen-lockfile` 即通过，lockfile 已含 `packages/error-registry: {}` importer，复跑 frozen 亦 0） |
| A02 | `pnpm typecheck` 退出码 0（含新包 error-registry 真正被 tsc -b 构建） | PASS（0；`tsc -b` 输出含 error-registry，`packages/error-registry/dist/` 已生成 index.js/errorRegistry.js/.d.ts） |
| A03 | `pnpm lint` 退出码 0 | PASS（0） |
| A04 | `pnpm format:check` 退出码 0 | PASS（0；首跑 1，`prettier --write` 修正本节点 2 个新文件后复跑 0） |
| A05 | `pnpm build` 退出码 0 | PASS（0） |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | PASS（0，132 files / 771 tests，765 → 771 恰为新包 6 测试） |
| A07 | `record()` 返回值输入字段透传 + id 非空 + timestamp 合法 ISO 字符串 | PASS（测试 1：level/category/message 逐一 `toBe` 相等；`id` 非空且匹配 `err-\d+`；`new Date(timestamp).toISOString() === timestamp`） |
| A08 | 连续三次 `record()` 的 id 两两不同 | PASS（测试 2：三对 `not.toBe` 断言） |
| A09 | 未调用 `record()` 前 `list()` 返回空数组 | PASS（测试 3：`expect(registry.list()).toEqual([])`） |
| A10 | 连续两次 `record()` 后 `list()` 长度为 2 且顺序与调用顺序一致 | PASS（测试 4：`toHaveLength(2)`，`[0].message`=first、`[1].message`=second） |
| A11 | `list()` 返回值是副本，外部变更不影响内部状态 | PASS（测试 5：对返回值 `.push()` 伪造记录 + `.length = 0` 清空后，再次 `list()` 仍 `toHaveLength(1)` 且只含真实记录） |
| A12 | `L1`/`L2`/`L3`/`L4` 四个等级各记录一次均可用，level 字段逐一对应 | PASS（测试 6：四输入各 record 一次，`list()` 四条记录的 level/category 与输入数组逐索引对应） |
| A13 | 未新增第三方 npm 依赖，package.json 无 workspace 依赖 | PASS（error-registry/package.json **无 `dependencies` 字段**（省略，同 audio-engine/shared/platform-core 惯例）；源码零 import） |
| A14 | 除本节点 Writable Scope 外任何既有文件均未被修改 | PASS（git add 显式文件清单仅含第 3 节列出的新增/修改；`git diff HEAD` 无其他内容改动） |
| A15 | 未实现第 56 节任何一级的处理逻辑；category 非封闭枚举；未接入 persistence/HTTP | PASS（errorRegistry.ts 仅数组追加 + 自增 id + slice 副本，无任何处理分支；category 为 string；零 persistence/网络代码） |
| A16 | DECISIONS.md 存在，覆盖第 6 节列出的全部要点 | PASS（D1–D4 逐一对应四个"为何"：category 自由文本非枚举/不做推断、只记录不处理、零依赖不接 persistence、id/timestamp 自增+toISOString 不注入 clock） |
| A17 | 节点文档齐全，INDEX.md T001–T002 全部勾选，Status 改为 READY_FOR_REVIEW | PASS（见第 6 节 INDEX 勾选） |
| A18 | git log 新增恰 1 条提交，首行 `DEV-062: error registry (record-only, L1-L4 closed level type, free-text category, no handling logic)` | PASS（见第 7 节） |
| A19 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但未提交 | PASS（0296 NODE_REPORT 与 LEDGER 追加行已写入工作区未提交；见第 8 节） |
| A20 | PROJECT_INDEX / DAG / tasks / audit / protocol 均未被修改 | PASS（git add 显式文件清单不含上述任何路径） |

## 6. Scope Check

- Writable Scope：T002 全部文件真实改动（新增 6 + 修改 4：根
  tsconfig.json / pnpm-lock.yaml / REPORT.md / INDEX.md，见第 3
  节）；`specs/dev/DEV-062/` 下 INDEX / REPORT / DECISIONS 更新或
  创建（REQUIREMENTS.md、ACCEPTANCE.md 由 T001 在 Commander
  dispatch 提交 2d83617 中已存在，内容与 Task Package 核对一致，
  本次无需改动）。
- Read-only Scope：`specs/baseline/DEV_SPEC_V1.0.md` 第 56 节
  （1968-2025 行）只读作为范围依据；health-registry 的
  package.json/tsconfig.json 仅作结构模板参照，零改动；未读取任何
  包源码作为实现依据。
- Forbidden Scope：未修改任何既有文件（除本节点 Writable Scope
  内）；未接入 packages/persistence；未新建 HTTP 端点；未接入
  operator-api；未实现第 56 节任何一级处理方针；category 非封闭枚
  举、无 category→level 推断逻辑；未新增第三方 npm 依赖。
- 本节点 Writable Scope 之外不需要任何改动即可推进，无越权操作，
  未触发 EXECUTOR_QUERY。

## 7. Commit

恰 1 条提交，首行：`DEV-062: error registry (record-only, L1-L4 closed level type, free-text category, no handling logic)`

`git add` 仅含显式文件清单（不使用 `git add -A` / `git add .`）：
`packages/error-registry/package.json`、
`packages/error-registry/tsconfig.json`、
`packages/error-registry/src/index.ts`、
`packages/error-registry/src/errorRegistry.ts`、
`packages/error-registry/src/errorRegistry.test.ts`、根
`tsconfig.json`、`pnpm-lock.yaml`、
`specs/dev/DEV-062/{INDEX,REPORT,DECISIONS}.md`（不含 dist /
node_modules / *.tsbuildinfo）。

**未包含**在本次提交中：`specs/comms/LEDGER.md` 追加行与
`specs/comms/0296-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-062.md` 消息
文件——两者已写入工作区，保持未提交，留给 Commander 收尾统一处
理。

## 8. Handoff

- 节点产出：新包 `packages/error-registry`（`ErrorLevel` 封闭四值 +
  `ErrorRecordInput`/`ErrorRecord`/`ErrorRegistry`/
  `createErrorRegistry` 记录原语：闭包私有数组与自增计数、record
  追加式写入返回完整记录、list 返回 slice 副本）+ 6 项单测，已随
  恰 1 条提交入库。
- DECISIONS.md（D1–D4）已随实现提交入库，覆盖 Task Package 第 6
  节全部四个"为何"要点。
- 按任务指令，本次实现提交本身**不含** `specs/comms/LEDGER.md` 或
  NODE_REPORT 消息文件；对应 `0296` NODE_REPORT 与 LEDGER 追加行已
  写入工作区但未提交（msg_id 取当前 LEDGER 最大序号 0295 + 1）。
- 验证六条命令全部退出码 0；`git log -1` 只看到这一条新提交；git
  status 确认 LEDGER 改动与 NODE_REPORT 消息文件仍存在但未提交、
  工作区无任何残留临时文件（Commander dispatch 遗留的
  `.tmp_dev062_prompt.txt` 已清除——DEV-061 MAJOR-01 同类残留曾致
  audit FAIL）。
- 未推进到任何下一 DEV Node（M6 后续节点由 Commander 裁决）。
