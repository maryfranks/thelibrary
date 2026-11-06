import { getAvailableChoices } from "./index";
import type { GameState, NodeId } from "./types";

export const CHOICE_PROMPT_HEADER = "Do you want to:";

/** Returns the numbered "Do you want to:" lines for a node; empty for terminal nodes. */
export function formatChoicePrompt(nodeId: NodeId): string[] {
  const choices = getAvailableChoices(nodeId);
  if (choices.length === 0) return [];
  return [CHOICE_PROMPT_HEADER, ...choices.map((choice, i) => `  ${i + 1}. ${choice}`)];
}

/** Prompt lines to append after a transition; empty unless the node changed. */
export function getTransitionPrompt(prev: GameState, next: GameState): string[] {
  if (prev.currentNode === next.currentNode) return [];
  return formatChoicePrompt(next.currentNode);
}
