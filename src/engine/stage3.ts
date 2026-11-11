import { getDeathScreenLines, getNodeLines, getParserFallback } from "./content";
import { resolveRespawnCheck } from "./stage2";
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
      target: "stage3_row1_encounter",
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
      command: "look around",
      target: "stage3_row4_looted",
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
    const arrivalLines = getNodeLines("stage3_arrival", content);
    return {
      ...state,
      currentNode: nextNode,
      inventory: [...inventory],
      stage3InventorySnapshot: [...inventory],
      isGameOver: false,
      isWin: false,
      lastDeathType: null,
      output: [...prefixLines, ...arrivalLines, ...getNodeLines(nextNode, content)],
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
  const nextNode: NodeId = hasFlashlight ? "stage4_entry" : "stage3_row2_dark_warning";
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
    const checkLines = getNodeLines(resolvedNode, content);
    return resolveFlashlightCheck(nextState, resolvedInventory, checkLines, content);
  }

  if (matchedChoice.deathType) {
    recordDeath({
      stage: "stage3",
      death_type: matchedChoice.deathType,
      node_id: state.currentNode,
    });
  }

  if (resolvedNode === "game_over") {
    recordRunCompleted({
      outcome: "loss",
      final_stage: "stage3",
    });
  } else if (resolvedNode === "game_win") {
    recordRunCompleted({
      outcome: "win",
      final_stage: "stage3",
    });
  }

  const actionKey = `${state.currentNode}__${matchedChoice.command.replace(/ /g, "_")}`;
  const actionLines = getNodeLines(actionKey as NodeId, content);
  const deathLines = matchedChoice.deathType
    ? getDeathScreenLines(state.currentNode, matchedChoice.command, content)
    : [];
  const nodeLines = getNodeLines(resolvedNode, content);

  return {
    ...nextState,
    currentNode: resolvedNode,
    inventory: resolvedInventory,
    isGameOver: resolvedNode === "game_over",
    isWin: resolvedNode === "game_win",
    lastDeathType: matchedChoice.deathType ?? null,
    output: [...actionLines, ...deathLines, ...nodeLines],
  };
}
