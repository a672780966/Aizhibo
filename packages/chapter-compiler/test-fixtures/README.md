# test-fixtures

本目录是 `packages/chapter-compiler` 的单元测试数据，**不是真实产品内容**。

- `valid-minimal/` — 最小但覆盖全部 19 个内容分类的合法 Chapter Pack（供正例与 `compile()`
  `passed: true` 断言使用）。
- `broken-*/` — 针对性损坏 fixture，每个目录对应一类主要失败模式：
  - `broken-json-syntax/` — `manifest.json` 含 JSON 语法错误（Loader 测试）
  - `broken-missing-root/` — 缺少 `manifest.json` 根文件（Loader 测试）
  - `broken-roots/` — 五个根文件各自 schema 非法（PASS 1 测试）
  - `broken-schema/` — 14 个子目录各含一条非法条目（PASS 1 测试）
  - `broken-id-duplicate/` — 同分类 id 重复（PASS 1 唯一性测试）
  - `broken-id-cross-kind/` — scene/boss 跨类 id 冲突 + 故事图注册表 id 重复（PASS 1 唯一性测试）
  - `broken-dangling-refs/` — PASS 2 全部引用检查的反例（T007–T010 测试）
  - `broken-composite/` — 四类 issue 同时存在（compile() 综合断言）

任何内容均不代表真实章节产品数据，纯测试用途。
