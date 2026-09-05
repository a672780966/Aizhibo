/**
 * Host Mood — Dev Spec 第 37 节 Host Context 八项输入之一。
 *
 * 本模块只提供"当前 Mood 是什么、如何读取、如何被外部设置"的存储原语，
 * 零依赖、不做任何自动推导：不读取 danger/tension/Public State/Selected
 * Comment 等运行时信号，不定义"什么事件让 Mood 变成什么"的触发规则
 * （那是 Host Scheduler DEV-055 未来的职责，Dev Spec 未定义即不发明）。
 */

export interface HostMood {
  /** 当前 Mood 的自由文本标签（Dev Spec 未定义分类枚举，不发明封闭取值集合）。 */
  label: string;
}

export interface HostMoodStore {
  /** 只读地返回当前 Mood。 */
  getMood(): HostMood;
  /** 设置新的 Mood（覆盖式，不做历史记录/队列）。 */
  setMood(mood: HostMood): void;
}

export function createHostMoodStore(initial?: HostMood): HostMoodStore {
  let current: HostMood = initial ?? { label: 'neutral' };
  return {
    getMood() {
      return current;
    },
    setMood(mood) {
      current = mood;
    },
  };
}
