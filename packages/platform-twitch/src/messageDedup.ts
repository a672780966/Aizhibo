import type { TwitchChatNotification } from './eventSubClient.js';

export interface MessageDeduplicator {
  /** 返回 true 表示这个 messageId 之前见过（重复，应丢弃）；
   *  返回 false 表示第一次见到（同时记录下来）。 */
  seen(messageId: string): boolean;
}

export interface MessageDeduplicatorConfig {
  /** 最多记住多少个近期 messageId，超过后按先进先出淘汰最旧的。 */
  maxSize?: number; // 默认 1000
}

const DEFAULT_MAX_SIZE = 1000;

/**
 * 有界内存去重（DEV-043，Dev Spec 第 44 节：EventSub 至少一次投递，相同
 * notification 可能重复）。`Set`（O(1) 查找）+ FIFO 数组记录插入顺序：
 * 已见过的 id 返回 `true` 且**不重新插入**（重复不算"最近"，不续命）；
 * 首次见到的 id 插入集合与队列尾部，超过 `maxSize` 淘汰队列头部最旧的
 * 一个（同步从 `Set` 删除）。纯内存、不持久化——EventSub 重复投递是短
 * 时间窗口内的网络层重试，进程重启后窗口重置是合理边界。
 */
export function createMessageDeduplicator(config?: MessageDeduplicatorConfig): MessageDeduplicator {
  const maxSize = config?.maxSize ?? DEFAULT_MAX_SIZE;
  const seenIds = new Set<string>();
  const order: string[] = [];

  return {
    seen(messageId) {
      if (seenIds.has(messageId)) {
        return true;
      }
      seenIds.add(messageId);
      order.push(messageId);
      if (order.length > maxSize) {
        const oldest = order.shift();
        if (oldest !== undefined) {
          seenIds.delete(oldest);
        }
      }
      return false;
    },
  };
}

/**
 * 把 `onNotification` 回调包上去重：重复 `messageId` 的 notification 直接
 * 丢弃（不调用 `handler`），首次见到的才透传给 `handler`。包装的是
 * DEV-041 的 notification 层（通用于全部订阅类型），不是
 * `ChatHandler`/`NormalizedChatMessage` 层。不传 `deduplicator` 时内部
 * 创建一个默认 `maxSize=1000` 的。组合用法：
 * `createEventSubClient({ onNotification: createDedupingOnNotification(handler) })`。
 */
export function createDedupingOnNotification(
  handler: (notification: TwitchChatNotification) => void,
  deduplicator?: MessageDeduplicator,
): (notification: TwitchChatNotification) => void {
  const seen = deduplicator ?? createMessageDeduplicator();
  return (notification) => {
    if (!seen.seen(notification.messageId)) {
      handler(notification);
    }
  };
}
