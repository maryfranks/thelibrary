import { getIntroLines, getNodeLines, getParserFallback } from "./content";
import { isStage1Node, transitionStage1 } from "./stage1";
import type { GameState } from "./types";

export * from "./types";
export * from "./content";
export * from "./stage1";

export function createInitialState(): GameState {
  const initialNode = "stage1_vestibule" as const;
  return {
    currentNode: initialNode,
    inventory: [],
    isGameOver: false,
    isWin: false,
    lastDeathType: null,
    output: [...getIntroLines(), ...getNodeLines(initialNode)],
  };
}

export function transition(state: GameState, input: string): GameState {
  if (state.isGameOver || state.isWin) {
    return state;
  }

  if (isStage1Node(state.currentNode)) {
    return transitionStage1(state, input);
  }

  return {
    ...state,
    lastDeathType: null,
    output: [getParserFallback(0)],
  };
}

export const step = transition;
