import { describe, expect, it } from 'vitest';
import { createErrorRegistry, type ErrorRecord } from './errorRegistry.js';

describe('createErrorRegistry', () => {
  it('returns a record with input fields preserved, a non-empty id, and a valid ISO timestamp', () => {
    const registry = createErrorRegistry();
    const record = registry.record({
      level: 'L1',
      category: 'Host LLM error',
      message: 'no provider configured',
    });
    expect(record.level).toBe('L1');
    expect(record.category).toBe('Host LLM error');
    expect(record.message).toBe('no provider configured');
    expect(record.id).not.toBe('');
    expect(record.id).toMatch(/^err-\d+$/);
    expect(new Date(record.timestamp).toISOString()).toBe(record.timestamp);
  });

  it('assigns pairwise-different ids across three consecutive record calls', () => {
    const registry = createErrorRegistry();
    const first = registry.record({ level: 'L1', category: 'a', message: 'm1' });
    const second = registry.record({ level: 'L2', category: 'b', message: 'm2' });
    const third = registry.record({ level: 'L3', category: 'c', message: 'm3' });
    expect(first.id).not.toBe(second.id);
    expect(first.id).not.toBe(third.id);
    expect(second.id).not.toBe(third.id);
  });

  it('returns an empty array from list() before any record call', () => {
    const registry = createErrorRegistry();
    expect(registry.list()).toEqual([]);
  });

  it('returns records from list() in call order', () => {
    const registry = createErrorRegistry();
    const firstInput = {
      level: 'L2' as const,
      category: 'Story TTS unavailable',
      message: 'first',
    };
    const secondInput = {
      level: 'L4' as const,
      category: 'Chapter Integrity failure',
      message: 'second',
    };
    registry.record(firstInput);
    registry.record(secondInput);
    const records = registry.list();
    expect(records).toHaveLength(2);
    expect(records[0]?.message).toBe('first');
    expect(records[1]?.message).toBe('second');
  });

  it('is unaffected by mutations to an array previously returned by list()', () => {
    const registry = createErrorRegistry();
    registry.record({ level: 'L1', category: 'Host LLM error', message: 'real' });
    // list() is typed readonly, but a caller can still cast and mutate — the
    // returned array must be an independent copy, never the internal array.
    const firstSnapshot = registry.list() as ErrorRecord[];
    firstSnapshot.push({
      level: 'L4',
      category: 'Chapter Integrity failure',
      message: 'fabricated',
      id: 'err-999',
      timestamp: '2099-01-01T00:00:00.000Z',
    });
    firstSnapshot.length = 0;
    const secondSnapshot = registry.list();
    expect(secondSnapshot).toHaveLength(1);
    expect(secondSnapshot[0]?.message).toBe('real');
    expect(secondSnapshot[0]?.id).toBe('err-1');
  });

  it('records and reads back each of the four levels L1-L4', () => {
    const registry = createErrorRegistry();
    const inputs = [
      { level: 'L1' as const, category: 'Host LLM error', message: 'L1 msg' },
      { level: 'L2' as const, category: 'Story TTS unavailable', message: 'L2 msg' },
      { level: 'L3' as const, category: 'Renderer crash', message: 'L3 msg' },
      { level: 'L4' as const, category: 'Chapter Integrity failure', message: 'L4 msg' },
    ];
    for (const input of inputs) {
      registry.record(input);
    }
    const records = registry.list();
    expect(records).toHaveLength(4);
    records.forEach((record, index) => {
      expect(record.level).toBe(inputs[index]?.level);
      expect(record.category).toBe(inputs[index]?.category);
    });
  });
});
