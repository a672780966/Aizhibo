import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = join(import.meta.dirname, '..', '..');

describe('toolchain smoke', () => {
  it('has the frozen spec archived under specs/baseline', () => {
    expect(existsSync(join(repoRoot, 'specs', 'baseline', 'DEV_SPEC_V1.0.md'))).toBe(true);
  });

  it('runs on node >= 22', () => {
    const major = Number(process.versions.node.split('.')[0]);
    expect(major).toBeGreaterThanOrEqual(22);
  });
});
