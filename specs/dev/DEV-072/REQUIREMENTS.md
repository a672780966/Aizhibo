# DEV-072 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-072.md` 逐字抄录关键要求。
权威版本是 Task Package，不是本副本（协议 §1.4）。

1. 新建 `packages/ai-compiler-repair-loop`，`package.json` 唯一 workspace 依赖为
   `@interactive-story/chapter-compiler`，无第三方依赖。
2. `src/aiRepairPort.ts`：`AiRepairPort` 接口（`repairDraft`/`getHealth`）+
   `noopAiRepairPort` 诚实占位（同 DEV-071 先例）。
3. `src/buildRepairRequest.ts`：纯函数，`passed:true` 时抛错，否则转述
   `CompileResult` 全部非空问题数组的可读文本。
4. `src/runCompileRepairLoop.ts`：真实调用 `compile(rootDir)`，三态闭集决策
   `PASSED`/`REPAIR_UNAVAILABLE`/`REPAIR_NOT_APPLIED`，只跑一次，不写回磁盘、
   不重试。
5. `src/index.ts` barrel。
6. 不真实调用任何网络 API；不实现 Schema Normalizer；不做重试循环。
7. 六条验证命令全部退出码 0，零回归。
8. 详见 Task Package 第 2、3、6、12 节。
