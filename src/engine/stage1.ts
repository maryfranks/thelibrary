import {
  applyChoiceOutcome,
  matchStageChoice,
  mutateInventory,
  parserFallbackState,
} from "./stageHelpers";
import type { ContentCatalog, DeathType, GameState, ItemId, NodeId, Stage1NodeId } from "./types";

interface ChoiceDefinition {
  command: string;
  target: NodeId;
  addItems?: ItemId[];
  deathType?: DeathType;
}

export const STAGE1_TRANSITIONS: Record<Stage1NodeId, ChoiceDefinition[]> = {
  stage1_vestibule: [
    {
      command: "try to leave",
      target: "stage1_vestibule_respawn",
      deathType: "monster_attack",
    },
    {
      command: "look around",
      target: "stage1_vestibule_searched",
    },
  ],
  stage1_vestibule_respawn: [
    {
      command: "look around",
      target: "stage1_vestibule_searched",
    },
  ],
  stage1_vestibule_searched: [
    {
      command: "look in the pack",
      target: "stage1_pack_checked",
      addItems: ["snack", "novel", "pen"],
    },
  ],
  stage1_pack_checked: [
    {
      command: "hop turnstiles",
      target: "stage1_turnstile_check",
    },
    {
      command: "pick up mop",
      target: "stage1_mop_acquired",
      addItems: ["mop"],
    },
  ],
  stage1_turnstile_check: [
    {
      command: "go back for mop",
      target: "stage1_mop_acquired",
      addItems: ["mop"],
    },
    {
      command: "proceed anyway",
      target: "stage2_foyer",
    },
  ],
  stage1_mop_acquired: [
    {
      command: "hop turnstiles",
      target: "stage2_foyer",
    },
  ],
};

export function isStage1Node(nodeId: NodeId): nodeId is Stage1NodeId {
  return Object.prototype.hasOwnProperty.call(STAGE1_TRANSITIONS, nodeId);
}

export function getStage1Choices(nodeId: Stage1NodeId): string[] {
  return STAGE1_TRANSITIONS[nodeId].map((choice) => choice.command);
}

export function transitionStage1(
  state: GameState,
  rawInput: string,
  content?: ContentCatalog,
): GameState {
  if (!isStage1Node(state.currentNode)) {
    return state;
  }

  const matchedChoice = matchStageChoice(STAGE1_TRANSITIONS[state.currentNode], rawInput);
  if (!matchedChoice) {
    return parserFallbackState(state, content);
  }

  const nextInventory = mutateInventory(state.inventory, matchedChoice.addItems);
  const nextNode = matchedChoice.target;

  const outcomeState = applyChoiceOutcome(state, {
    stage: "stage1",
    nextNode,
    inventory: nextInventory,
    deathType: matchedChoice.deathType,
    deathScreenCommand: matchedChoice.command,
    content,
  });

  const stage2InventorySnapshot =
    nextNode === "stage2_foyer" ? [...nextInventory] : (state.stage2InventorySnapshot ?? null);

  return {
    ...outcomeState,
    hasPack: Boolean(state.hasPack) || nextNode === "stage1_pack_checked",
    stage2InventorySnapshot,
  };
}
