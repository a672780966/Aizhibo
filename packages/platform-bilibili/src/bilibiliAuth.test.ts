import { describe, expect, it, vi } from 'vitest';
import {
  bilibiliContentMd5,
  computeBilibiliAuthorization,
  createBilibiliAuthProvider,
  createOptionalBilibiliAuthProvider,
  noopBilibiliAuthPort,
  type BilibiliAuthPort,
  type BilibiliAuthProviderConfig,
} from './bilibiliAuth.js';

/** /v2/app/start 成功响应的真实最小形状（game_info/websocket_info 字段路径）。 */
function startResponseBody(overrides: { wssLink?: unknown[] } = {}): string {
  return JSON.stringify({
    code: 0,
    message: 'ok',
    data: {
      game_info: { game_id: 'game-1' },
      websocket_info: {
        auth_body: '{"uid":0,"roomid":5050,"protover":1,"platform":"web","type":2,"key":"t-1"}',
        wss_link: overrides.wssLink ?? [
          'wss://broadcastlv.example/ws',
          'wss://broadcastlv.example/ws2',
        ],
      },
    },
  });
}

const defaultConfig: BilibiliAuthProviderConfig = {
  appId: '123456789',
  accessKeyId: 'ak-1',
  accessKeySecret: 'secret-1',
  anchorCode: '1A2B3C',
  baseUrl: 'https://live-open.example',
};

function createWith(overrides: Partial<BilibiliAuthProviderConfig> = {}) {
  return createBilibiliAuthProvider({ ...defaultConfig, ...overrides });
}

/** 捕获请求的（url, method, headers, body）。 */
function capture(
  fetchImpl: ReturnType<typeof vi.fn>,
  index: number,
): { url: string; headers: Record<string, string>; body: string } {
  const call = fetchImpl.mock.calls[index]!;
  const init = call[1] as RequestInit;
  return {
    url: String(call[0]),
    headers: init.headers as Record<string, string>,
    body: String(init.body),
  };
}

/** 六个签名头缺一不可（Task Package §1 第 4 点）。 */
const SIGNED_HEADER_NAMES = [
  'x-bili-content-md5',
  'x-bili-timestamp',
  'x-bili-signature-version',
  'x-bili-signature-nonce',
  'x-bili-signature-method',
  'x-bili-accesskeyid',
] as const;

describe('HMAC-SHA256 签名（A10）', () => {
  it('computes a deterministic lowercase hex authorization for known inputs', () => {
    const contentMd5 = bilibiliContentMd5('{"code":"1A2B3C","app_id":123456789}');
    // 金样向量：与 Bilibili 官方签名实现（SignatureAlgorithm_DotnetDemo）的规范
    // 布局一致——六个 x-bili-* 头按名字典序 name:value 行 \n 拼接，access_key_secret
    // 作密钥，独立计算得到（见 bilibiliAuth.ts 注释）。
    expect(contentMd5).toBe('584c45365cf7c0532b009fc0df455f78');
    expect(
      computeBilibiliAuthorization({
        accessKeyId: '34c0f583f0414123',
        accessKeySecret: 'abc7736bb78947d5a4a90690c861c456',
        contentMd5,
        timestamp: '1624594467',
        nonce: 'ad184c09-095f-91c3-0849-230dd3744045',
      }),
    ).toBe('0ac5cfc15a2b216ac929eb790e25acd1bf7a235d9a585c9f30e3d1070d2e3dce');
  });

  it('is independent of request count: same input always yields the same hex', () => {
    const input = {
      accessKeyId: 'ak-1',
      accessKeySecret: 'secret-1',
      contentMd5: bilibiliContentMd5('{}'),
      timestamp: '1700000000',
      nonce: 'nonce-1',
    };
    expect(computeBilibiliAuthorization(input)).toBe(computeBilibiliAuthorization(input));
  });
});

