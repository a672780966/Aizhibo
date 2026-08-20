import { describe, expect, it } from 'vitest';
import { generateVotes } from './simulatorVotes.js';

describe('generateVotes', () => {
  it('is deterministic and respects the viewer bounds', () => {
    const input = {
      seed: 'sim-1',
      runIndex: 1,
      step: 2,
      choiceIds: ['A', 'B'],
      minViewers: 3,
      maxViewers: 5,
    };
    const first = generateVotes(input);
    expect(first).toEqual(generateVotes(input));
    expect(first.length).toBeGreaterThanOrEqual(3);
    expect(first.length).toBeLessThanOrEqual(5);
    expect(first.every((vote) => ['A', 'B'].includes(vote.choiceId))).toBe(true);
  });

  it('returns no votes without choices and varies the selected choice', () => {
    expect(generateVotes({ seed: 'empty', runIndex: 0, step: 0, choiceIds: [] })).toEqual([]);

    const distributions = new Set(
      Array.from({ length: 12 }, (_, step) =>
        generateVotes({
          seed: 'varied',
          runIndex: 0,
          step,
          choiceIds: ['A', 'B'],
          minViewers: 4,
          maxViewers: 4,
        })
          .map((vote) => vote.choiceId)
          .join(''),
      ),
    );
    expect(distributions.size).toBeGreaterThan(1);
  });
});
