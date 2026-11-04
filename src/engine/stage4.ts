import { getDeathScreenLines, getNodeLines, getParserFallback } from "./content";
import type { ContentCatalog, DeathType, GameState, ItemId, NodeId, Stage4NodeId } from "./types";

interface Stage4ChoiceDefinition {
  command: string;
  target: NodeId;
  deathType?: DeathType;
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
      command: "go left",
      target: "stage4_death_choice",
      deathType: "environmental_hazard",
    },
    {
      command: "go right",
      target: "stage4_junction_b",
    },
  ],
  stage4_junction_b: [
    {
      command: "go straight",
      target: "stage4_death_choice",
      deathType: "environmental_hazard",
    },
    {
      command: "go sideways",
      target: "stage4_junction_c",
    },
  ],
  stage4_junction_c: [
    {
      command: "go around",
      target: "stage4_death_choice",
      deathType: "environmental_hazard",
    },
    {
      command: "go forward",
      target: "stage4_junction_c_check",
    },
  ],
  stage4_junction_c_check: [
    {
      command: NO_POCKETKNIFE_CHOICE,
      target: "stage3_death_choice",
      deathType: "environmental_hazard",
    },
    {
      command: WITH_POCKETKNIFE_CHOICE,
      target: "stage4_junction_d",
    },
  ],
  stage4_junction_d: [
    {
      command: "go left",
      target: "stage4_junction_a",
    },
    {
      command: "go right",
      target: "stage4_junction_e",
    },
  ],
  stage4_junction_e: [
    {
      command: "step down",
      target: "stage4_death_choice",
      deathType: "environmental_hazard",
    },
    {
      command: "step across",
      target: "stage4_junction_f",
    },
  ],
  stage4_junction_f: [
    {
      command: "explore alcove",
      target: "stage4_death_choice",
      deathType: "monster_attack",
    },
    {
      command: "bypass alcove",
      target: "stage4_junction_g",
    },
  ],
  stage4_junction_g: [
    {
      command: "climb aisle",
      target: "stage4_death_choice",
      deathType: "environmental_hazard",
    },
    {
      command: "duck under",
      target: "stage4_junction_h",
    },
  ],
  stage4_junction_h: [
    {
      command: "take left corridor",
      target: "stage4_junction_e",
    },
    {
      command: "take right corridor",
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
  const hasPocketknife = inventory.includes("pocketknife");
  if (hasPocketknife) {
    const nextNode: NodeId = "stage4_junction_d";
    return {
      ...state,
      currentNode: nextNode,
      inventory: [...inventory],
      isGameOver: false,
      isWin: false,
      lastDeathType: null,
      output: [...prefixLines, ...getNodeLines(nextNode, content)],
    };
  }

  const nextNode: NodeId = "stage3_death_choice";
  const deathLines = getDeathScreenLines("stage4_junction_c_check", NO_POCKETKNIFE_CHOICE, content);
  return {
    ...state,
    currentNode: nextNode,
    inventory: [...inventory],
    isGameOver: false,
    isWin: false,
    lastDeathType: "environmental_hazard",
    output: [...prefixLines, ...deathLines, ...getNodeLines(nextNode, content)],
  };
}

export function transitionStage4(
  state: GameState,
  rawInput: string,
  content?: ContentCatalog,
): GameState {
  if (!isStage4Node(state.currentNode)) {
    return state;
  }

  if (state.currentNode === "stage4_junction_c_check") {
    return resolvePocketknifeCheck(state, state.inventory, [], content);
  }

  const normalized = rawInput.trim().toLowerCase();
  if (!normalized) {
    return {
      ...state,
      lastDeathType: null,
      output: getParserFallback(0, content),
    };
  }

  const choices = STAGE4_TRANSITIONS[state.currentNode];
  const matchedChoice = choices.find((choice, index) => {
    return choice.command === normalized || String(index + 1) === normalized;
  });

  if (!matchedChoice) {
    return {
      ...state,
      lastDeathType: null,
      output: getParserFallback(0, content),
    };
  }

  const nextNode = matchedChoice.target;

  if (nextNode === "stage4_junction_c_check") {
    const checkLines = getNodeLines(nextNode, content);
    return resolvePocketknifeCheck(state, state.inventory, checkLines, content);
  }

  const deathLines = matchedChoice.deathType
    ? getDeathScreenLines(state.currentNode, matchedChoice.command, content)
    : [];
  const nodeLines = getNodeLines(nextNode, content);

  return {
    ...state,
    currentNode: nextNode,
    inventory: [...state.inventory],
    isGameOver: nextNode === "game_over",
    isWin: nextNode === "game_win",
    lastDeathType: matchedChoice.deathType ?? null,
    output: [...deathLines, ...nodeLines],
  };
}
