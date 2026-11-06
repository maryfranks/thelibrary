import { getDeathScreenLines, getNodeLines, getParserFallback } from "./content";
import { recordDeath, recordRunCompleted } from "./telemetry";
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
  setSafeRow?: RowSafetyKey;
  requireSafeRow?: RowSafetyKey;
  elseTarget?: NodeId;
  elseDeathType?: DeathType;
  failIfAlreadySafeRow?: RowSafetyKey;
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
      target: "stage2_fireplace_revealed",
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
      command: "go back toward foyer",
      target: "stage3_hub_unexplored",
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
      setSafeRow: "row3_safe",
    },
    {
      command: "peer down row 4",
      target: "stage3_hub",
      setSafeRow: "row4_safe",
    },
    {
      command: "peer down row 5",
      target: "stage3_hub",
      setSafeRow: "row5_safe",
      failIfAlreadySafeRow: "row5_safe",
      elseTarget: "stage3_death_choice",
      elseDeathType: "unknown_death",
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
      target: "stage3_row3_encounter",
      requireSafeRow: "row3_safe",
      elseTarget: "stage3_death_choice",
      elseDeathType: "monster_attack",
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
      command: "look through the glass door",
      target: "stage3_row1_glass_view",
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
  stage3_row1_glass_view: [
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
  stage3_row2_encounter: [
    {
      command: "search corpse",
      target: "stage3_row2_looted",
      addItems: ROW2_CORPSE_ITEMS,
    },
    {
      command: "move deeper",
      target: "stage3_row2_flashlight_check",
    },
    {
      command: "return to hub",
      target: "stage3_hub",
    },
  ],
  stage3_row2_looted: [
    {
      command: "move deeper",
      target: "stage3_row2_flashlight_check",
    },
    {
      command: "return to hub",
      target: "stage3_hub",
    },
  ],
  stage3_row2_flashlight_check: [
    {
      command: NO_FLASHLIGHT_CHOICE,
      target: "stage3_death_choice",
      deathType: "monster_attack",
    },
    {
      command: WITH_FLASHLIGHT_CHOICE,
      target: "stage4_entry",
    },
  ],
  stage3_row3_encounter: [
    {
      command: "walk down row",
      target: "stage3_death_choice",
      deathType: "monster_attack",
    },
    {
      command: "return to hub",
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
      command: "return to hub",
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
      command: "return to hub",
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

function addUniqueItems(inventory: ItemId[], itemsToAdd?: ItemId[]): ItemId[] {
  if (!itemsToAdd || itemsToAdd.length === 0) {
    return [...inventory];
  }
  const next = [...inventory];
  for (const item of itemsToAdd) {
    if (!next.includes(item)) {
      next.push(item);
    }
  }
  return next;
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

  const nextNode: NodeId = "stage3_early_death_choice";
  recordDeath({
    stage: "stage3",
    death_type: "environmental_hazard",
    node_id: "stage3_arrival",
  });
  const deathLines = getDeathScreenLines("stage3_arrival", WITH_MOP_CHOICE, content);
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

function resolveFlashlightCheck(
  state: GameState,
  inventory: ItemId[],
  prefixLines: string[],
  content?: ContentCatalog,
): GameState {
  const hasFlashlight = inventory.includes("flashlight");
  if (hasFlashlight) {
    const nextNode: NodeId = "stage4_entry";
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
  recordDeath({
    stage: "stage3",
    death_type: "monster_attack",
    node_id: "stage3_row2_flashlight_check",
  });
  const deathLines = getDeathScreenLines(
    "stage3_row2_flashlight_check",
    NO_FLASHLIGHT_CHOICE,
    content,
  );
  return {
    ...state,
    currentNode: nextNode,
    inventory: [...inventory],
    isGameOver: false,
    isWin: false,
    lastDeathType: "monster_attack",
    output: [...prefixLines, ...deathLines, ...getNodeLines(nextNode, content)],
  };
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

  const normalized = rawInput.trim().toLowerCase();
  if (!normalized) {
    return {
      ...state,
      lastDeathType: null,
      output: getParserFallback(0, content),
    };
  }

  const choices = STAGE3_TRANSITIONS[state.currentNode];
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

  const nextInventory = addUniqueItems(state.inventory, matchedChoice.addItems);

  if (
    matchedChoice.failIfAlreadySafeRow &&
    Boolean(state[matchedChoice.failIfAlreadySafeRow]) &&
    matchedChoice.elseTarget &&
    matchedChoice.elseDeathType
  ) {
    const nextNode = matchedChoice.elseTarget;
    recordDeath({
      stage: "stage3",
      death_type: matchedChoice.elseDeathType,
      node_id: state.currentNode,
    });
    if (nextNode === "game_over") {
      recordRunCompleted({
        outcome: "loss",
        final_stage: "stage3",
      });
    } else if (nextNode === "game_win") {
      recordRunCompleted({
        outcome: "win",
        final_stage: "stage3",
      });
    }
    const deathLines = getConditionalDeathScreenLines(
      state.currentNode,
      matchedChoice.command,
      content,
    );
    return {
      ...state,
      currentNode: nextNode,
      inventory: nextInventory,
      isGameOver: nextNode === "game_over",
      isWin: nextNode === "game_win",
      lastDeathType: matchedChoice.elseDeathType,
      output: [...deathLines, ...getNodeLines(nextNode, content)],
    };
  }

  if (
    matchedChoice.requireSafeRow &&
    !state[matchedChoice.requireSafeRow] &&
    matchedChoice.elseTarget &&
    matchedChoice.elseDeathType
  ) {
    const nextNode = matchedChoice.elseTarget;
    recordDeath({
      stage: "stage3",
      death_type: matchedChoice.elseDeathType,
      node_id: state.currentNode,
    });
    if (nextNode === "game_over") {
      recordRunCompleted({
        outcome: "loss",
        final_stage: "stage3",
      });
    } else if (nextNode === "game_win") {
      recordRunCompleted({
        outcome: "win",
        final_stage: "stage3",
      });
    }
    const deathLines = getConditionalDeathScreenLines(
      state.currentNode,
      matchedChoice.command,
      content,
    );
    return {
      ...state,
      currentNode: nextNode,
      inventory: nextInventory,
      isGameOver: nextNode === "game_over",
      isWin: nextNode === "game_win",
      lastDeathType: matchedChoice.elseDeathType,
      output: [...deathLines, ...getNodeLines(nextNode, content)],
    };
  }

  const nextState: GameState = matchedChoice.setSafeRow
    ? {
        ...state,
        [matchedChoice.setSafeRow]: true,
      }
    : { ...state };

  const nextNode = matchedChoice.target;

  if (nextNode === "stage3_row2_flashlight_check") {
    const checkLines = getNodeLines(nextNode, content);
    return resolveFlashlightCheck(nextState, nextInventory, checkLines, content);
  }

  if (matchedChoice.deathType) {
    recordDeath({
      stage: "stage3",
      death_type: matchedChoice.deathType,
      node_id: state.currentNode,
    });
  }

  if (nextNode === "game_over") {
    recordRunCompleted({
      outcome: "loss",
      final_stage: "stage3",
    });
  } else if (nextNode === "game_win") {
    recordRunCompleted({
      outcome: "win",
      final_stage: "stage3",
    });
  }

  const deathLines = matchedChoice.deathType
    ? getDeathScreenLines(state.currentNode, matchedChoice.command, content)
    : [];
  const nodeLines = getNodeLines(nextNode, content);

  return {
    ...nextState,
    currentNode: nextNode,
    inventory: nextInventory,
    isGameOver: nextNode === "game_over",
    isWin: nextNode === "game_win",
    lastDeathType: matchedChoice.deathType ?? null,
    output: [...deathLines, ...nodeLines],
  };
}
