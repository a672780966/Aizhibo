export type BilibiliSendChatResult = { ok: false; reason: string };
export interface BilibiliSendChat {
  sendChat(message: string): Promise<BilibiliSendChatResult>;
}

/**
 * 诚实反映能力缺口（Task Package §2 第 4 点）——**不是**凭据缺失式降级，而是
 * **协议层面本来就不存在该能力**：Bilibili 直播开放平台 `/v2/app/*` 只有
 * `start`/`heartbeat`/`end` 三个接口，均属场次管理与接收侧鉴权，没有
 * "以 App 身份发送弹幕"的接口。已知的 `POST api.live.bilibili.com/msg/send` 是
 * `live.bilibili.com` 网页端**非官方**接口，鉴权模型是登录态 Cookie
 * （`SESSDATA`/`bili_jct`），与开放平台的 `app_id`/`access_key`/
 * `access_key_secret` 签名模型完全不同——落地它意味着本 Adapter 要额外持有用户
 * 会话 Cookie，正是 Dev Spec 第 47 节"数据处理规则须单独合规检查"要警惕的
 * 未经审查的凭据存储（见 DECISIONS D4）。
 *
 * 因此本文件**只导出这一个恒失败常量、不提供任何 config 化工厂**——没有真实
 * 端点可配置，提供一个"看起来可配置但恒失败"的工厂会误导未来调用方以为凭据
 * 齐全就能用，掩盖"协议本身不支持"这一事实（诚实纪律，同 noopHostTtsProvider/
 * noopHostLLMProvider 系列先例，但本例更进一步：连"配置齐全后可用"的可能性
 * 本身都不存在，故不设 config 参数）。
 */
export const unsupportedBilibiliSendChat: BilibiliSendChat = {
  sendChat: async () => ({
    ok: false,
    reason:
      'Bilibili live open platform (open-live.biliapi.com /v2/app/*) has no application-level send-message API; the unofficial cookie-authenticated live.bilibili.com endpoint is out of scope for this Adapter',
  }),
};
