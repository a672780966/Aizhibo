# DEV-000 DECISIONS

记录 T001–T010 施工过程中的环境性 / 配置性决策。无业务语义。

## D1 — 哈希计算改用 certutil（T002）

本会话 shell 中 PowerShell 的 `Get-FileHash` 不可用（环境故障，`ObjectNotFound`）。
改用 `certutil -hashfile <file> SHA256` 计算。两处哈希均已交叉验证一致，
详见 REPORT.md A07 备注。

## D2 — 依赖版本锁定（T003）

- `typescript@^5.9.3`：`pnpm add` 默认解析到 7.0.2（原生编译器），但
  `typescript-eslint@8.67.0` 的 peer 要求 `>=4.8.4 <6.1.0`，不兼容 TS7；
  5.9.3 满足任务包「≥ 5.6」要求，故锁定 5.9.x。
- `@types/node@^24`：环境运行时为 node 24，`@types/node@26` 类型超前，改为 ^24。
- 其余（eslint 10.8.1 / @eslint/js 10.0.1 / vitest 4.1.10 / prettier 3.9.6 /
  typescript-eslint 8.67.0）为 `pnpm add` 解析的最新版，均属第 9 节第 4 条白名单。

## D3 — `tsc -b --noEmit` 受支持，无需 fallback（T004）

TypeScript 5.9.3 原生接受 `tsc -b --noEmit`（退出码 0）。
任务包 T004 第 5 条的备用方案（独立 `tsconfig.typecheck.json`）无需启用。

## D4 — .prettierignore 覆盖范围（T006）

除任务包强制的 `specs/baseline/` 外，额外忽略：

- `specs/` 整体：其余 specs 目录（tasks/comms/protocol/audit 为 Commander 独占，
  dev 节点文档须与任务包逐字一致）均不得被格式化工具改写；
- `pnpm-lock.yaml`：pnpm 生成的锁文件，不应被 prettier 重新排版；
- `.claude/`：他方（Commander/AUDITOR）工具链文件。首次执行任务包规定的
  `pnpm format` 时 prettier 顺带重排了 `.claude/agents/project-auditor.md`
  （仅排版，frontmatter 与语义无损；当时尚无 git 提交、机器上无其他副本，
  无法还原原字节），故加入忽略，防止本地或 CI 再次改动。

## D5 — health.test.ts 随包编译（T005/T007）

任务包把 `packages/shared/src/health.test.ts` 放在包内 src/ 下，
故其被 `tsc -b` 一并编译与类型检查——`expectTypeOf` 断言因此被真实校验。
副作用：`packages/shared/dist/` 会包含 test 产物的 js/d.ts。
本包 `private: true` 且仅作仓库内共享，该副作用可接受，不设独立排除配置
（否则断言将脱离类型检查）。

## D6 — A07 独立佐证的搜索过程与结论（FIX-T01，消息 0007）

消息 0007 要求为 `specs/baseline/DEV_SPEC_V1.0.md` 的完整性搜索独立于
删除-归档操作链条之外的佐证。搜索过程（渠道清单、命令与逐渠道结论）
完整记录于 REPORT.md「T002 证据链补充（FIX-T01）」小节。

结论摘要：Windows VSS 无权限 / File History 未启用 / OneDrive 未同步
（桌面与 Music 均非重定向）/ PSReadLine 历史无记录；**找到**一条独立佐证——
Commander 会话转录（`a5bfaf5e-*.jsonl`，2026-08-16T07:39:05Z）中
对源文件的 Read tool_result，重建内容（34268 字节 / 3094 行）与归档
**逐字节一致**（sha256 均为 `137590f5...`），且该记录先于删除、由第三方
（Commander）产生。桌面副本按消息 0003 修订 8 第 4 条不重复使用为佐证。

