import { getDeathScreenLines, getNodeLines, getParserFallback } from "./content";
import { recordDeath, recordRunCompleted } from "./telemetry";
import type { ContentCatalog, DeathType, GameState, ItemId, NodeId, StageId } from "./types";

/** Adds unique items and removes specified items from an inventory array. */
export function mutateInventory(
  inventory: ItemId[],
  itemsToAdd?: ItemId[],
  itemsToRemove?: ItemId[],
): ItemId[] {
  const removeSet = itemsToRemove && itemsToRemove.length > 0 ? new Set(itemsToRemove) : null;
  const next = removeSet ? inventory.filter((item) => !removeSet.has(item)) : [...inventory];

  if (itemsToAdd) {
    for (const item of itemsToAdd) {
      if (!next.includes(item)) {
        next.push(item);
      }
    }
  }

  return next;
}

/** Returns a state with parser fallback output and cleared death state. */
export function parserFallbackState(state: GameState, content?: ContentCatalog): GameState {
  return {
    ...state,
    lastDeathType: null,
    output: getParserFallback(0, content),
  };
}

/** Matches normalized user input against choice commands or 1-based numeric indices. */
export function matchStageChoice<T extends { command: string }>(
  choices: readonly T[],
  rawInput: string,
): T | undefined {
  const normalized = rawInput.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return choices.find(
    (choice, index) => choice.command === normalized || String(index + 1) === normalized,
  );
}

export interface ApplyChoiceOutcomeOptions {
  stage: StageId;
  nextNode: NodeId;
  inventory: ItemId[];
  deathType?: DeathType | undefined;
  deathNodeId?: NodeId | undefined;
  deathScreenNode?: NodeId | undefined;
  deathScreenCommand?: string | undefined;
  deathLines?: string[] | undefined;
  prefixLines?: string[] | undefined;
  suppressNodeLines?: boolean | undefined;
  content?: ContentCatalog | undefined;
}

/** Records death/run-completion telemetry and builds the next GameState for a transition. */
export function applyChoiceOutcome(
  state: GameState,
  options: ApplyChoiceOutcomeOptions,
): GameState {
  const {
    stage,
    nextNode,
    inventory,
    deathType,
    deathNodeId = state.currentNode,
    deathScreenNode = state.currentNode,
    deathScreenCommand,
    deathLines: providedDeathLines,
    prefixLines = [],
    suppressNodeLines = false,
    content,
  } = options;

  if (deathType) {
    recordDeath({
      stage,
      death_type: deathType,
      node_id: deathNodeId,
    });
  }

  if (nextNode === "game_over") {
    recordRunCompleted({
      outcome: "loss",
      final_stage: stage,
    });
  } else if (stage === "stage5" && nextNode === "game_win") {
    recordRunCompleted({
      outcome: "win",
      final_stage: stage,
    });
  }

  const deathLines =
    providedDeathLines ??
    (deathType && deathScreenCommand
      ? getDeathScreenLines(deathScreenNode, deathScreenCommand, content)
      : []);
  const nodeLines = suppressNodeLines ? [] : getNodeLines(nextNode, content);

  return {
    ...state,
    currentNode: nextNode,
    inventory,
    isGameOver: nextNode === "game_over",
    isWin: stage === "stage5" && nextNode === "game_win",
    lastDeathType: deathType ?? null,
    output: [...prefixLines, ...deathLines, ...nodeLines],
  };
}
