import { getStage1Choices, isStage1Node } from "./stage1";
import { getStage2Choices, isStage2Node } from "./stage2";
import { getStage3Choices, isStage3Node } from "./stage3";
import { getStage4Choices, isStage4Node } from "./stage4";
import { getStage5Choices, isStage5Node } from "./stage5";
import type { GameState, NodeId } from "./types";

const PRE_PACK_NODES: ReadonlySet<NodeId> = new Set<NodeId>([
  "stage1_vestibule",
  "stage1_vestibule_respawn",
  "stage1_vestibule_searched",
]);

/** Returns true once the player has found the pack at stage1_pack_checked. */
export function hasPack(state: GameState): boolean {
  if (state.hasPack) return true;
  return (
    !PRE_PACK_NODES.has(state.currentNode) &&
    state.currentNode !== "game_over" &&
    state.currentNode !== "game_win"
  );
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
