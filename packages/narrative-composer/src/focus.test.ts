import { describe, expect, it } from 'vitest';
import type { ResultNarrative } from '@interactive-story/chapter-schema';
import { categorizeFocus } from './focus.js';

function narrative(
  id: string,
  priority: number,
  category: string,
  urgency: ResultNarrative['focus']['urgency'],
): ResultNarrative {
  return {
    id,
    primaryBlockId: `primary-${id}`,
    focus: { priority, category, urgency },
  };
}

describe('categorizeFocus (T004)', () => {
  it('single entry -> that entry is PRIMARY, all other tiers empty', () => {
    const n = narrative('a', 5, 'FIGHT', 'NONE');
    const r = categorizeFocus([n]);
    expect(r.primary).toBe(n);
    expect(r.support).toEqual([]);
    expect(r.context).toEqual([]);
    expect(r.deferred).toEqual([]);
  });

  it('same category others -> SUPPORT', () => {
    const a = narrative('a', 10, 'FIGHT', 'NONE');
    const b = narrative('b', 3, 'FIGHT', 'NONE');
    const c = narrative('c', 2, 'FIGHT', 'LOW');
    const r = categorizeFocus([a, b, c]);
    expect(r.primary).toBe(a);
    expect(r.support.map((x) => x.id).sort()).toEqual(['b', 'c']);
    expect(r.context).toEqual([]);
    expect(r.deferred).toEqual([]);
  });

  it('different category but urgent -> CONTEXT', () => {
    const a = narrative('a', 10, 'FIGHT', 'NONE');
    const b = narrative('b', 3, 'TALK', 'LOW');
    const c = narrative('c', 2, 'TALK', 'HIGH');
    const r = categorizeFocus([a, b, c]);
    expect(r.primary).toBe(a);
    expect(r.support).toEqual([]);
    expect(r.context.map((x) => x.id).sort()).toEqual(['b', 'c']);
    expect(r.deferred).toEqual([]);
  });

  it('different category and not urgent -> DEFERRED', () => {
    const a = narrative('a', 10, 'FIGHT', 'NONE');
    const d = narrative('d', 1, 'REACTION', 'NONE');
    const r = categorizeFocus([a, d]);
    expect(r.primary).toBe(a);
    expect(r.support).toEqual([]);
    expect(r.context).toEqual([]);
    expect(r.deferred.map((x) => x.id)).toEqual(['d']);
  });

  it('mixed tiers: support, context and deferred each resolved correctly', () => {
    const a = narrative('a', 10, 'FIGHT', 'NONE'); // primary
    const s = narrative('s', 4, 'FIGHT', 'NONE'); // support (same category)
    const c = narrative('c', 3, 'TALK', 'MEDIUM'); // context (diff category, urgent)
    const d = narrative('d', 1, 'REACTION', 'NONE'); // deferred
    const r = categorizeFocus([a, s, c, d]);
    expect(r.primary).toBe(a);
    expect(r.support.map((x) => x.id)).toEqual(['s']);
    expect(r.context.map((x) => x.id)).toEqual(['c']);
    expect(r.deferred.map((x) => x.id)).toEqual(['d']);
  });

  it('tie on highest priority -> earliest array entry is PRIMARY (deterministic)', () => {
    const a = narrative('a', 10, 'TALK', 'NONE');
    const b = narrative('b', 10, 'FIGHT', 'NONE');
    const r = categorizeFocus([a, b]);
    expect(r.primary).toBe(a);
    const r2 = categorizeFocus([b, a]);
    expect(r2.primary).toBe(b);
  });

  it('empty input throws a descriptive error (the one allowed throw)', () => {
    expect(() => categorizeFocus([])).toThrow(/at least one/);
  });
});
