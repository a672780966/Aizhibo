import { isDeepStrictEqual } from 'node:util';
import type { RuntimeEvent } from './event.js';

export type ReplayDivergenceField = 'type' | 'payload' | 'chapterId' | 'visibility' | 'sessionId';

export interface ReplayDivergence {
  index: number;
  field: ReplayDivergenceField;
  expected: unknown;
  actual: unknown;
}

export function compareEventLogs(
  expected: readonly RuntimeEvent[],
  actual: readonly RuntimeEvent[],
): ReplayDivergence[] {
  const divergences: ReplayDivergence[] = [];
  const length = Math.max(expected.length, actual.length);
  const fields: ReplayDivergenceField[] = [
    'type',
    'payload',
    'chapterId',
    'visibility',
    'sessionId',
  ];

  for (let index = 0; index < length; index += 1) {
    const expectedEvent = expected[index];
    const actualEvent = actual[index];
    if (expectedEvent === undefined || actualEvent === undefined) {
      divergences.push({
        index,
        field: 'type',
        expected: expectedEvent ?? '<missing>',
        actual: actualEvent ?? '<missing>',
      });
      continue;
    }

    for (const field of fields) {
      const expectedValue = expectedEvent[field];
      const actualValue = actualEvent[field];
      if (!isDeepStrictEqual(expectedValue, actualValue)) {
        divergences.push({
          index,
          field,
          expected: expectedValue,
          actual: actualValue,
        });
      }
    }
  }

  return divergences;
}
