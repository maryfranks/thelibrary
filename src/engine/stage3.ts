import { getDeathScreenLines, getNodeLines } from "./content";
import { resolveRespawnCheck } from "./stage2";
import {
  applyChoiceOutcome,
  matchStageChoice,
  mutateInventory,
  parserFallbackState,
} from "./stageHelpers";
import type {
  ContentCatalog,
  DeathType,
  GameState,
  ItemId,
  NodeId,
  RowSafetyKey,
  Stage3NodeId,
} from "./types";

interface Stage3ChoiceDefinition {
  command: string;
  target: NodeId;
  addItems?: ItemId[];
  deathType?: DeathType;
  deathScreenNode?: NodeId;
  setSafeRow?: RowSafetyKey;
  requireSafeRow?: RowSafetyKey;
  elseTarget?: NodeId;
  elseDeathType?: DeathType;
}

export const ROW2_CORPSE_ITEMS: ItemId[] = ["pocketknife", "umbrella"];
export const ROW4_BACKPACK_ITEMS: ItemId[] = [
  "water",
  "flashlight",
  "second snack",
  "notebook",
  "dictionary",
  "pencil",
];

const WITH_MOP_CHOICE = "with mop check";
const WITH_POKER_CHOICE = "with poker check";
const NO_FLASHLIGHT_CHOICE = "no flashlight check";
const WITH_FLASHLIGHT_CHOICE = "with flashlight check";

export const STAGE3_TRANSITIONS: Record<Stage3NodeId, Stage3ChoiceDefinition[]> = {
  stage3_arrival: [
    {
      command: WITH_MOP_CHOICE,
      target: "stage3_early_death_choice",
      deathType: "environmental_hazard",
    },
    {
      command: WITH_POKER_CHOICE,
      target: "stage3_hub_unexplored",
    },
  ],
  stage3_early_death_choice: [
    {
      command: "try again",
      target: "stage2_respawn_check",
    },
    {
      command: "give up",
      target: "game_over",
    },
  ],
  stage3_hub_unexplored: [
    {
      command: "go deeper",
      target: "stage3_early_death_choice",
      deathType: "monster_attack",
    },
    {
      command: "go back",
      target: "stage3_foyer_blocked",
    },
    {
      command: "look around",
      target: "stage3_hub",
    },
  ],
  stage3_foyer_blocked: [
    {
      command: "go deeper",
      target: "stage3_early_death_choice",
      deathType: "monster_attack",
    },
    {
      command: "look around",
      target: "stage3_hub",
    },
  ],
  stage3_hub: [
    {
      command: "peer down row 1",
      target: "stage3_hub",
      setSafeRow: "row1_safe",
    },
    {
      command: "peer down row 2",
      target: "stage3_hub",
      setSafeRow: "row2_safe",
    },
    {
      command: "peer down row 3",
      target: "stage3_hub",
    },
    {
      command: "peer down row 4",
      target: "stage3_hub",
      setSafeRow: "row4_safe",
    },
    {
      command: "peer down row 5",
      target: "stage3_row5_warning",
    },
    {
      command: "go down row 1",
      target: "stage3_row1_encounter",
      requireSafeRow: "row1_safe",
      elseTarget: "stage3_death_choice",
      elseDeathType: "monster_attack",
    },
    {
      command: "go down row 2",
      target: "stage3_row2_encounter",
      requireSafeRow: "row2_safe",
      elseTarget: "stage3_death_choice",
      elseDeathType: "monster_attack",
    },
    {
      command: "go down row 3",
      target: "stage3_death_choice",
      deathType: "monster_attack",
    },
    {
      command: "go down row 4",
      target: "stage3_row4_encounter",
      requireSafeRow: "row4_safe",
      elseTarget: "stage3_death_choice",
      elseDeathType: "monster_attack",
    },
    {
      command: "go down row 5",
      target: "stage3_death_choice",
      deathType: "unknown_death",
    },
  ],
  stage3_death_choice: [
    {
      command: "try again",
      target: "stage3_hub",
    },
    {
      command: "give up",
      target: "game_over",
    },
  ],
  stage3_row1_encounter: [
    {
      command: "look around",
      target: "stage3_row1_looked",
    },
    {
      command: "enter the reading room",
      target: "stage3_death_choice",
      deathType: "monster_attack",
    },
    {
      command: "go back",
      target: "stage3_hub",
    },
  ],
  stage3_row1_looked: [
    {
      command: "enter the reading room",
      target: "stage3_death_choice",
      deathType: "monster_attack",
      deathScreenNode: "stage3_row1_encounter",
    },
    {
      command: "go back",
      target: "stage3_hub",
    },
  ],
  stage3_row2_encounter: [
    {
      command: "search corpse",
      target: "stage3_row2_looted",
      addItems: ROW2_CORPSE_ITEMS,
    },
    {
      command: "go deeper",
      target: "stage3_row2_flashlight_check",
    },
    {
      command: "go back",
      target: "stage3_hub",
    },
  ],
  stage3_row2_looted: [
    {
      command: "go deeper",
      target: "stage3_row2_flashlight_check",
    },
    {
      command: "go back",
      target: "stage3_hub",
    },
  ],
  stage3_row2_flashlight_check: [
    {
      command: WITH_FLASHLIGHT_CHOICE,
      target: "stage4_entry",
    },
    {
      command: NO_FLASHLIGHT_CHOICE,
      target: "stage3_row2_dark_warning",
    },
  ],
  stage3_row2_dark_warning: [
    {
      command: "go deeper",
      target: "stage3_death_choice",
      deathType: "monster_attack",
    },
    {
      command: "go back",
      target: "stage3_hub",
    },
  ],
  stage3_row4_encounter: [
    {
      command: "search backpack",
      target: "stage3_row4_looted",
      addItems: ROW4_BACKPACK_ITEMS,
    },
    {
      command: "go deeper",
      target: "stage3_death_choice",
      deathType: "monster_attack",
    },
    {
      command: "go back",
      target: "stage3_hub",
    },
  ],
  stage3_row4_looted: [
    {
      command: "go deeper",
      target: "stage3_death_choice",
      deathType: "monster_attack",
    },
    {
      command: "go back",
      target: "stage3_hub",
    },
  ],
  stage3_row5_warning: [
    {
      command: "peer",
      target: "stage3_death_choice",
      deathType: "unknown_death",
    },
    {
      command: "go back",
      target: "stage3_hub",
    },
  ],
};

