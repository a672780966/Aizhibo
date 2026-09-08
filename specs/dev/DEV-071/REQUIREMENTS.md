# DEV-071 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-071.md` 逐字抄录关键要求。
权威版本是 Task Package，不是本副本（协议 §1.4）。

1. 新建 `packages/ai-chapter-generator`，`package.json` 唯一 workspace 依赖为
   `@interactive-story/chapter-authoring-prompts`，无第三方依赖。
2. `src/aiChapterGeneratorPort.ts`：`AiChapterGeneratorPort` 接口
   （`generateDraft(requestText): Promise<ChapterDraftResult>` +
   `getHealth(): Promise<Health>`）+ `noopAiChapterGeneratorPort` 诚实占位
   实现（恒定 `ok:false`/`DOWN`，与输入无关）。
3. `src/buildChapterAuthoringRequest.ts`：纯函数，import
   `CHAPTER_AUTHORING_SCHEMA_PROMPT`，拼接 brief，空/空白 brief 抛错，
   schema prompt 必须在 brief 之前完整出现。
4. `src/index.ts` barrel。
5. 不真实调用任何网络 API；不实现 Schema Normalizer/Compiler/AI Repair Loop。
6. 六条验证命令全部退出码 0，零回归。
7. 详见 Task Package 第 2、3、6、12 节。