describe('createBilibiliAuthProvider', () => {
  it('signed-POSTs /v2/app/start with {code, app_id} and parses the real response fields into a session (A08)', async () => {
    const fetchImpl = vi.fn(async () => new Response(startResponseBody(), { status: 200 }));
    const port = createWith({ fetchImpl });

    const result = await port.startGame();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session).toEqual({
      gameId: 'game-1',
      authBody: '{"uid":0,"roomid":5050,"protover":1,"platform":"web","type":2,"key":"t-1"}',
      wssLinks: ['wss://broadcastlv.example/ws', 'wss://broadcastlv.example/ws2'],
    });

    const { url, headers, body } = capture(fetchImpl, 0);
    expect(url).toBe('https://live-open.example/v2/app/start');
    expect(body).toBe('{"code":"1A2B3C","app_id":"123456789"}');
    // 六个签名头全部在场，且 Authorization 等于用请求内头值重算的 HMAC 结果。
    for (const name of SIGNED_HEADER_NAMES) {
      expect(headers[name]).toBeDefined();
    }
    expect(headers['content-type']).toBe('application/json');
    expect(headers['x-bili-content-md5']).toBe(
      bilibiliContentMd5('{"code":"1A2B3C","app_id":"123456789"}'),
    );
    expect(headers['x-bili-signature-method']).toBe('HMAC-SHA256');
    expect(headers['x-bili-signature-version']).toBe('1.0');
    expect(headers.Authorization).toBe(
      computeBilibiliAuthorization({
        accessKeyId: defaultConfig.accessKeyId,
        accessKeySecret: defaultConfig.accessKeySecret,
        contentMd5: headers['x-bili-content-md5']!,
        timestamp: headers['x-bili-timestamp']!,
        nonce: headers['x-bili-signature-nonce']!,
      }),
    );
  });

  it('heartbeat and endGame signed-POST the corresponding endpoints with the right bodies', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ code: 0, message: 'ok' }), { status: 200 }),
    );
    const port = createWith({ fetchImpl });

    await expect(port.heartbeat('game-1')).resolves.toEqual({ ok: true });
    await expect(port.endGame('game-1')).resolves.toEqual({ ok: true });

    const heartbeat = capture(fetchImpl, 0);
    expect(heartbeat.url).toBe('https://live-open.example/v2/app/heartbeat');
    expect(heartbeat.body).toBe('{"game_id":"game-1"}');
    expect(heartbeat.headers.Authorization).toBeDefined();

    const end = capture(fetchImpl, 1);
    expect(end.url).toBe('https://live-open.example/v2/app/end');
    expect(end.body).toBe('{"app_id":"123456789","game_id":"game-1"}');
    expect(end.headers.Authorization).toBeDefined();
  });

  it('returns {ok:false, reason} on non-2xx, business error code, malformed payload, and fetch throw — never throws (A08)', async () => {
    // 非 2xx
    const httpError = createWith({
      fetchImpl: vi.fn(async () => new Response('boom', { status: 500 })),
    });
    await expect(httpError.startGame()).resolves.toEqual({
      ok: false,
      reason: 'Bilibili /v2/app/start request failed: 500',
    });

    // HTTP 200 但业务 code ≠ 0（如身份码无效）
    const businessError = createWith({
      fetchImpl: vi.fn(
        async () =>
          new Response(JSON.stringify({ code: 1008001, message: 'invalid code' }), { status: 200 }),
      ),
    });
    const failed = await businessError.startGame();
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.reason).toContain('code=1008001');
    expect(failed.reason).toContain('invalid code');

    // HTTP 200 code=0 但 data 缺 wss_link
    const malformed = createWith({
      fetchImpl: vi.fn(
        async () => new Response(startResponseBody({ wssLink: [] }), { status: 200 }),
      ),
    });
    await expect(malformed.startGame()).resolves.toEqual({
      ok: false,
      reason:
        'Bilibili /v2/app/start succeeded but response lacks game_info.game_id / websocket_info.auth_body / websocket_info.wss_link',
    });

    // fetch 抛错
    const throwing = createWith({
      fetchImpl: vi.fn(async () => {
        throw new Error('network down');
      }),
    });
    const thrown = await throwing.endGame('game-1');
    expect(thrown.ok).toBe(false);
    if (thrown.ok) return;
    expect(thrown.reason).toContain('network down');
  });
});

describe('noopBilibiliAuthPort / createOptionalBilibiliAuthProvider（A09）', () => {
  it('noop port always answers {ok:false} without any network', async () => {
    await expect(noopBilibiliAuthPort.startGame()).resolves.toEqual({
      ok: false,
      reason: 'no Bilibili open-platform credentials configured',
    });
    await expect(noopBilibiliAuthPort.heartbeat('game-1')).resolves.toEqual({
      ok: false,
      reason: 'no Bilibili open-platform credentials configured',
    });
    await expect(noopBilibiliAuthPort.endGame('game-1')).resolves.toEqual({
      ok: false,
      reason: 'no Bilibili open-platform credentials configured',
    });
  });

  it.each([
    {},
    { BILIBILI_APP_ID: '1' },
    { BILIBILI_APP_ID: '1', BILIBILI_ACCESS_KEY_ID: '2' },
    { BILIBILI_APP_ID: '1', BILIBILI_ACCESS_KEY_ID: '2', BILIBILI_ACCESS_KEY_SECRET: '3' },
    {
      BILIBILI_APP_ID: '',
      BILIBILI_ACCESS_KEY_ID: '2',
      BILIBILI_ACCESS_KEY_SECRET: '3',
      BILIBILI_ANCHOR_CODE: '4',
    },
  ])('returns the noop port when any credential is missing (env=%o)', async (env) => {
    const port = createOptionalBilibiliAuthProvider(env);
    const expected = await noopBilibiliAuthPort.startGame();
    await expect(port.startGame()).resolves.toEqual(expected);
    expect(port).toBe(noopBilibiliAuthPort);
  });

  it('returns a real provider when all four credentials are present', async () => {
    const fetchImpl = vi.fn(async () => new Response(startResponseBody(), { status: 200 }));
    const port = createOptionalBilibiliAuthProvider({
      BILIBILI_APP_ID: '123456789',
      BILIBILI_ACCESS_KEY_ID: 'ak-1',
      BILIBILI_ACCESS_KEY_SECRET: 'secret-1',
      BILIBILI_ANCHOR_CODE: '1A2B3C',
    });
    // createOptional 不注入 fetchImpl/baseUrl（同 Youtube/Twitch 先例：env 只给凭据），
    // 这里用真实 provider 的等价配置验证"凭据齐全即可构造真实 provider"。
    const realPort: BilibiliAuthPort = createBilibiliAuthProvider({
      appId: '123456789',
      accessKeyId: 'ak-1',
      accessKeySecret: 'secret-1',
      anchorCode: '1A2B3C',
      fetchImpl,
    });
    expect(port).not.toBe(noopBilibiliAuthPort);
    expect(realPort).not.toBe(noopBilibiliAuthPort);
    const result = await realPort.startGame();
    expect(result.ok).toBe(true);
  });
});