export function isStage3Node(nodeId: NodeId): nodeId is Stage3NodeId {
  return Object.prototype.hasOwnProperty.call(STAGE3_TRANSITIONS, nodeId);
}

export function getStage3Choices(nodeId: Stage3NodeId): string[] {
  return STAGE3_TRANSITIONS[nodeId].map((choice) => choice.command);
}

function getConditionalDeathScreenLines(
  nodeId: NodeId,
  command: string,
  content?: ContentCatalog,
): string[] {
  const elseLines = getDeathScreenLines(nodeId, `${command}__else`, content);
  if (elseLines.length > 0) {
    return elseLines;
  }
  return getDeathScreenLines(nodeId, command, content);
}

function resolveArrivalCheck(
  state: GameState,
  inventory: ItemId[],
  prefixLines: string[],
  content?: ContentCatalog,
): GameState {
  const hasPoker = inventory.includes("fireplace poker");
  if (hasPoker) {
    const nextNode: NodeId = "stage3_hub_unexplored";
    const arrivalLines = getNodeLines("stage3_arrival", content);
    const outcomeState = applyChoiceOutcome(state, {
      stage: "stage3",
      nextNode,
      inventory: [...inventory],
      prefixLines: [...prefixLines, ...arrivalLines],
      content,
    });
    return {
      ...outcomeState,
      stage3InventorySnapshot: [...inventory],
    };
  }

  return applyChoiceOutcome(state, {
    stage: "stage3",
    nextNode: "stage3_early_death_choice",
    inventory: [...inventory],
    deathType: "environmental_hazard",
    deathNodeId: "stage3_arrival",
    deathScreenNode: "stage3_arrival",
    deathScreenCommand: WITH_MOP_CHOICE,
    prefixLines,
    content,
  });
}

