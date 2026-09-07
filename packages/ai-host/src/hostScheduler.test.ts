import { describe, expect, it } from 'vitest';
import { decideHostScheduling } from './hostScheduler.js';
import type { HostSchedulingFactors } from './hostScheduler.js';

/** 基线因子：除被测字段外均为中性取值。 */
function baseFactors(overrides: Partial<HostSchedulingFactors> = {}): HostSchedulingFactors {
  return {
    currentStoryPhase: 'idle',
    chatVelocity: 0,
    conversationContinuity: false,
    audioChannelBusy: false,
    ...overrides,
  };
}

describe('decideHostScheduling — audioChannelBusy=true 抢占规则（Story Audio > Host Audio）', () => {
  it('returns canSpeak:false / reason:audioChannelBusy when the audio channel is busy', () => {
    const decision = decideHostScheduling(baseFactors({ audioChannelBusy: true }));
    expect(decision).toEqual({ canSpeak: false, reason: 'audioChannelBusy' });
  });

  it('audioChannelBusy=true wins even with factors that look like the Host should speak', () => {
    const decision = decideHostScheduling(
      baseFactors({
        audioChannelBusy: true,
        currentStoryPhase: 'climax',
        chatVelocity: 10_000,
        selectedCommentImportance: 100,
        conversationContinuity: true,
      }),
    );
    expect(decision).toEqual({ canSpeak: false, reason: 'audioChannelBusy' });
  });
});

describe('decideHostScheduling — audioChannelBusy=false 放行规则', () => {
  it('returns canSpeak:true / reason:clear when the audio channel is clear', () => {
    const decision = decideHostScheduling(baseFactors({ audioChannelBusy: false }));
    expect(decision).toEqual({ canSpeak: true, reason: 'clear' });
  });

  it('audioChannelBusy=false clears even with factors that look like the Host should stay quiet', () => {
    // lastHostSpeechTimeMs 设为“刚刚”发生过、chatVelocity 设为 0（冷场）——
    // 这些因子按 Dev Spec 不参与判定，仍应放行。
    const decision = decideHostScheduling(
      baseFactors({
        audioChannelBusy: false,
        currentStoryPhase: 'silence',
        chatVelocity: 0,
        selectedCommentImportance: 0,
        lastHostSpeechTimeMs: 1,
        conversationContinuity: false,
      }),
    );
    expect(decision).toEqual({ canSpeak: true, reason: 'clear' });
  });
});

describe('decideHostScheduling — 可选字段缺省', () => {
  it('does not throw when optional factors are absent and the channel is busy', () => {
    const factors: HostSchedulingFactors = {
      currentStoryPhase: 'idle',
      chatVelocity: 0,
      conversationContinuity: false,
      audioChannelBusy: true,
      // lastHostSpeechTimeMs / selectedCommentImportance 均未提供
    };
    const decision = decideHostScheduling(factors);
    expect(decision).toEqual({ canSpeak: false, reason: 'audioChannelBusy' });
  });

  it('does not throw when optional factors are absent and the channel is clear', () => {
    const factors: HostSchedulingFactors = {
      currentStoryPhase: 'idle',
      chatVelocity: 0,
      conversationContinuity: false,
      audioChannelBusy: false,
    };
    const decision = decideHostScheduling(factors);
    expect(decision).toEqual({ canSpeak: true, reason: 'clear' });
  });
});
