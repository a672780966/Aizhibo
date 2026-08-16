import { describe, expect, it } from 'vitest';
import { NPCDefinitionSchema } from './npc.js';

describe('NPCDefinition', () => {
  it('parses a definition with an initialState referencing NPCState shape', () => {
    const npc = {
      id: 'npc-guard',
      characterAssetId: 'char-guard',
      displayName: 'The Guard',
      initialState: { present: true, alive: true, disposition: 'NEUTRAL', flags: { patrol: true } },
    };
    expect(NPCDefinitionSchema.parse(npc).initialState.disposition).toBe('NEUTRAL');
  });

  it('rejects a definition with an invalid initialState', () => {
    const bad = {
      id: 'npc-guard',
      characterAssetId: 'char-guard',
      displayName: 'The Guard',
      initialState: { present: true, alive: true, disposition: 'ANGRY', flags: {} },
    };
    expect(NPCDefinitionSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts characterAssetId as a plain string', () => {
    const npc = {
      id: 'npc-guard',
      characterAssetId: 'char-guard',
      displayName: 'The Guard',
      initialState: { present: true, alive: true, disposition: 'NEUTRAL', flags: {} },
    };
    expect(typeof npc.characterAssetId).toBe('string');
    expect(NPCDefinitionSchema.safeParse({ ...npc, characterAssetId: 'any-string' }).success).toBe(
      true,
    );
  });
});
