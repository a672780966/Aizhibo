# DEV-002 BLOCKERS

## BLK-001 — （结案）T002 #3 references 与 A02 typecheck 的 TS6310 现象

**状态**：CLOSED（2026-08-17，CORRECTION `0026` 撤回 EXECUTOR_QUERY `0025`）

### 现象

`tsc -b --noEmit`（`pnpm typecheck`）在 chapter-compiler 带包级 `references`、
且被引用项目（chapter-schema）`dist`/`tsbuildinfo` 陈旧或缺失（需重建）时，
报 `TS6310: Referenced project may not disable emit`。

### 结论（非缺陷，工具链行为）

- **先 `pnpm build` 再 `pnpm typecheck` 即退出码 0**，references 保持不变。
- 与并发会话 DECISIONS.md D10 记录一致；REPORT.md 六条命令全部退出码 0。
- 本 BLOCKER 不成立：不是 Task Package 内部矛盾，节点无 BLOCKED 转移。
