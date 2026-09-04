import type { ForbiddenLexicon } from '@interactive-story/chapter-compiler';

export type HostPermission = 'ALLOWED' | 'LIMITED' | 'MUTED';

export type EgressDropRule =
  'PERMISSION' | 'HIDDEN_LEXICON' | 'PLATFORM_DENYLIST' | 'DUPLICATE' | 'LENGTH' | 'RATE_LIMIT';

export type EgressDecision =
  { decision: 'ALLOW' } | { decision: 'DROP'; rule: EgressDropRule; matchedTerm?: string };

export interface EgressAttemptInput {
  text: string;
  sceneId: string;
  permission: HostPermission;
}

export interface EgressGateConfig {
  forbiddenLexicon: ForbiddenLexicon;
  platformDenylist?: RegExp[];
  recentLinesLimit?: number;
  maxLineLength?: number;
  rateLimit?: { maxLines: number; windowMs: number };
  clock?: { now(): number };
}

export interface EgressGate {
  attempt(input: EgressAttemptInput): EgressDecision;
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function createEgressGate(config: EgressGateConfig): EgressGate {
  const recentLinesLimit = config.recentLinesLimit ?? 20;
  const maxLineLength = config.maxLineLength ?? 200;
  const rateLimit = config.rateLimit ?? { maxLines: 5, windowMs: 60000 };
  const clock = config.clock ?? { now: () => Date.now() };
  const platformDenylist = config.platformDenylist ?? [];

  const recentLines: string[] = [];
  const allowedTimestamps: number[] = [];

  return {
    attempt(input: EgressAttemptInput): EgressDecision {
      // C1: Permission
      if (input.permission === 'MUTED') {
        return { decision: 'DROP', rule: 'PERMISSION' };
      }

      const normalizedText = normalize(input.text);

      // C2: Hidden lexicon
      const sceneTerms = config.forbiddenLexicon.bySceneId[input.sceneId] ?? [];
      const allForbidden = [...config.forbiddenLexicon.always, ...sceneTerms];
      for (const term of allForbidden) {
        if (normalizedText.includes(normalize(term))) {
          return { decision: 'DROP', rule: 'HIDDEN_LEXICON', matchedTerm: term };
        }
      }

      // C3: Platform denylist
      for (const pattern of platformDenylist) {
        pattern.lastIndex = 0;
        if (pattern.test(input.text)) {
          return { decision: 'DROP', rule: 'PLATFORM_DENYLIST', matchedTerm: pattern.source };
        }
      }

      // C4: Duplicate / spam
      if (recentLines.includes(normalizedText)) {
        return { decision: 'DROP', rule: 'DUPLICATE' };
      }

      // C5: Length and rate
      if (input.text.length > maxLineLength) {
        return { decision: 'DROP', rule: 'LENGTH' };
      }
      const now = clock.now();
      while (allowedTimestamps.length > 0 && now - allowedTimestamps[0]! > rateLimit.windowMs) {
        allowedTimestamps.shift();
      }
      if (allowedTimestamps.length >= rateLimit.maxLines) {
        return { decision: 'DROP', rule: 'RATE_LIMIT' };
      }

      // ALLOW: record into history state
      recentLines.push(normalizedText);
      if (recentLines.length > recentLinesLimit) {
        recentLines.shift();
      }
      allowedTimestamps.push(now);

      return { decision: 'ALLOW' };
    },
  };
}
