import { describe, expect, it } from 'vitest';
import { createHostPermissionStore } from './hostPermission.js';

describe('createHostPermissionStore', () => {
  it('defaults to ALLOWED when no initial is given', () => {
    expect(createHostPermissionStore().getPermission()).toBe('ALLOWED');
  });

  it('returns MUTED after setPermission("MUTED")', () => {
    const store = createHostPermissionStore();
    store.setPermission('MUTED');
    expect(store.getPermission()).toBe('MUTED');
  });

  it('switches back to ALLOWED after being muted', () => {
    const store = createHostPermissionStore();
    store.setPermission('MUTED');
    store.setPermission('ALLOWED');
    expect(store.getPermission()).toBe('ALLOWED');
  });
});
