/**
 * Audio file cache (DEV-036).
 *
 * Implements the full cache-key algorithm required by Dev Spec §51:
 *
 *   Key = hash(voiceModelVersion + voiceId + resultText + voiceSettings)
 *
 * `voiceModelVersion` is a deployment-level constant (which voice-model
 * version the current deployment is on), NOT a per-request field, so it lives
 * in `AudioCacheConfig` and is captured by `createAudioCache` — it never
 * touches the frozen `AudioResolutionRequest`. This makes `findCached`'s
 * shape directly compatible with `AudioResolutionPorts.findCached(request) =>
 * string | undefined`; actually wiring it into the resolution chain is a
 * future node's job (DEV-030/031/035 deliberately left it out).
 *
 * Deliberately independent from DEV-035's internal idempotent naming hash
 * (`sha256(voiceId:text)`): that hash only deduplicates repeated requests in
 * one call flow and never included `voiceModelVersion` or the full
 * `voiceSettings` — exactly the gap this node fixes.
 */

import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

export interface AudioCacheLookupInput {
  voiceId: string;
  text: string;
  voiceSettings: Record<string, number | string>;
}

export interface AudioCacheConfig {
  /** Directory the cache stores files in (created on first `store`). */
  cacheDir: string;
  /** Deployment-level voice-model version; part of the cache key. */
  voiceModelVersion: string;
}

export interface AudioCache {
  findCached(input: AudioCacheLookupInput): string | undefined;
  store(input: AudioCacheLookupInput, sourceFile: string): string;
}

/**
 * Deterministically serialize `{voiceModelVersion, voiceId, text,
 * voiceSettings}` into a sha256 hex digest. `voiceSettings` keys are sorted
 * before stringifying so the same settings produce the same key regardless of
 * object-literal key order. `voiceModelVersion` participates in the digest,
 * so switching model versions never reuses stale audio.
 */
export function computeAudioCacheKey(
  input: AudioCacheLookupInput & { voiceModelVersion: string },
): string {
  const { voiceModelVersion, voiceId, text, voiceSettings } = input;
  const canonical = JSON.stringify(voiceSettings, Object.keys(voiceSettings).sort());
  return createHash('sha256')
    .update(voiceModelVersion)
    .update('\u0000')
    .update(voiceId)
    .update('\u0000')
    .update(text)
    .update('\u0000')
    .update(canonical)
    .digest('hex');
}

/**
 * Prefix-scan the cache directory for a stored file. No fixed extension is
 * assumed: `store()` preserves the source file's real extension, so lookups
 * match by key prefix alone. A missing `cacheDir` (nothing cached yet) is
 * treated as a miss and returns `undefined` — never throws.
 */
export function createAudioCache(config: AudioCacheConfig): AudioCache {
  const { cacheDir, voiceModelVersion } = config;

  return {
    findCached(input: AudioCacheLookupInput): string | undefined {
      const key = computeAudioCacheKey({ ...input, voiceModelVersion });
      let names: string[];
      try {
        names = readdirSync(cacheDir);
      } catch {
        return undefined;
      }
      const match = names.find((name) => name.startsWith(key));
      return match === undefined ? undefined : join(cacheDir, match);
    },

    store(input: AudioCacheLookupInput, sourceFile: string): string {
      const key = computeAudioCacheKey({ ...input, voiceModelVersion });
      const extension = extname(sourceFile);
      const destination = join(cacheDir, `${key}${extension}`);
      mkdirSync(cacheDir, { recursive: true });
      copyFileSync(sourceFile, destination);
      return destination;
    },
  };
}

/**
 * Probe writability of `cacheDir` by writing then deleting a temporary file
 * (DEV-010 `persistence` health style). Synchronous on purpose; no module-level
 * mutable state is introduced.
 */
export function getAudioCacheHealth(cacheDir: string): Health {
  const started = Date.now();
  const probe = join(cacheDir, `.health-${process.pid}-${Date.now()}`);
  try {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(probe, '');
    rmSync(probe, { force: true });
    return { status: 'OK', lastSuccessAt: Date.now(), latencyMs: Date.now() - started };
  } catch (error) {
    return {
      status: 'DOWN',
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};
