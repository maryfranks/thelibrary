import { getAvailableChoices } from "./choices";
import { getIntroLines, getNodeLines, getParserFallback } from "./content";
import { isStage1Node, transitionStage1 } from "./stage1";
import { isStage2Node, transitionStage2 } from "./stage2";
import { isStage3Node, transitionStage3 } from "./stage3";
import { isStage4Node, transitionStage4 } from "./stage4";
import { isStage5Node, transitionStage5 } from "./stage5";
import type { ContentCatalog, GameState, NodeId } from "./types";

export function createInitialState(content?: ContentCatalog): GameState {
  const initialNode = "stage1_vestibule" as const;
  return {
    currentNode: initialNode,
    inventory: [],
    isGameOver: false,
    isWin: false,
    lastDeathType: null,
    output: [...getIntroLines(content), ...getNodeLines(initialNode, content)],
    row1_safe: false,
    row2_safe: false,
    row3_safe: false,
    row4_safe: false,
    row5_safe: false,
    stage2InventorySnapshot: null,
    stage3InventorySnapshot: null,
  };
}

/** Check nodes that resolve immediately on entry and never rest as a menu. */
export const AUTO_RESOLVE_NODES: ReadonlySet<NodeId> = new Set<NodeId>([
  "stage2_respawn_check",
  "stage2_periodicals_check",
  "stage2_stacks_door_check",
  "stage3_arrival",
  "stage3_row2_flashlight_check",
  "stage4_junction_c_check",
  "stage5_mezzanine_umbrella_check",
  "stage5_basement_umbrella_check",
]);

const MAX_AUTO_RESOLVE_STEPS = 10;

export function transition(state: GameState, input: string, content?: ContentCatalog): GameState {
  let next = dispatchTransition(state, input, content);
  for (let i = 0; i < MAX_AUTO_RESOLVE_STEPS; i++) {
    if (next.isGameOver || next.isWin || !AUTO_RESOLVE_NODES.has(next.currentNode)) {
      break;
    }
    const resolved = dispatchTransition(next, "", content);
    next = { ...resolved, output: [...next.output, ...resolved.output] };
  }
  return next;
}

function dispatchTransition(state: GameState, input: string, content?: ContentCatalog): GameState {
  if (state.isGameOver || state.isWin) {
    return state;
  }

  const normalized = input.trim().toLowerCase();
  if (!AUTO_RESOLVE_NODES.has(state.currentNode)) {
    const choices = getAvailableChoices(state.currentNode);
    const matchesNodeChoice = choices.some(
      (choice, index) => choice === normalized || String(index + 1) === normalized,
    );

    if (!matchesNodeChoice) {
      if (normalized === "look around") {
        return {
          ...state,
          inventory: [...state.inventory],
          lastDeathType: null,
          output: getNodeLines(state.currentNode, content),
        };
      }

      if (normalized === "look in the pack") {
        return {
          ...state,
          inventory: [...state.inventory],
          lastDeathType: null,
          output: [],
        };
      }
    }
  }

  if (isStage1Node(state.currentNode)) {
    return transitionStage1(state, input, content);
  }

  if (isStage2Node(state.currentNode)) {
    return transitionStage2(state, input, content);
  }

  if (isStage3Node(state.currentNode)) {
    return transitionStage3(state, input, content);
  }

  if (isStage4Node(state.currentNode)) {
    return transitionStage4(state, input, content);
  }

  if (isStage5Node(state.currentNode)) {
    return transitionStage5(state, input, content);
  }

  return {
    ...state,
    lastDeathType: null,
    output: getParserFallback(0, content),
  };
}

export const step = transition;
