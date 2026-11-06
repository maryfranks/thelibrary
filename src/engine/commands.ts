import { getAvailableChoices } from "./choices";
import { formatChoicePrompt, getTransitionPrompt } from "./prompt";
import { transition } from "./transition";
import type { GameState } from "./types";

export type OutputKind = "out" | "sys";
export interface OutputEntry {
  kind: OutputKind;
  text: string;
}

export interface CommandResult {
  state: GameState;
  entries: OutputEntry[];
  /** True when the terminal buffer should be wiped (no echo, no entries). */
  clear: boolean;
  /** True when the command was a UI/system command (state unchanged). */
  isSystem: boolean;
}

const INVENTORY_ALIASES = ["inventory", "i", "inv"];

const asOut = (lines: string[]): OutputEntry[] => lines.map((text) => ({ kind: "out", text }));

/** Scene narrative followed by the choice prompt for the given state. */
export function getSceneEntries(state: GameState): OutputEntry[] {
  return asOut([...state.output, ...formatChoicePrompt(state.currentNode)]);
}

/** Handles system commands (help/inventory/clear) and game commands without UI knowledge. */
export function processCommand(state: GameState, rawInput: string): CommandResult {
  const lower = rawInput.trim().toLowerCase();

  if (lower === "clear") {
    return { state, entries: [], clear: true, isSystem: true };
  }

  if (lower === "help") {
    const choices = getAvailableChoices(state.currentNode);
    const actionsText = choices.length > 0 ? choices.join(", ") : "none";
    return {
      state,
      entries: [{ kind: "sys", text: `Actions: ${actionsText} | System: INVENTORY, CLEAR, HELP` }],
      clear: false,
      isSystem: true,
    };
  }

  if (INVENTORY_ALIASES.includes(lower)) {
    const text =
      state.inventory.length > 0 ? `Inventory: ${state.inventory.join(", ")}` : "Inventory: empty";
    return { state, entries: [{ kind: "sys", text }], clear: false, isSystem: true };
  }

  const next = transition(state, rawInput.trim());
  return {
    state: next,
    entries: asOut([...next.output, ...getTransitionPrompt(state, next)]),
    clear: false,
    isSystem: false,
  };
}
