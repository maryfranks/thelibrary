import { getIntroLines, getNodeLines, getParserFallback } from "./content";
import { getStage1Choices, isStage1Node, transitionStage1 } from "./stage1";
import { getStage2Choices, isStage2Node, transitionStage2 } from "./stage2";
import { getStage3Choices, isStage3Node, transitionStage3 } from "./stage3";
import { getStage4Choices, isStage4Node, transitionStage4 } from "./stage4";
import { getStage5Choices, isStage5Node, transitionStage5 } from "./stage5";
import type { ContentCatalog, GameState, NodeId } from "./types";

export * from "./types";
export * from "./content";
export * from "./telemetry";
export * from "./stage1";
export * from "./stage2";
export * from "./stage3";
export * from "./stage4";
export * from "./stage5";
export * from "./prompt";

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
  };
}

export function getAvailableChoices(nodeId: NodeId): string[] {
  if (isStage1Node(nodeId)) {
    return getStage1Choices(nodeId);
  }
  if (isStage2Node(nodeId)) {
    return getStage2Choices(nodeId);
  }
  if (isStage3Node(nodeId)) {
    return getStage3Choices(nodeId);
  }
  if (isStage4Node(nodeId)) {
    return getStage4Choices(nodeId);
  }
  if (isStage5Node(nodeId)) {
    return getStage5Choices(nodeId);
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
