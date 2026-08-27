import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  noopTtsProviderPort,
  type TtsProviderPort,
  type TtsSynthesisRequest,
} from './ttsProvider.js';

export interface ElevenLabsTtsProviderConfig {
  apiKey: string;
  outputDir: string;
  baseUrl?: string;
  modelId?: string;
  fetchImpl?: typeof fetch;
}

type ElevenLabsRequestOptions = Pick<ElevenLabsTtsProviderConfig, 'baseUrl' | 'fetchImpl'>;

const DEFAULT_BASE_URL = 'https://api.elevenlabs.io';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

export function createElevenLabsTtsProvider(config: ElevenLabsTtsProviderConfig): TtsProviderPort {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const modelId = config.modelId ?? DEFAULT_MODEL_ID;
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async synthesize(request: TtsSynthesisRequest) {
      const file = `${createHash('sha256')
        .update(`${request.voiceId}:${request.text}`)
        .digest('hex')}.mp3`;
      const filePath = join(config.outputDir, file);

      try {
        const response = await fetchImpl(
          endpoint(baseUrl, `/v1/text-to-speech/${encodeURIComponent(request.voiceId)}/stream`),
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'xi-api-key': config.apiKey,
            },
            body: JSON.stringify({
              text: request.text,
              model_id: modelId,
              voice_settings: request.voiceSettings,
            }),
          },
        );

        if (response.status !== 200) {
          return {
            ok: false,
            reason: `ElevenLabs request failed: ${response.status} ${response.statusText}`,
          };
        }
        if (response.body === null) {
          return { ok: false, reason: 'ElevenLabs response body is empty' };
        }

        let bytes = 0;
        const countBytes = new Transform({
          transform(chunk: Buffer | Uint8Array, _encoding, callback) {
            bytes += chunk.byteLength;
            callback(null, chunk);
          },
        });

        await mkdir(config.outputDir, { recursive: true });
        await pipeline(
          Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
          countBytes,
          createWriteStream(filePath),
        );

        if (bytes === 0) {
          await rm(filePath, { force: true });
          return { ok: false, reason: 'ElevenLabs response body is empty' };
        }

        return { ok: true, file: filePath };
      } catch (error) {
        await rm(filePath, { force: true }).catch(() => undefined);
        return { ok: false, reason: errorMessage(error) };
      }
    },
  };
}

export function createOptionalElevenLabsTtsProvider(
  env: NodeJS.ProcessEnv,
  outputDir: string,
): TtsProviderPort {
  const apiKey = env.ELEVENLABS_API_KEY;
  if (apiKey === undefined || apiKey === '') return noopTtsProviderPort;
  return createElevenLabsTtsProvider({ apiKey, outputDir });
}

export async function getElevenLabsHealth(config: {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<Health> {
  const started = Date.now();
  try {
    const response = await (config.fetchImpl ?? fetch)(
      endpoint(config.baseUrl ?? DEFAULT_BASE_URL, '/v1/user'),
      {
        method: 'GET',
        headers: { 'xi-api-key': config.apiKey },
      },
    );
    const latencyMs = Date.now() - started;
    if (!response.ok) {
      return {
        status: 'DOWN',
        latencyMs,
        error: `ElevenLabs health check failed: ${response.status} ${response.statusText}`,
      };
    }
    return { status: 'OK', lastSuccessAt: Date.now(), latencyMs };
  } catch (error) {
    return { status: 'DOWN', latencyMs: Date.now() - started, error: errorMessage(error) };
  }
}

export async function getOptionalElevenLabsHealth(
  env: NodeJS.ProcessEnv,
  options: ElevenLabsRequestOptions = {},
): Promise<Health> {
  const apiKey = env.ELEVENLABS_API_KEY;
  if (apiKey === undefined || apiKey === '') {
    return { status: 'DOWN', error: 'no ELEVENLABS_API_KEY configured' };
  }

  const config: Parameters<typeof getElevenLabsHealth>[0] = { apiKey };
  if (options.baseUrl !== undefined) config.baseUrl = options.baseUrl;
  if (options.fetchImpl !== undefined) config.fetchImpl = options.fetchImpl;
  return getElevenLabsHealth(config);
}
