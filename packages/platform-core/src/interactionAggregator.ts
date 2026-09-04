import type { NormalizedChatMessage } from './index.js';

/** 本地镜像 runtime-kernel 冻结的 Vote 形状（viewerId/choiceId）。
 * platform-core 是被 runtime-kernel 消费的中立层，不能反向依赖它，
 * 与 DEV-035/037/040 对 Health/Clock 的处理方式一致。 */
export interface Vote {
  viewerId: string;
  choiceId: string;
}

export interface InteractionAggregator {
  /** 与 runtime-kernel 冻结的 PlatformPort.onVote 同形状，供未来编排节点
   *  直接复用；本节点不接入 runtime-kernel，只保证签名兼容。 */
  onVote(handler: (vote: Vote) => void): void;
  /** 喂入一条已归一化的聊天消息；若 text 精确匹配 A/B/C/D（trim+大写）
   *  则合成 Vote 并调用已注册的 handler，否则静默忽略。 */
  ingest(message: NormalizedChatMessage): void;
}

const VALID_CHOICES = new Set(['A', 'B', 'C', 'D']);

/**
 * Interaction Aggregator（DEV-044）：把归一化聊天消息解析为 A/B/C/D
 * 投票。解析规则窄化：`text.trim().toUpperCase()` 精确等于
 * `'A'`/`'B'`/`'C'`/`'D'` 之一才算有效投票，其余（`'hello'`、`'AB'`、
 * 空字符串等）一律静默忽略——不做模糊匹配/自然语言理解（Dev Spec 未
 * 要求）。`onVote` 为覆盖式单一注册（与冻结的 `PlatformPort.onVote`
 * 语义一致）：未注册 handler 时 `ingest` 同样静默忽略、不抛异常。
 * 不做去重（DEV-043 已在更上游的 notification 层完成）、不做多次投票
 * 限制/频率限制（Dev Spec 未要求，属未来可能的扩展）。零第三方依赖，
 * 纯字符串比较。
 */
export function createInteractionAggregator(): InteractionAggregator {
  let voteHandler: ((vote: Vote) => void) | undefined;

  return {
    onVote(handler) {
      voteHandler = handler;
    },

    ingest(message) {
      if (voteHandler === undefined) {
        return;
      }
      const choiceId = message.text.trim().toUpperCase();
      if (!VALID_CHOICES.has(choiceId)) {
        return;
      }
      voteHandler({ viewerId: message.viewerId, choiceId });
    },
  };
}
