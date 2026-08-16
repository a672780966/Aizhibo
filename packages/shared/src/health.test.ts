import { describe, expectTypeOf, it } from 'vitest';
import type { Health } from './health.js';

describe('Health contract', () => {
  it('status is the union OK | DEGRADED | DOWN', () => {
    expectTypeOf<Health['status']>().toEqualTypeOf<'OK' | 'DEGRADED' | 'DOWN'>();
  });

  it('lastSuccessAt is optional', () => {
    expectTypeOf<Health['lastSuccessAt']>().toEqualTypeOf<number | undefined>();
  });

  it('latencyMs and error are optional', () => {
    expectTypeOf<Health['latencyMs']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<Health['error']>().toEqualTypeOf<string | undefined>();
  });
});
