# DEV-064 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-064.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包 `platform-obs` 真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `noopObsControlPort` 的 `switchScene`/`getHealth` 恒定诚实失败 | 测试检查 |
| A08 | `ObsScene` 六个字面量值均可用 | 测试检查 |
| A09 | 无鉴权真实握手成功，`switchScene` 成功场景 `result:true` → `{ok:true}` | 测试检查 |
| A10 | 正确密码鉴权握手成功；客户端计算的鉴权值与官方算法独立计算值一致 | 测试检查 |
| A11 | 错误密码/需要鉴权但未配置密码，均诚实失败不悬挂 | 测试检查 |
| A12 | 请求超时诚实失败不悬挂；`requestStatus:{result:false,comment}` 透传为失败原因 | 测试检查 |
| A13 | 连接超时/失败诚实失败不悬挂 | 测试检查 |
| A14 | `getHealth()` 握手成功→OK、失败→DOWN 且 `error` 含原因 | 测试检查 |
| A15 | `createOptionalObsControlProvider` 未配置返回与 `noopObsControlPort` 同一引用；配置后走真实路径 | 测试检查 |
| A16 | 生产代码零第三方/workspace 依赖；`ws`/`@types/ws` 只在 `devDependencies` | 文件检查 |
| A17 | 未实现任何重连逻辑；未实现任何"何时切场景"判断；未实现真实 SAFETY region | 代码检查 |
| A18 | `error-registry`/`health-registry`/`watchdog`/`platform-twitch`/`runtime-kernel`/`operator-api`/`renderer` 均未被修改/import | git diff 比对 + 代码检查 |
| A19 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A20 | `specs/dev/DEV-064/` 节点文档齐全，`INDEX.md` T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-064: obs control (real OBS WebSocket v5 client, no reconnect, no failover decision logic)` | 命令 |
| A22 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交**；工作区无任何额外残留文件 | 命令 + `git status` 检查 |
| A23 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
