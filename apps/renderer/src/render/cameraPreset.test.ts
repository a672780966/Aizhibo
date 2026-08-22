import { describe, expect, it } from 'vitest';
import { resolveCameraPresetStyle } from './cameraPreset.js';

describe('resolveCameraPresetStyle (T005)', () => {
  it('已收录 preset 返回对应 transform', () => {
    expect(resolveCameraPresetStyle('closeup')).toEqual({ transform: 'scale(1.15)' });
    expect(resolveCameraPresetStyle('wide')).toEqual({ transform: 'scale(0.9)' });
  });

  it('未收录的字符串一律回退 scale(1)，不抛异常', () => {
    expect(resolveCameraPresetStyle('dolly-in')).toEqual({ transform: 'scale(1)' });
    expect(resolveCameraPresetStyle('blackout')).toEqual({ transform: 'scale(1)' });
    expect(resolveCameraPresetStyle('')).toEqual({ transform: 'scale(1)' });
  });

  it('undefined 回退 scale(1)', () => {
    expect(resolveCameraPresetStyle(undefined)).toEqual({ transform: 'scale(1)' });
  });
});
