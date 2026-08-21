import type { Choice, InteractionNode, WorldState } from '@interactive-story/chapter-schema';
import { evaluateCondition } from '@interactive-story/rule-engine';

/**
 * One visible choice as surfaced to the Renderer. Only `id` (the letter
 * viewers type into Twitch chat) and `label` (human-readable text) are shown;
 * `actionType`/`ruleId`/`visibleIf` are internal mechanics and never leak.
 */
export interface DisplayChoice {
  id: Choice['id'];
  label: string;
}

/**
 * Filter an interaction's choices by their `visibleIf` conditions against the
 * current WorldState, so the Renderer never needs WorldState access (Dev Spec
 * §35 / CR-008). A choice with no `visibleIf` is always visible; a choice with
 * conditions is visible only when ALL conditions hold (AND — the same
 * semantics as SceneGuard and other multi-condition fields; no new combination
 * rule). The result is just `{ id, label }` per visible choice, in choice order.
 */
export function resolveVisibleChoices(
  interaction: InteractionNode,
  world: WorldState,
): DisplayChoice[] {
  const visible: DisplayChoice[] = [];
  for (const choice of interaction.choices) {
    const conditions = choice.visibleIf;
    if (conditions === undefined || conditions.every((c) => evaluateCondition(c, world))) {
      visible.push({ id: choice.id, label: choice.label });
    }
  }
  return visible;
}
