import type { NormalizedChatMessage } from '@interactive-story/platform-core';

export interface CommentPipelineConfig {
  /** 注入式黑名单（同 DEV-050A C3 模式），命中即在 Safety 阶段丢弃。 */
  denylist?: RegExp[];
  /** 单条评论长度上限，超过视为垃圾信息丢弃。缺省 500。 */
  maxLength?: number;
  /** 同时保留的最大簇数。缺省 100。 */
  maxPending?: number;
}

export interface SelectedComment {
  message: NormalizedChatMessage;
  clusterSize: number;
}

export interface CommentPipeline {
  /** Safety 检查 + 归一化聚类；不安全或超限的评论直接丢弃。 */
  ingest(message: NormalizedChatMessage): void;
  /** 只读地返回当前优先级最高的候选；无任何待选簇时返回 undefined。 */
  selectCandidate(): SelectedComment | undefined;
  /** 清空全部待选簇。 */
  clear(): void;
}

/** 内部聚类表条目：同簇累计计数 + 簇内最新一条消息。 */
interface CommentCluster {
  count: number;
  latest: NormalizedChatMessage;
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function createCommentPipeline(config: CommentPipelineConfig = {}): CommentPipeline {
  const denylist = config.denylist ?? [];
  const maxLength = config.maxLength ?? 500;
  const maxPending = config.maxPending ?? 100;
  const clusters = new Map<string, CommentCluster>();

  function evictIfOverCapacity(): void {
    if (clusters.size <= maxPending) return;
    let worstKey: string | undefined;
    let worst: CommentCluster | undefined;
    for (const [key, cluster] of clusters) {
      if (
        worst === undefined ||
        cluster.count < worst.count ||
        (cluster.count === worst.count && cluster.latest.receivedAt < worst.latest.receivedAt)
      ) {
        worst = cluster;
        worstKey = key;
      }
    }
    if (worstKey !== undefined) {
      clusters.delete(worstKey);
    }
  }

  return {
    ingest(message) {
      if (message.text.length > maxLength) return;
      for (const pattern of denylist) {
        pattern.lastIndex = 0;
        if (pattern.test(message.text)) return;
      }
      const key = normalize(message.text);
      const existing = clusters.get(key);
      if (existing !== undefined) {
        existing.count += 1;
        existing.latest = message;
      } else {
        clusters.set(key, { count: 1, latest: message });
        evictIfOverCapacity();
      }
    },
    selectCandidate() {
      let best: CommentCluster | undefined;
      for (const cluster of clusters.values()) {
        if (
          best === undefined ||
          cluster.count > best.count ||
          (cluster.count === best.count && cluster.latest.receivedAt > best.latest.receivedAt)
        ) {
          best = cluster;
        }
      }
      if (best === undefined) return undefined;
      return { message: best.latest, clusterSize: best.count };
    },
    clear() {
      clusters.clear();
    },
  };
}