function resolveFlashlightCheck(
  state: GameState,
  inventory: ItemId[],
  prefixLines: string[],
  content?: ContentCatalog,
): GameState {
  const nextNode: NodeId = inventory.includes("flashlight")
    ? "stage4_entry"
    : "stage3_row2_dark_warning";

  return applyChoiceOutcome(state, {
    stage: "stage3",
    nextNode,
    inventory: [...inventory],
    prefixLines,
    content,
  });
}

export function transitionStage3(
  state: GameState,
  rawInput: string,
  content?: ContentCatalog,
): GameState {
  if (!isStage3Node(state.currentNode)) {
    return state;
  }

  if (state.currentNode === "stage3_arrival") {
    return resolveArrivalCheck(state, state.inventory, [], content);
  }

  if (state.currentNode === "stage3_row2_flashlight_check") {
    return resolveFlashlightCheck(state, state.inventory, [], content);
  }

  const matchedChoice = matchStageChoice(STAGE3_TRANSITIONS[state.currentNode], rawInput);
  if (!matchedChoice) {
    return parserFallbackState(state, content);
  }

  const nextInventory = mutateInventory(state.inventory, matchedChoice.addItems);

  if (
    matchedChoice.requireSafeRow &&
    !state[matchedChoice.requireSafeRow] &&
    matchedChoice.elseTarget &&
    matchedChoice.elseDeathType
  ) {
    return applyChoiceOutcome(state, {
      stage: "stage3",
      nextNode: matchedChoice.elseTarget,
      inventory: nextInventory,
      deathType: matchedChoice.elseDeathType,
      deathLines: getConditionalDeathScreenLines(state.currentNode, matchedChoice.command, content),
      content,
    });
  }

  const nextState: GameState = matchedChoice.setSafeRow
    ? {
        ...state,
        [matchedChoice.setSafeRow]: true,
      }
    : { ...state };

  let resolvedNode = matchedChoice.target;
  let resolvedInventory = nextInventory;

  if (state.currentNode === "stage3_death_choice" && matchedChoice.command === "try again") {
    nextState.row1_safe = false;
    nextState.row2_safe = false;
    nextState.row3_safe = false;
    nextState.row4_safe = false;
    nextState.row5_safe = false;
  } else if (
    state.currentNode === "stage3_early_death_choice" &&
    matchedChoice.command === "try again"
  ) {
    if (state.stage3InventorySnapshot != null) {
      resolvedNode = "stage3_hub_unexplored";
      resolvedInventory = [...state.stage3InventorySnapshot];
    } else {
      resolvedNode = "stage2_respawn_check";
      resolvedInventory =
        state.stage2InventorySnapshot != null
          ? [...state.stage2InventorySnapshot]
          : state.inventory.includes("mop")
            ? ["mop"]
            : [];
    }
  }

  if (resolvedNode === "stage2_respawn_check") {
    return resolveRespawnCheck(
      {
        ...nextState,
        stage2InventorySnapshot:
          state.stage2InventorySnapshot ?? (resolvedInventory.includes("mop") ? ["mop"] : []),
      },
      resolvedInventory,
      [],
      content,
    );
  }

  if (resolvedNode === "stage3_row2_flashlight_check") {
    return resolveFlashlightCheck(
      nextState,
      resolvedInventory,
      getNodeLines(resolvedNode, content),
      content,
    );
  }

  const actionKey = `${state.currentNode}__${matchedChoice.command.replace(/ /g, "_")}`;
  const actionLines = getNodeLines(actionKey as NodeId, content);

  return applyChoiceOutcome(nextState, {
    stage: "stage3",
    nextNode: resolvedNode,
    inventory: resolvedInventory,
    deathType: matchedChoice.deathType,
    deathNodeId: state.currentNode,
    deathScreenNode: matchedChoice.deathScreenNode ?? state.currentNode,
    deathScreenCommand: matchedChoice.command,
    prefixLines: actionLines,
    suppressNodeLines: actionLines.length > 0 && resolvedNode === "stage3_hub",
    content,
  });
}
