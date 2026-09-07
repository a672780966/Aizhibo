/**
 * Host Avatar — Host 的视觉状态数据形状（CR-014：静态 PNG + 口型/呼吸微动，
 * 无 Live2D/VRM）。
 *
 * 本模块只定义"Avatar 当前处于什么视觉状态"这一数据结构本身 + 一个中性的
 * 静止默认值，零依赖、不实现任何带具体时间参数的驱动/切换逻辑（张嘴间隔、
 * 呼吸周期等是创作/表演节奏决策，Dev Spec 与 CR-014 均未定义，USER
 * 2026-09-07 已裁决本节点不发明）。把状态映射成具体显示哪张 PNG、怎么在
 * 画面上渲染，是未来集成真实素材与 Presentation 层的职责。
 */

/** 口型微动的两种状态：张嘴 / 闭嘴（对应未来说话时张嘴、静默时闭嘴的口型同步）。 */
export type HostAvatarMouthState = 'open' | 'closed';

/** 呼吸微动的两种相位：吸气 / 呼气（对应未来周期性呼吸动画）。 */
export type HostAvatarBreathingState = 'inhale' | 'exhale';

/** Avatar 的完整视觉状态：两个独立的二元状态（口型 + 呼吸）。 */
export interface HostAvatarState {
  mouth: HostAvatarMouthState;
  breathing: HostAvatarBreathingState;
}

/** 唯一的静止默认值：嘴巴闭合、呼气相位，代表"没有任何外部驱动信号时"的中性静止画面。 */
export const idleHostAvatarState: HostAvatarState = {
  mouth: 'closed',
  breathing: 'exhale',
};
