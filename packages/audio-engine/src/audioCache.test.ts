import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { computeAudioCacheKey, createAudioCache, getAudioCacheHealth } from './audioCache.js';

const input = {
  voiceId: 'voice-id-1',
  text: '你推开酒馆的门，里面一片死寂。',
  voiceSettings: { stability: 0.7, similarity_boost: 0.8 },
};

const directories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'audio-engine-cache-'));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe('computeAudioCacheKey', () => {
  it('returns the same key for identical input', () => {
    expect(computeAudioCacheKey({ ...input, voiceModelVersion: 'v1' })).toBe(
      computeAudioCacheKey({ ...input, voiceModelVersion: 'v1' }),
    );
  });

  it('returns different keys when only voiceModelVersion differs (core requirement)', () => {
    const keyV1 = computeAudioCacheKey({ ...input, voiceModelVersion: 'eleven_v2' });
    const keyV2 = computeAudioCacheKey({ ...input, voiceModelVersion: 'eleven_v3' });
    expect(keyV1).not.toBe(keyV2);
  });

  it('returns the same key when voiceSettings keys are in a different order', () => {
    const a = computeAudioCacheKey({
      ...input,
      voiceSettings: { stability: 0.7, similarity_boost: 0.8 },
      voiceModelVersion: 'v1',
    });
    const b = computeAudioCacheKey({
      ...input,
      voiceSettings: { similarity_boost: 0.8, stability: 0.7 },
      voiceModelVersion: 'v1',
    });
    expect(a).toBe(b);
  });

  it('returns different keys when a voiceSettings value differs', () => {
    const a = computeAudioCacheKey({
      ...input,
      voiceSettings: { stability: 0.7, similarity_boost: 0.8 },
      voiceModelVersion: 'v1',
    });
    const b = computeAudioCacheKey({
      ...input,
      voiceSettings: { stability: 0.71, similarity_boost: 0.8 },
      voiceModelVersion: 'v1',
    });
    expect(a).not.toBe(b);
  });
});

describe('AudioCache store/findCached', () => {
  it('returns undefined when the cacheDir does not exist, without throwing', async () => {
    const cache = createAudioCache({
      cacheDir: join(await temporaryDirectory(), 'does-not-exist'),
      voiceModelVersion: 'v1',
    });
    expect(cache.findCached(input)).toBeUndefined();
  });

  it('round-trips: stored file is readable, content matches source, extension preserved', async () => {
    const cacheDir = await temporaryDirectory();
    const sourceFile = join(cacheDir, 'source-audio.ogg'); // non-.mp3 on purpose
    await writeFile(sourceFile, 'ogg bytes payload');
    const cache = createAudioCache({ cacheDir, voiceModelVersion: 'v1' });

    const stored = cache.store(input, sourceFile);
    expect(stored.startsWith(cacheDir)).toBe(true);
    expect(stored.endsWith('.ogg')).toBe(true);

    const found = cache.findCached(input);
    expect(found).toBe(stored);
    expect(await readFile(found!, 'utf8')).toBe('ogg bytes payload');

    // Source file still exists and is untouched: store copies, never moves.
    expect(await readFile(sourceFile, 'utf8')).toBe('ogg bytes payload');
  });

  it('keeps two voiceModelVersions isolated in a shared cacheDir (end-to-end)', async () => {
    const cacheDir = await temporaryDirectory();
    const sourceV1 = join(cacheDir, 'v1.wav');
    const sourceV2 = join(cacheDir, 'v2.wav');
    await writeFile(sourceV1, 'model v1 audio');
    await writeFile(sourceV2, 'model v2 audio');

    const cacheV1 = createAudioCache({ cacheDir, voiceModelVersion: 'model-a' });
    const cacheV2 = createAudioCache({ cacheDir, voiceModelVersion: 'model-b' });

    const storedV1 = cacheV1.store(input, sourceV1);
    const storedV2 = cacheV2.store(input, sourceV2);

    // Distinct files — neither overwrote the other.
    expect(storedV1).not.toBe(storedV2);

    // Each model version finds only its own cached audio.
    expect(await readFile(cacheV1.findCached(input)!, 'utf8')).toBe('model v1 audio');
    expect(await readFile(cacheV2.findCached(input)!, 'utf8')).toBe('model v2 audio');
  });
});

describe('getAudioCacheHealth', () => {
  it('reports OK with latencyMs for a writable directory', async () => {
    const cacheDir = await temporaryDirectory();
    const health = getAudioCacheHealth(cacheDir);
    expect(health.status).toBe('OK');
    expect(health.latencyMs).toBeTypeOf('number');
    expect(health.lastSuccessAt).toBeTypeOf('number');
  });

  it('reports DOWN with an error for an unwritable/invalid path, without throwing', async () => {
    // A path nested under a regular file is not a directory (ENOTDIR), and a
    // NUL byte is an illegal path character — both must surface as DOWN.
    const blocker = join(await temporaryDirectory(), 'a-file');
    await writeFile(blocker, 'x');
    const cases = [join(blocker, 'child'), `bad\u0000path`];

    for (const path of cases) {
      const health = getAudioCacheHealth(path);
      expect(health.status).toBe('DOWN');
      expect(health.error).toBeTruthy();
    }
  });
});
