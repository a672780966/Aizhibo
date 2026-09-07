/**
 * Operator API 鉴权 — 同 DEV-040 TwitchAuthPort/noopTwitchAuthPort/
 * createOptionalTwitchAuthProvider 的诚实占位模式。
 *
 * 关键语义：鉴权的安全默认值是"拒绝"，不是"放行"。环境变量
 * OPERATOR_API_TOKEN 未配置时，createOptionalOperatorAuthProvider 返回
 * 拒绝一切请求的 noop 单例（noopOperatorAuthPort），绝不退化为放行——
 * 这与 TwitchAuth "允许降级为不可用"的语义不同，务必不要反过来实现。
 */

export type OperatorAuthResult = { ok: true } | { ok: false; reason: string };

export interface OperatorAuthPort {
  authenticate(token: string | undefined): OperatorAuthResult;
}

export const noopOperatorAuthPort: OperatorAuthPort = {
  authenticate: () => ({ ok: false, reason: 'no OPERATOR_API_TOKEN configured' }),
};

export function createOperatorAuthProvider(expectedToken: string): OperatorAuthPort {
  return {
    authenticate(token) {
      if (token === undefined) return { ok: false, reason: 'missing operator token' };
      if (token !== expectedToken) return { ok: false, reason: 'invalid operator token' };
      return { ok: true };
    },
  };
}

export function createOptionalOperatorAuthProvider(env: NodeJS.ProcessEnv): OperatorAuthPort {
  const expectedToken = env.OPERATOR_API_TOKEN;
  if (!expectedToken) return noopOperatorAuthPort;
  return createOperatorAuthProvider(expectedToken);
}
