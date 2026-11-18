import { getNodeLines } from "./content";
import { applyChoiceOutcome, matchStageChoice, parserFallbackState } from "./stageHelpers";
import type { ContentCatalog, DeathType, GameState, ItemId, NodeId, Stage4NodeId } from "./types";

interface Stage4ChoiceDefinition {
  command: string;
  target: NodeId;
  deathType?: DeathType;
  deathScreenNode?: Stage4NodeId;
  deathScreenCommand?: string;
}

const NO_POCKETKNIFE_CHOICE = "no pocketknife check";
const WITH_POCKETKNIFE_CHOICE = "with pocketknife check";

export const STAGE4_TRANSITIONS: Record<Stage4NodeId, Stage4ChoiceDefinition[]> = {
  stage4_entry: [
    {
      command: "go deeper",
      target: "stage4_death_choice",
      deathType: "environmental_hazard",
    },
    {
      command: "look around",
      target: "stage4_junction_a",
    },
  ],
  stage4_death_choice: [
    {
      command: "try again",
      target: "stage4_entry",
    },
    {
      command: "give up",
      target: "game_over",
    },
  ],
  stage4_junction_a: [
    {
      command: "walk down the middle",
      target: "stage4_death_choice",
      deathType: "environmental_hazard",
      // content.json keys this death screen under the prior "go straight" wording.
      deathScreenCommand: "go straight",
    },
    {
      command: "hug the wall",
      target: "stage4_junction_b",
    },
  ],
  stage4_junction_b: [
    {
      command: "remove tapestry",
      target: "stage4_junction_b_check",
    },
    {
      command: "go around",
      target: "stage4_death_choice",
      deathType: "environmental_hazard",
    },
  ],
  stage4_junction_b_check: [
    {
      command: NO_POCKETKNIFE_CHOICE,
      target: "stage3_death_choice",
      deathType: "environmental_hazard",
    },
    {
      command: WITH_POCKETKNIFE_CHOICE,
      target: "stage4_junction_c",
    },
  ],
  stage4_junction_c: [
    {
      command: "step across",
      target: "stage4_junction_d",
    },
    {
      command: "step down",
      target: "stage4_death_choice",
      deathType: "environmental_hazard",
    },
  ],
  stage4_junction_d: [
    {
      command: "go left",
      target: "stage4_junction_d_loopback",
    },
    {
      command: "go right",
      target: "stage4_junction_e",
    },
  ],
  stage4_junction_d_loopback: [
    {
      command: "go straight",
      target: "stage4_death_choice",
      deathType: "environmental_hazard",
      // Loopback 1 returns to the same physical intersection as Junction A; reuse its death screen
      // rather than duplicating identical death text in content.json.
      deathScreenNode: "stage4_junction_a",
    },
    {
      command: "go sideways",
      target: "stage4_junction_b",
    },
  ],
  stage4_junction_e: [
    {
      command: "bypass alcove",
      target: "stage4_junction_f",
    },
    {
      command: "explore alcove",
      target: "stage4_death_choice",
      deathType: "monster_attack",
    },
  ],
  stage4_junction_f: [
    {
      command: "climb aisle",
      target: "stage4_death_choice",
      deathType: "environmental_hazard",
    },
    {
      command: "duck under",
      target: "stage4_structural_hub",
    },
  ],
  stage4_structural_hub: [
    {
      command: "go upstairs",
      target: "stage5_mezzanine_arrival",
    },
    {
      command: "go into basement",
      target: "stage5_basement_arrival",
    },
  ],
};

export function isStage4Node(nodeId: NodeId): nodeId is Stage4NodeId {
  return Object.prototype.hasOwnProperty.call(STAGE4_TRANSITIONS, nodeId);
}

export function getStage4Choices(nodeId: Stage4NodeId): string[] {
  return STAGE4_TRANSITIONS[nodeId].map((choice) => choice.command);
}

function resolvePocketknifeCheck(
  state: GameState,
  inventory: ItemId[],
  prefixLines: string[],
  content?: ContentCatalog,
): GameState {
  if (inventory.includes("pocketknife")) {
    return applyChoiceOutcome(state, {
      stage: "stage4",
      nextNode: "stage4_junction_c",
      inventory: [...inventory],
      prefixLines,
      content,
    });
  }

  return applyChoiceOutcome(state, {
    stage: "stage4",
    nextNode: "stage3_death_choice",
    inventory: [...inventory],
    deathType: "environmental_hazard",
    deathNodeId: "stage4_junction_b_check",
    deathScreenNode: "stage4_junction_b_check",
    deathScreenCommand: NO_POCKETKNIFE_CHOICE,
    prefixLines,
    content,
  });
}

export function transitionStage4(
  state: GameState,
  rawInput: string,
  content?: ContentCatalog,
): GameState {
  if (!isStage4Node(state.currentNode)) {
    return state;
  }

  if (state.currentNode === "stage4_junction_b_check") {
    return resolvePocketknifeCheck(state, state.inventory, [], content);
  }

  const matchedChoice = matchStageChoice(STAGE4_TRANSITIONS[state.currentNode], rawInput);
  if (!matchedChoice) {
    return parserFallbackState(state, content);
  }

  const nextNode = matchedChoice.target;

  if (nextNode === "stage4_junction_b_check") {
    return resolvePocketknifeCheck(
      state,
      state.inventory,
      getNodeLines(nextNode, content),
      content,
    );
  }

  return applyChoiceOutcome(state, {
    stage: "stage4",
    nextNode,
    inventory: [...state.inventory],
    deathType: matchedChoice.deathType,
    deathNodeId: state.currentNode,
    deathScreenNode: matchedChoice.deathScreenNode ?? state.currentNode,
    deathScreenCommand: matchedChoice.deathScreenCommand ?? matchedChoice.command,
    content,
  });
}
