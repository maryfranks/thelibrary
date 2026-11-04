import { getIntroLines, getNodeLines, getParserFallback } from "./content";
import { getStage1Choices, isStage1Node, transitionStage1 } from "./stage1";
import type { ContentCatalog, GameState, NodeId } from "./types";

export * from "./types";
export * from "./content";
export * from "./stage1";

export function createInitialState(content?: ContentCatalog): GameState {
  const initialNode = "stage1_vestibule" as const;
  return {
    currentNode: initialNode,
    inventory: [],
    isGameOver: false,
    isWin: false,
    lastDeathType: null,
    output: [...getIntroLines(content), ...getNodeLines(initialNode, content)],
  };
}

export function getAvailableChoices(nodeId: NodeId): string[] {
  if (isStage1Node(nodeId)) {
    return getStage1Choices(nodeId);
  }
  return [];
}

export function transition(state: GameState, input: string, content?: ContentCatalog): GameState {
  if (state.isGameOver || state.isWin) {
    return state;
  }

  if (isStage1Node(state.currentNode)) {
    return transitionStage1(state, input, content);
  }

  return {
    ...state,
    lastDeathType: null,
    output: getParserFallback(0, content),
  };
}

export const step = transition;
