import type { RuntimeEvent } from './event.js';

export interface VoteRound {
  votes: Array<{ viewerId: string; choiceId: string }>;
}

export function extractVoteRounds(events: readonly RuntimeEvent[]): VoteRound[] {
  const rounds: VoteRound[] = [];
  let votes: Array<{ viewerId: string; choiceId: string }> = [];

  for (const event of events) {
    if (event.type === 'INTERACTION.VOTE') {
      if (!isVotePayload(event.payload)) {
        throw new Error(`Invalid vote payload at event sequence ${event.sequence}`);
      }
      votes = [...votes, event.payload];
    } else if (event.type === 'INTERACTION.LOCKING') {
      rounds.push({ votes });
      votes = [];
    }
  }

  return rounds;
}

function isVotePayload(payload: unknown): payload is { viewerId: string; choiceId: string } {
  if (typeof payload !== 'object' || payload === null) return false;
  const candidate = payload as Record<string, unknown>;
  return typeof candidate.viewerId === 'string' && typeof candidate.choiceId === 'string';
}
