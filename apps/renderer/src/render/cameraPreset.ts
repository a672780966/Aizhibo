/**
 * `VisualScene.cameraPreset` 键 → CSS 变换的内置小映射表（DEV-026）。不做任何镜头
 * DSL/动态参数系统：preset 只是字符串键，这里把它映射到预先写死的一组 CSS 效果。
 * `undefined` 或**任何未收录的字符串**一律回退 `scale(1)`（安全默认值，不抛异常——
 * 章节作者未来可能用到映射表暂未收录的新预设名）。
 */
export interface CameraStyle {
  transform: string;
}

const PRESET_TRANSFORMS: Record<string, string> = {
  closeup: 'scale(1.15)',
  wide: 'scale(0.9)',
};

export function resolveCameraPresetStyle(preset: string | undefined): CameraStyle {
  const transform = preset !== undefined ? PRESET_TRANSFORMS[preset] : undefined;
  return { transform: transform ?? 'scale(1)' };
}
