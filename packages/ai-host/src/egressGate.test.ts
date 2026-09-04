import { describe, expect, it } from 'vitest';
import { createEgressGate, type EgressGateConfig } from './egressGate.js';
import type { ForbiddenLexicon } from '@interactive-story/chapter-compiler';

const lexicon: ForbiddenLexicon = {
  bySceneId: { 'scene-1': ['Boss Name'] },
  always: ['Secret Ending'],
};

function baseConfig(overrides: Partial<EgressGateConfig> = {}): EgressGateConfig {
  return { forbiddenLexicon: lexicon, ...overrides };
}

describe('createEgressGate', () => {
  it('C1: MUTED permission always drops, regardless of text content', () => {
    const gate = createEgressGate(baseConfig());
    const result = gate.attempt({
      text: 'hello',
      sceneId: 'scene-1',
      permission: 'MUTED',
    });
    expect(result).toEqual({ decision: 'DROP', rule: 'PERMISSION' });
  });

  it('C2: drops text containing an always-forbidden term, case/whitespace insensitive', () => {
    const gate = createEgressGate(baseConfig());
    const result = gate.attempt({
      text: ' the SECRET ending  ',
      sceneId: 'scene-1',
      permission: 'ALLOWED',
    });
    expect(result).toEqual({
      decision: 'DROP',
      rule: 'HIDDEN_LEXICON',
      matchedTerm: 'Secret Ending',
    });
  });

  it('C2: drops text containing a scene-specific forbidden term, does not drop for a different scene', () => {
    const gate = createEgressGate(baseConfig());
    const result = gate.attempt({
      text: 'I know the Boss Name',
      sceneId: 'scene-1',
      permission: 'ALLOWED',
    });
    expect(result).toEqual({
      decision: 'DROP',
      rule: 'HIDDEN_LEXICON',
      matchedTerm: 'Boss Name',
    });

    const freshGate = createEgressGate(baseConfig());
    const otherScene = freshGate.attempt({
      text: 'I know the Boss Name',
      sceneId: 'scene-2',
      permission: 'ALLOWED',
    });
    expect(otherScene).toEqual({ decision: 'ALLOW' });
  });

  it('C3: drops text matching a platformDenylist pattern', () => {
    const gate = createEgressGate(baseConfig({ platformDenylist: [/badword/i] }));
    const result = gate.attempt({
      text: 'this has BadWord in it',
      sceneId: 'scene-2',
      permission: 'ALLOWED',
    });
    expect(result).toEqual({
      decision: 'DROP',
      rule: 'PLATFORM_DENYLIST',
      matchedTerm: 'badword',
    });
  });

  it('C3: a stateful global regex correctly drops the same forbidden text on consecutive attempts (regression for DEV-050A-FIX-01)', () => {
    const pattern = /badword/g;
    const gate = createEgressGate(baseConfig({ platformDenylist: [pattern] }));

    // 第一段：'badword' 出现在索引 21-27（'aaaaaaaaaaaaaaaaaaaa badword' ——
    // 20 个 'a' + 1 个空格 + 'badword'），匹配后 lastIndex 变为 28。
    const first = gate.attempt({
      text: 'aaaaaaaaaaaaaaaaaaaa badword',
      sceneId: 'scene-x',
      permission: 'ALLOWED',
    });
    expect(first).toEqual({
      decision: 'DROP',
      rule: 'PLATFORM_DENYLIST',
      matchedTerm: 'badword',
    });

    // 第二段：'badword' 出现在索引 0-6（字符串开头），远早于遗留的
    // lastIndex=28；末尾填充一段不含 'badword' 的字符，确保从索引 28
    // 往后搜索绝对找不到任何命中。若修复被撤销（不重置 lastIndex），
    // 从 28 往后搜索这段文本会找不到开头的 'badword'，从而错误地判定
    // 未命中 → ALLOW（暴露 bug）；修复生效时会重置到 0，正确找到并
    // DROP。
    const second = gate.attempt({
      text: 'badword zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
      sceneId: 'scene-x',
      permission: 'ALLOWED',
    });
    expect(second).toEqual({
      decision: 'DROP',
      rule: 'PLATFORM_DENYLIST',
      matchedTerm: 'badword',
    });
  });

  it('A13: text dropped by MUTED permission does not pollute the C4 duplicate history', () => {
    const gate = createEgressGate(baseConfig());
    const dropped = gate.attempt({
      text: 'Hello World',
      sceneId: 'scene-1',
      permission: 'MUTED',
    });
    expect(dropped).toEqual({ decision: 'DROP', rule: 'PERMISSION' });

    const allowed = gate.attempt({
      text: 'Hello World',
      sceneId: 'scene-1',
      permission: 'ALLOWED',
    });
    expect(allowed).toEqual({ decision: 'ALLOW' });
  });

  it('A16: default C4 history capacity (20) and default C5 rate limit (5 per 60000ms) behave as documented', () => {
    // C4-capacity gate: recentLinesLimit intentionally left at its default
    // (20). rateLimit must be widened because the default 5-per-60000ms cap
    // (under the real clock) would DROP the 6th of the 20 consecutive lines
    // before the ring buffer ever fills — C4 capacity is the property under
    // test here, C5 is tested separately on gate2 below.
    const gate = createEgressGate(baseConfig({ rateLimit: { maxLines: 100, windowMs: 60000 } }));
    for (let i = 0; i < 20; i++) {
      const result = gate.attempt({
        text: `line-${i}`,
        sceneId: 'scene-1',
        permission: 'ALLOWED',
      });
      expect(result).toEqual({ decision: 'ALLOW' });
    }

    const repeatWithinWindow = gate.attempt({
      text: 'line-0',
      sceneId: 'scene-1',
      permission: 'ALLOWED',
    });
    expect(repeatWithinWindow).toEqual({ decision: 'DROP', rule: 'DUPLICATE' });

    const evictingLine = gate.attempt({
      text: 'line-20',
      sceneId: 'scene-1',
      permission: 'ALLOWED',
    });
    expect(evictingLine).toEqual({ decision: 'ALLOW' });

    const repeatAfterEviction = gate.attempt({
      text: 'line-0',
      sceneId: 'scene-1',
      permission: 'ALLOWED',
    });
    expect(repeatAfterEviction).toEqual({ decision: 'ALLOW' });

    const clock = { current: 0, now: () => clock.current };
    const gate2 = createEgressGate(baseConfig({ clock }));
    for (let i = 0; i < 5; i++) {
      clock.current = i * 100;
      const result = gate2.attempt({
        text: `rate-line-${i}`,
        sceneId: 'scene-1',
        permission: 'ALLOWED',
      });
      expect(result).toEqual({ decision: 'ALLOW' });
    }

    clock.current = 500;
    const sixth = gate2.attempt({
      text: 'rate-line-5',
      sceneId: 'scene-1',
      permission: 'ALLOWED',
    });
    expect(sixth).toEqual({ decision: 'DROP', rule: 'RATE_LIMIT' });

    clock.current = 60500;
    const seventh = gate2.attempt({
      text: 'rate-line-6',
      sceneId: 'scene-1',
      permission: 'ALLOWED',
    });
    expect(seventh).toEqual({ decision: 'ALLOW' });
  });

  it('C4: drops an exact repeat of a previously allowed line (normalized)', () => {
    const gate = createEgressGate(baseConfig());
    const first = gate.attempt({
      text: 'Hello There',
      sceneId: 'scene-2',
      permission: 'ALLOWED',
    });
    expect(first).toEqual({ decision: 'ALLOW' });

    const second = gate.attempt({
      text: '  HELLO there  ',
      sceneId: 'scene-2',
      permission: 'ALLOWED',
    });
    expect(second).toEqual({ decision: 'DROP', rule: 'DUPLICATE' });

    const third = gate.attempt({
      text: 'Something else',
      sceneId: 'scene-2',
      permission: 'ALLOWED',
    });
    expect(third).toEqual({ decision: 'ALLOW' });
  });

  it('C5: drops text exceeding maxLineLength', () => {
    const gate = createEgressGate(baseConfig({ maxLineLength: 10 }));
    const over = gate.attempt({
      text: 'a'.repeat(11),
      sceneId: 'scene-2',
      permission: 'ALLOWED',
    });
    expect(over).toEqual({ decision: 'DROP', rule: 'LENGTH' });

    const gate2 = createEgressGate(baseConfig({ maxLineLength: 10 }));
    const exact = gate2.attempt({
      text: 'a'.repeat(10),
      sceneId: 'scene-2',
      permission: 'ALLOWED',
    });
    expect(exact).toEqual({ decision: 'ALLOW' });
  });

  it('C5: drops when rate limit is exceeded within the window, recovers after the window', () => {
    const clock = { current: 0, now: () => clock.current };
    const gate = createEgressGate(
      baseConfig({ rateLimit: { maxLines: 2, windowMs: 1000 }, clock }),
    );

    const t1 = gate.attempt({
      text: 'first line',
      sceneId: 'scene-2',
      permission: 'ALLOWED',
    });
    expect(t1).toEqual({ decision: 'ALLOW' });

    clock.current = 100;
    const t2 = gate.attempt({
      text: 'second line',
      sceneId: 'scene-2',
      permission: 'ALLOWED',
    });
    expect(t2).toEqual({ decision: 'ALLOW' });

    clock.current = 200;
    const t3 = gate.attempt({
      text: 'third line',
      sceneId: 'scene-2',
      permission: 'ALLOWED',
    });
    expect(t3).toEqual({ decision: 'DROP', rule: 'RATE_LIMIT' });

    clock.current = 1300;
    const t4 = gate.attempt({
      text: 'fourth line',
      sceneId: 'scene-2',
      permission: 'ALLOWED',
    });
    expect(t4).toEqual({ decision: 'ALLOW' });
  });

  it('DROP attempts do not count toward C4 duplicate history or C5 rate limit', () => {
    const gate = createEgressGate(baseConfig({ rateLimit: { maxLines: 1, windowMs: 10000 } }));

    for (let i = 0; i < 3; i++) {
      const dropped = gate.attempt({
        text: 'same muted text',
        sceneId: 'scene-2',
        permission: 'MUTED',
      });
      expect(dropped).toEqual({ decision: 'DROP', rule: 'PERMISSION' });
    }

    const allowed = gate.attempt({
      text: 'brand new text',
      sceneId: 'scene-2',
      permission: 'ALLOWED',
    });
    expect(allowed).toEqual({ decision: 'ALLOW' });
  });

  it('checks run in C1->C5 order: the earliest applicable rule wins when multiple would apply', () => {
    const gate = createEgressGate(baseConfig({ maxLineLength: 5 }));
    const result = gate.attempt({
      text: 'Secret Ending is long',
      sceneId: 'scene-2',
      permission: 'ALLOWED',
    });
    expect(result).toEqual({
      decision: 'DROP',
      rule: 'HIDDEN_LEXICON',
      matchedTerm: 'Secret Ending',
    });
  });

  it('default config values match the documented defaults (20 lines / 200 chars / 5-per-60000ms)', () => {
    // Length default (maxLineLength=200) verified directly: boundary is
    // strictly greater-than, so 200 chars ALLOW, 201 chars DROP.
    const gate = createEgressGate(baseConfig());
    const exact = gate.attempt({
      text: 'a'.repeat(200),
      sceneId: 'scene-2',
      permission: 'ALLOWED',
    });
    expect(exact).toEqual({ decision: 'ALLOW' });

    const over = gate.attempt({
      text: 'b'.repeat(201),
      sceneId: 'scene-2',
      permission: 'ALLOWED',
    });
    expect(over).toEqual({ decision: 'DROP', rule: 'LENGTH' });

    // Rate default (5 per 60000ms) and duplicate-history default (20 lines)
    // are exercised implicitly elsewhere; length boundary suffices here.
  });
});
