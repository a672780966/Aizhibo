import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createElevenLabsTtsProvider,
  createOptionalElevenLabsTtsProvider,
  getElevenLabsHealth,
  getOptionalElevenLabsHealth,
} from './elevenLabsTtsProvider.js';
import { noopTtsProviderPort, type TtsSynthesisRequest } from './ttsProvider.js';

const request: TtsSynthesisRequest = {
  text: '你推开酒馆的门，里面一片死寂。',
  voiceId: 'voice/id',
  voiceSettings: { stability: 0.7, similarity_boost: 0.8 },
};

const directories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'audio-engine-'));
  directories.push(directory);
  return directory;
}

function audioResponse(content: string): Response {
  return new Response(Readable.toWeb(Readable.from([Buffer.from(content)])) as unknown as BodyInit);
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe('ElevenLabs TTS provider', () => {
  it('returns the frozen noop provider when no key is configured', () => {
    expect(createOptionalElevenLabsTtsProvider({}, '/tmp/audio')).toBe(noopTtsProviderPort);
    expect(createOptionalElevenLabsTtsProvider({ ELEVENLABS_API_KEY: '' }, '/tmp/audio')).toBe(
      noopTtsProviderPort,
    );
  });

  it('builds the request and streams successful audio to a deterministic file', async () => {
    const outputDir = await temporaryDirectory();
    let receivedUrl = '';
    let receivedInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      receivedUrl = String(input);
      receivedInit = init;
      return audioResponse('fake mp3 bytes');
    };
    const provider = createElevenLabsTtsProvider({
      apiKey: 'secret',
      outputDir,
      baseUrl: 'https://example.test/',
      fetchImpl,
    });

    const first = await provider.synthesize(request);
    const second = await provider.synthesize(request);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.file).toBe(second.file);
      expect(await readFile(first.file, 'utf8')).toBe('fake mp3 bytes');
    }
    expect(receivedUrl).toBe('https://example.test/v1/text-to-speech/voice%2Fid/stream');
    expect(receivedInit?.method).toBe('POST');
    expect(receivedInit?.headers).toMatchObject({
      'content-type': 'application/json',
      'xi-api-key': 'secret',
    });
    expect(JSON.parse(String(receivedInit?.body))).toEqual({
      text: request.text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: request.voiceSettings,
    });
  });

  it('returns a failure for HTTP errors, empty bodies, and network errors', async () => {
    const outputDir = await temporaryDirectory();
    const httpError = createElevenLabsTtsProvider({
      apiKey: 'secret',
      outputDir,
      fetchImpl: async () => new Response('bad request', { status: 401 }),
    });
    const emptyBody = createElevenLabsTtsProvider({
      apiKey: 'secret',
      outputDir,
      fetchImpl: async () => new Response(null, { status: 200 }),
    });
    const networkError = createElevenLabsTtsProvider({
      apiKey: 'secret',
      outputDir,
      fetchImpl: async () => {
        throw new Error('network unavailable');
      },
    });

    await expect(httpError.synthesize(request)).resolves.toMatchObject({
      ok: false,
      reason: expect.stringContaining('401'),
    });
    await expect(emptyBody.synthesize(request)).resolves.toEqual({
      ok: false,
      reason: 'ElevenLabs response body is empty',
    });
    await expect(networkError.synthesize(request)).resolves.toEqual({
      ok: false,
      reason: 'network unavailable',
    });
  });

  it('does not fetch health when no key is configured', async () => {
    let calls = 0;
    const health = await getOptionalElevenLabsHealth(
      {},
      { fetchImpl: async () => (calls++, new Response(null, { status: 200 })) },
    );

    expect(health).toEqual({ status: 'DOWN', error: 'no ELEVENLABS_API_KEY configured' });
    expect(calls).toBe(0);
  });

  it.each([
    ['OK', 200, undefined],
    ['DOWN', 401, undefined],
    ['DOWN', undefined, new Error('health network unavailable')],
  ] as const)('reports health for %s responses', async (status, responseStatus, error) => {
    const health = await getElevenLabsHealth({
      apiKey: 'secret',
      fetchImpl: async () => {
        if (error !== undefined) throw error;
        return new Response(null, { status: responseStatus });
      },
    });

    expect(health.status).toBe(status);
    expect(health.latencyMs).toBeTypeOf('number');
    if (status === 'OK') expect(health.lastSuccessAt).toBeTypeOf('number');
    else expect(health.error).toBeTypeOf('string');
  });
});
