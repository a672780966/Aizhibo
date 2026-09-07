import { describe, expect, it } from 'vitest';
import { idleHostAvatarState, type HostAvatarState } from './hostAvatar.js';

describe('idleHostAvatarState', () => {
  it('has mouth equal to "closed"', () => {
    expect(idleHostAvatarState.mouth).toBe('closed');
  });

  it('has breathing equal to "exhale"', () => {
    expect(idleHostAvatarState.breathing).toBe('exhale');
  });

  it('is a stable static constant (repeated reads return equal field values, not timer/side-effect driven)', () => {
    const firstRead = idleHostAvatarState;
    const secondRead = idleHostAvatarState;
    expect(secondRead.mouth).toBe(firstRead.mouth);
    expect(secondRead.breathing).toBe(firstRead.breathing);
    expect(secondRead).toBe(firstRead);
  });
});

describe('HostAvatarState type contract', () => {
  it('accepts a hand-written object literal satisfying the type from outside', () => {
    // 手写对象字面量直接赋给 HostAvatarState 类型：类型契约对模块外部可用。
    const handWritten: HostAvatarState = { mouth: 'open', breathing: 'inhale' };
    expect(handWritten.mouth).toBe('open');
    expect(handWritten.breathing).toBe('inhale');
  });

  it('rejects nothing at runtime — the type is a compile-time contract (sanity: literal equals itself)', () => {
    const talking: HostAvatarState = { mouth: 'open', breathing: 'exhale' };
    expect(talking).toEqual({ mouth: 'open', breathing: 'exhale' });
  });
});
