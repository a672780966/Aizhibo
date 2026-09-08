# DEV-073 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-073.md` 逐字抄录关键要求。
权威版本是 Task Package，不是本副本（协议 §1.4）。

1. 新建 `packages/asset-requirement-generator`，两个 workspace 依赖：
   `@interactive-story/chapter-compiler`、`@interactive-story/chapter-schema`，
   无第三方依赖。
2. `src/assetRequirements.ts`：`AssetRequirements` 接口（五个去重排序的
   `string[]` 字段：illustrations/expressions/frameSequences/bgm/voice）。
3. `src/extractAssetRequirements.ts`：纯函数，从 `SchemaValidationResult`
   提取五类资产 id，按 Task Package 第 1 节字段映射表。
4. `src/generateAssetRequirements.ts`：薄封装，真实调用
   `loadChapterPack`+`runSchemaValidation`，委托给 `extractAssetRequirements`。
5. `src/index.ts` barrel。
6. 不做可达性过滤；不做已生产/未生产比对。
7. 六条验证命令全部退出码 0，零回归。
8. 详见 Task Package 第 1、2、6、12 节。
