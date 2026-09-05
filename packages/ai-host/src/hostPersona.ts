/**
 * Host Persona — Host 的静态身份数据（Dev Spec 第 37 节 Host Context 八项输入之一）。
 *
 * 本模块只提供类型 + 唯一静态默认值，不接入 Host Scheduler/Host LLM Provider，
 * 不做任何 prompt 拼装（那是 DEV-055/DEV-056 的职责）。voiceDescription 默认
 * 文案直接复述 Dev Spec 第 36 节 AI Host 职责列表，不发明规范之外的性格内容；
 * 真实的人设文案是创作/产品决策，留给 USER 未来以某种配置方式填入。
 */

export interface HostPersona {
  /** Host 在直播间里使用的名字。 */
  name: string;
  /** 人设文案：Host 是谁、职责是什么，供 DEV-055/056 拼入 LLM system prompt。 */
  voiceDescription: string;
}

const DEFAULT_HOST_PERSONA: HostPersona = {
  name: 'Host',
  voiceDescription:
    '你是本直播间的 AI Host，名字叫 Host。你的职责是：回复弹幕、主动评论、点名、吐槽行动组、评论骰子、提醒互动、缓解冷场、建立直播间内部梗。',
};

export function getHostPersona(): HostPersona {
  return DEFAULT_HOST_PERSONA;
}
