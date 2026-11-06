import { getStage1Choices, isStage1Node } from "./stage1";
import { getStage2Choices, isStage2Node } from "./stage2";
import { getStage3Choices, isStage3Node } from "./stage3";
import { getStage4Choices, isStage4Node } from "./stage4";
import { getStage5Choices, isStage5Node } from "./stage5";
import type { NodeId } from "./types";

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
