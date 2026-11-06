import { getIntroLines, getNodeLines, getParserFallback } from "./content";
import { isStage1Node, transitionStage1 } from "./stage1";
import { isStage2Node, transitionStage2 } from "./stage2";
import { isStage3Node, transitionStage3 } from "./stage3";
import { isStage4Node, transitionStage4 } from "./stage4";
import { isStage5Node, transitionStage5 } from "./stage5";
import type { ContentCatalog, GameState } from "./types";

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
