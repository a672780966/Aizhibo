import { CHAPTER_AUTHORING_SCHEMA_PROMPT } from '@interactive-story/chapter-authoring-prompts';

/**
 * 把调用方提供的章节创作意图简述（brief）拼接到 DEV-070 冻结的
 * CHAPTER_AUTHORING_SCHEMA_PROMPT 之后，构成发给章节生成 provider 的完整请求
 * 文本。本节点不做任何 schema 校验/normalize——那超出本节点职责（见
 * DECISIONS.md），这里只保证三条机械性质：返回值完整 includes 未改动的
 * schema prompt、完整 includes brief 原文、且 schema prompt 出现在 brief 之前
 * （AI 先读完整规则，再读具体需求）。
 *
 * brief 为空字符串或只含空白字符时抛出 Error——明确的失败而非静默通过，
 * 防止把一段没有创作意图的请求发给未来真实接入的 provider。
 */
export function buildChapterAuthoringRequest(brief: string): string {
  if (brief.trim().length === 0) {
    throw new Error(
      'buildChapterAuthoringRequest: brief must be a non-empty, non-whitespace string',
    );
  }
  return `${CHAPTER_AUTHORING_SCHEMA_PROMPT}

# Chapter Brief

Author a single chapter from the brief below. Your draft must strictly conform to the Chapter Authoring Instructions and the ChapterSchema above.

${brief}`;
}
