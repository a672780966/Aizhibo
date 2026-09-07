import { describe, expect, it } from 'vitest';
import {
  createOperatorAuthProvider,
  createOptionalOperatorAuthProvider,
  noopOperatorAuthPort,
} from './operatorAuth.js';

describe('createOptionalOperatorAuthProvider without OPERATOR_API_TOKEN', () => {
  it('returns the noopOperatorAuthPort singleton by reference', () => {
    expect(createOptionalOperatorAuthProvider({})).toBe(noopOperatorAuthPort);
    expect(createOptionalOperatorAuthProvider({ OPERATOR_API_TOKEN: '' })).toBe(
      noopOperatorAuthPort,
    );
  });

  it('rejects a defined token (deny by default, never allow)', () => {
    const port = createOptionalOperatorAuthProvider({});
    expect(port.authenticate('anything')).toEqual({
      ok: false,
      reason: 'no OPERATOR_API_TOKEN configured',
    });
  });

  it('rejects an undefined token', () => {
    const port = createOptionalOperatorAuthProvider({});
    expect(port.authenticate(undefined)).toEqual({
      ok: false,
      reason: 'no OPERATOR_API_TOKEN configured',
    });
  });
});

describe('createOptionalOperatorAuthProvider with OPERATOR_API_TOKEN set', () => {
  const env: NodeJS.ProcessEnv = { OPERATOR_API_TOKEN: 'secret-token' };

  it('accepts the exact matching token', () => {
    const port = createOptionalOperatorAuthProvider(env);
    expect(port.authenticate('secret-token')).toEqual({ ok: true });
  });

  it('rejects a non-matching token with reason "invalid operator token"', () => {
    const port = createOptionalOperatorAuthProvider(env);
    expect(port.authenticate('wrong-token')).toEqual({
      ok: false,
      reason: 'invalid operator token',
    });
  });

  it('rejects an undefined token with reason "missing operator token"', () => {
    const port = createOptionalOperatorAuthProvider(env);
    expect(port.authenticate(undefined)).toEqual({
      ok: false,
      reason: 'missing operator token',
    });
  });
});

describe('createOperatorAuthProvider', () => {
  it('accepts exactly the expected token and nothing else', () => {
    const port = createOperatorAuthProvider('expected');
    expect(port.authenticate('expected')).toEqual({ ok: true });
    expect(port.authenticate('other')).toEqual({ ok: false, reason: 'invalid operator token' });
    expect(port.authenticate(undefined)).toEqual({ ok: false, reason: 'missing operator token' });
  });
});
