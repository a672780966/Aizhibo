import { describe, expect, it } from 'vitest';
import { getHostPersona } from './hostPersona.js';

// Dev Spec 第 36 节 AI Host 职责列表（voiceDescription 默认文案的唯一权威来源）
const REQUIRED_DUTY_PHRASES = [
  '回复弹幕',
  '主动评论',
  '点名',
  '吐槽行动组',
  '评论骰子',
  '提醒互动',
  '缓解冷场',
  '建立直播间内部梗',
] as const;

describe('getHostPersona', () => {
  it('returns a HostPersona with a non-empty name', () => {
    expect(getHostPersona().name).toBeTruthy();
  });

  it('returns a HostPersona with a non-empty voiceDescription', () => {
    expect(getHostPersona().voiceDescription).toBeTruthy();
  });

  it('returns identical content across repeated calls (static constant, not random)', () => {
    const first = getHostPersona();
    const second = getHostPersona();
    expect(second.name).toBe(first.name);
    expect(second.voiceDescription).toBe(first.voiceDescription);
  });

  it('covers every duty phrase from Dev Spec section 36 in voiceDescription', () => {
    const { voiceDescription } = getHostPersona();
    for (const phrase of REQUIRED_DUTY_PHRASES) {
      expect(voiceDescription).toContain(phrase);
    }
  });
});
