import { describe, expect, it } from 'vitest';
import type { RuntimeEvent } from './event.js';
import { extractVoteRounds } from './voteExtraction.js';

function event(type: string, payload: unknown, sequence: number): RuntimeEvent {
  return {
    id: `ev-${sequence}`,
    sequence,
    timestamp: '2026-01-01T00:00:00.000Z',
    type,
    payload,
    chapterId: 'ch-1',
    sessionId: 's-1',
    visibility: 'PUBLIC',
  };
}

describe('extractVoteRounds', () => {
  it('extracts zero, one, and multiple rounds while ignoring other events', () => {
    expect(extractVoteRounds([])).toEqual([]);
    expect(
      extractVoteRounds([event('STORY.PLAYING', {}, 1), event('INTERACTION.LOCKING', {}, 2)]),
    ).toEqual([{ votes: [] }]);
    expect(
      extractVoteRounds([
        event('INTERACTION.VOTE', { viewerId: 'u1', choiceId: 'A' }, 1),
        event('DICE.REQUESTED', {}, 2),
        event('INTERACTION.VOTE', { viewerId: 'u2', choiceId: 'B' }, 3),
        event('INTERACTION.LOCKING', {}, 4),
        event('INTERACTION.VOTE', { viewerId: 'u3', choiceId: 'A' }, 5),
        event('INTERACTION.LOCKING', {}, 6),
      ]),
    ).toEqual([
      {
        votes: [
          { viewerId: 'u1', choiceId: 'A' },
          { viewerId: 'u2', choiceId: 'B' },
        ],
      },
      { votes: [{ viewerId: 'u3', choiceId: 'A' }] },
    ]);
  });

  it('rejects malformed vote payloads', () => {
    expect(() => extractVoteRounds([event('INTERACTION.VOTE', { viewerId: 'u1' }, 1)])).toThrow(
      /Invalid vote payload/,
    );
  });
});
