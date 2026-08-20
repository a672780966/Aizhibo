export interface GenerateVotesInput {
  seed: string;
  runIndex: number;
  step: number;
  choiceIds: string[];
  minViewers?: number;
  maxViewers?: number;
}

function hash(input: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

export function generateVotes({
  seed,
  runIndex,
  step,
  choiceIds,
  minViewers = 1,
  maxViewers = 10,
}: GenerateVotesInput): Array<{ viewerId: string; choiceId: string }> {
  if (choiceIds.length === 0) return [];

  const count =
    minViewers + (hash(`${seed}:${runIndex}:${step}:count`) % (maxViewers - minViewers + 1));
  return Array.from({ length: count }, (_, index) => ({
    viewerId: `viewer-${runIndex}-${step}-${index}`,
    choiceId: choiceIds[hash(`${seed}:${runIndex}:${step}:${index}`) % choiceIds.length]!,
  }));
}
