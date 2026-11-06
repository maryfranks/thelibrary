import { getAvailableChoices } from "./choices";
import { isStage2Node } from "./stage2";
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

function formatInventory(state: GameState): string {
  return state.inventory.length > 0
    ? `Inventory: ${state.inventory.join(", ")}`
    : "Inventory: empty";
}

function shouldShowInventory(prev: GameState, next: GameState, lower: string): boolean {
  const changed =
    prev.inventory.length !== next.inventory.length ||
    prev.inventory.some((item, i) => next.inventory[i] !== item);
  if (changed) return true;
  const choices = getAvailableChoices(prev.currentNode);
  const chosen = choices[Number(lower) - 1] ?? lower;
  return (
    chosen === "look in the pack" &&
    (next.currentNode === "stage1_pack_checked" || isStage2Node(next.currentNode))
  );
}

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
    return {
      state,
      entries: [{ kind: "sys", text: formatInventory(state) }],
      clear: false,
      isSystem: true,
    };
  }

  const next = transition(state, rawInput.trim());
  const entries = asOut(next.output);
  if (shouldShowInventory(state, next, lower)) {
    entries.push({ kind: "sys", text: formatInventory(next) });
  }
  entries.push(...asOut(getTransitionPrompt(state, next)));
  return {
    state: next,
    entries,
    clear: false,
    isSystem: false,
  };
}
