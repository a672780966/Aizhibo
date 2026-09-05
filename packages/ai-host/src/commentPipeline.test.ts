import { describe, expect, it } from 'vitest';
import { createCommentPipeline } from './commentPipeline.js';
import type { NormalizedChatMessage } from '@interactive-story/platform-core';

function msg(text: string, overrides: Partial<NormalizedChatMessage> = {}): NormalizedChatMessage {
  return {
    platform: 'twitch',
    viewerId: 'v1',
    messageId: 'm1',
    text,
    receivedAt: 1000,
    ...overrides,
  };
}

describe('createCommentPipeline', () => {
  it('drops a comment matching the denylist, it never becomes a candidate', () => {
    const pipeline = createCommentPipeline({ denylist: [/badword/i] });
    pipeline.ingest(msg('this has badword in it'));
    pipeline.ingest(msg('a totally different safe comment'));
    expect(pipeline.selectCandidate()?.message.text).toBe('a totally different safe comment');
  });

  it('drops a comment exceeding maxLength', () => {
    const pipeline = createCommentPipeline({ maxLength: 10 });
    pipeline.ingest(msg('this is way too long'));
    expect(pipeline.selectCandidate()).toBeUndefined();
  });

  it('clusters normalized-identical text together, incrementing count and updating latest', () => {
    const pipeline = createCommentPipeline();
    pipeline.ingest(msg('Hello There', { messageId: 'm1', receivedAt: 100 }));
    pipeline.ingest(msg('  hello there  ', { messageId: 'm2', receivedAt: 200 }));
    const candidate = pipeline.selectCandidate();
    expect(candidate?.clusterSize).toBe(2);
    expect(candidate?.message.messageId).toBe('m2');
  });

  it('keeps different texts as independent clusters of size 1', () => {
    const pipeline = createCommentPipeline();
    pipeline.ingest(msg('alpha'));
    pipeline.ingest(msg('beta'));
    expect(pipeline.selectCandidate()?.clusterSize).toBe(1);
  });

  it('selectCandidate picks the largest cluster, tie-broken by most recent message', () => {
    const pipeline = createCommentPipeline();
    pipeline.ingest(msg('alpha', { receivedAt: 100 }));
    pipeline.ingest(msg('beta', { receivedAt: 200 }));
    pipeline.ingest(msg('beta', { receivedAt: 300 }));
    const candidate = pipeline.selectCandidate();
    expect(candidate?.message.text).toBe('beta');
    expect(candidate?.clusterSize).toBe(2);
  });

  it('selectCandidate returns undefined when nothing has been ingested', () => {
    const pipeline = createCommentPipeline();
    expect(pipeline.selectCandidate()).toBeUndefined();
  });

  it('selectCandidate is read-only: repeated calls without ingest/clear return the same result', () => {
    const pipeline = createCommentPipeline();
    pipeline.ingest(msg('hello'));
    const first = pipeline.selectCandidate();
    const second = pipeline.selectCandidate();
    expect(second).toEqual(first);
  });

  it('evicts the lowest-priority cluster when maxPending is exceeded', () => {
    const pipeline = createCommentPipeline({ maxPending: 2 });
    pipeline.ingest(msg('alpha', { receivedAt: 100 }));
    pipeline.ingest(msg('alpha', { receivedAt: 100 }));
    pipeline.ingest(msg('beta', { receivedAt: 200 }));
    pipeline.ingest(msg('gamma', { receivedAt: 300 }));
    // alpha (count 2) must survive; beta (count 1, oldest) evicted over gamma (count 1).
    expect(pipeline.selectCandidate()?.message.text).toBe('alpha');
    expect(pipeline.selectCandidate()?.clusterSize).toBe(2);
    // Re-ingesting beta must create a FRESH count-1 cluster, proving the old one was removed.
    pipeline.ingest(msg('beta', { receivedAt: 400 }));
    expect(pipeline.selectCandidate()?.clusterSize).toBe(2); // alpha still wins
    // maxPending: 2 again exceeded after fresh beta cluster; verify alpha is not evicted.
    expect(pipeline.selectCandidate()?.message.text).toBe('alpha');
  });

  it('A11: count-equal clusters tie-break by latest receivedAt, not insertion order (regression for DEV-051-FIX-02)', () => {
    const pipeline = createCommentPipeline();
    pipeline.ingest(msg('beta', { receivedAt: 100 }));
    pipeline.ingest(msg('beta', { receivedAt: 200 }));
    pipeline.ingest(msg('alpha', { receivedAt: 300 }));
    pipeline.ingest(msg('alpha', { receivedAt: 400 }));
    const candidate = pipeline.selectCandidate();
    expect(candidate?.message.text).toBe('alpha');
    expect(candidate?.clusterSize).toBe(2);
  });

  it('A16: default maxPending is 100 — the 101st distinct text evicts the first-ingested cluster (regression for DEV-051-FIX-01)', () => {
    const pipeline = createCommentPipeline();
    // 不传 maxPending：101 条互不相同的文本，各成 count=1 独立簇。
    // 第 1 条 ingest 的文本必须已被淘汰（证明默认容量恰为 100，而非更大）。
    const first = msg('text-0');
    pipeline.ingest(first);
    for (let i = 1; i < 101; i += 1) {
      pipeline.ingest(msg(`text-${i}`));
    }
    expect(pipeline.selectCandidate()?.message.text).toBe('text-1');
    // 重新 ingest 第 1 条文本 → 生成全新 count=1 簇；若旧簇仍在则 count 会变 2。
    pipeline.ingest(msg('text-0'));
    expect(pipeline.selectCandidate()?.clusterSize).toBe(1);
  });

  it('A07: a stateful global regex drops both texts on consecutive ingests (lastIndex reset regression for DEV-051-FIX-01)', () => {
    const pipeline = createCommentPipeline({ denylist: [/badword/g] });
    // 第一段：'badword' 出现在索引 21-27（同 DEV-050A-FIX-02 构造），
    // 匹配后 lastIndex 变为 28。
    pipeline.ingest(msg('aaaaaaaaaaaaaaaaaaaa badword'));
    // 第二段：'badword' 在索引 0-6，早于遗留 lastIndex=28，末尾 z 填充保证
    // 从 28 往后搜索绝无命中。若 ingest() 忘记在每次 test() 前重置
    // pattern.lastIndex，第二段会被错误放行；重置则两条都被丢弃。
    pipeline.ingest(msg('badword zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'));
    expect(pipeline.selectCandidate()).toBeUndefined();
  });

  it('clear() empties all pending clusters, allowing fresh clustering afterward', () => {
    const pipeline = createCommentPipeline();
    pipeline.ingest(msg('hello'));
    pipeline.clear();
    expect(pipeline.selectCandidate()).toBeUndefined();
    pipeline.ingest(msg('world'));
    expect(pipeline.selectCandidate()?.clusterSize).toBe(1);
  });

  it('default maxLength (500) matches documented behavior', () => {
    const accept = createCommentPipeline();
    accept.ingest(msg('a'.repeat(500)));
    expect(accept.selectCandidate()?.clusterSize).toBe(1);

    const reject = createCommentPipeline();
    reject.ingest(msg('a'.repeat(501)));
    expect(reject.selectCandidate()).toBeUndefined();
  });
});
