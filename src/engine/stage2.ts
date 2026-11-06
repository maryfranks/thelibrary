import { getDeathScreenLines, getNodeLines, getParserFallback } from "./content";
import { recordDeath, recordRunCompleted } from "./telemetry";
import type { ContentCatalog, DeathType, GameState, ItemId, NodeId, Stage2NodeId } from "./types";

interface Stage2ChoiceDefinition {
  command: string;
  target: NodeId;
  addItems?: ItemId[];
  removeItems?: ItemId[];
  deathType?: DeathType;
}

export const CORPSE_ITEMS: ItemId[] = ["lemon candy", "pack of gum", "mace", "hair ties"];
export const DESK_ITEMS: ItemId[] = ["small notebook", "stacks key"];

const NO_MOP_CHOICE = "no mop check";
const WITH_MOP_CHOICE = "with mop check";
const NO_STACKS_KEY_CHOICE = "no stacks key check";
const WITH_STACKS_KEY_CHOICE = "with stacks key check";

export const STAGE2_TRANSITIONS: Record<Stage2NodeId, Stage2ChoiceDefinition[]> = {
  stage2_foyer: [
    {
      command: "look around",
      target: "stage2_foyer_searched",
    },
    {
      command: "go deeper",
      target: "stage2_death_choice",
      deathType: "monster_attack",
    },
  ],
  stage2_death_choice: [
    {
      command: "try again",
      target: "stage2_respawn_check",
    },
    {
      command: "give up",
      target: "game_over",
    },
  ],
  stage2_respawn_check: [],
  stage2_foyer_searched: [
    {
      command: "look around",
      target: "stage2_foyer_searched",
    },
    {
      command: "look in the pack",
      target: "stage2_foyer_searched",
    },
    {
      command: "search corpse",
      target: "stage2_corpse_looted",
      addItems: CORPSE_ITEMS,
    },
    {
      command: "search desk",
      target: "stage2_desk_looted",
      addItems: DESK_ITEMS,
    },
    {
      command: "explore periodicals",
      target: "stage2_periodicals_check",
    },
  ],
  stage2_corpse_looted: [
    {
      command: "look around",
      target: "stage2_corpse_looted",
    },
    {
      command: "look in the pack",
      target: "stage2_corpse_looted",
    },
    {
      command: "search desk",
      target: "stage2_both_looted",
      addItems: DESK_ITEMS,
    },
    {
      command: "explore periodicals",
      target: "stage2_periodicals_check",
    },
  ],
  stage2_desk_looted: [
    {
      command: "look around",
      target: "stage2_desk_looted",
    },
    {
      command: "look in the pack",
      target: "stage2_desk_looted",
    },
    {
      command: "search corpse",
      target: "stage2_both_looted",
      addItems: CORPSE_ITEMS,
    },
    {
      command: "explore periodicals",
      target: "stage2_periodicals_check",
    },
  ],
  stage2_both_looted: [
    {
      command: "look around",
      target: "stage2_both_looted",
    },
    {
      command: "look in the pack",
      target: "stage2_both_looted",
    },
    {
      command: "explore periodicals",
      target: "stage2_periodicals_check",
    },
  ],
  stage2_periodicals_check: [
    {
      command: NO_MOP_CHOICE,
      target: "stage2_death_choice",
      deathType: "monster_attack",
    },
    {
      command: WITH_MOP_CHOICE,
      target: "stage2_reading_room_door",
    },
  ],
  stage2_reading_room_door: [
    {
      command: "rattle reading room door",
      target: "stage2_death_choice",
      deathType: "monster_attack",
    },
    {
      command: "try the lock quietly",
      target: "stage2_reading_room_locked",
    },
  ],
  stage2_reading_room_locked: [
    {
      command: "look around",
      target: "stage2_fireplace_revealed",
    },
  ],
  stage2_fireplace_revealed: [
    {
      command: "search fireplace",
      target: "stage2_poker_acquired",
      addItems: ["fireplace poker"],
      removeItems: ["mop"],
    },
    {
      command: "go deeper",
      target: "stage2_stacks_door_check",
    },
  ],
  stage2_poker_acquired: [
    {
      command: "go deeper",
      target: "stage2_stacks_door_check",
    },
  ],
  stage2_stacks_door_check: [
    {
      command: NO_STACKS_KEY_CHOICE,
      target: "stage2_stacks_door_locked_no_key",
    },
    {
      command: WITH_STACKS_KEY_CHOICE,
      target: "stage3_arrival",
    },
  ],
  stage2_stacks_door_locked_no_key: [
    {
      command: "defend yourself",
      target: "stage2_death_choice",
      deathType: "monster_attack",
    },
    {
      command: "slowly walk backwards",
      target: "stage2_death_choice",
      deathType: "monster_attack",
    },
  ],
};

export function isStage2Node(nodeId: NodeId): nodeId is Stage2NodeId {
  return Object.prototype.hasOwnProperty.call(STAGE2_TRANSITIONS, nodeId);
}

export function getStage2Choices(nodeId: Stage2NodeId): string[] {
  return STAGE2_TRANSITIONS[nodeId].map((choice) => choice.command);
}

function mutateInventory(
  inventory: ItemId[],
  itemsToAdd?: ItemId[],
  itemsToRemove?: ItemId[],
): ItemId[] {
  const removeSet = new Set(itemsToRemove ?? []);
  const next = inventory.filter((item) => !removeSet.has(item));

  if (itemsToAdd) {
    for (const item of itemsToAdd) {
      if (!next.includes(item)) {
        next.push(item);
      }
    }
  }

  return next;
}

export const WEAPON_ITEMS: ItemId[] = ["mop", "fireplace poker"];

export function hasWeapon(inventory: ItemId[]): boolean {
  return WEAPON_ITEMS.some((item) => inventory.includes(item));
}

export function resolveRespawnCheck(
  state: GameState,
  inventory: ItemId[],
  prefixLines: string[],
  content?: ContentCatalog,
): GameState {
  const restoredInventory =
    state.stage2InventorySnapshot != null ? [...state.stage2InventorySnapshot] : [...inventory];
  const hasMop = restoredInventory.includes("mop");
  const nextNode: NodeId = hasMop ? "stage2_foyer" : "stage1_vestibule_searched";
  const hintLines =
    nextNode === "stage2_foyer" ? [] : getNodeLines("stage2_respawn_check", content);
  return {
    ...state,
    currentNode: nextNode,
    inventory: restoredInventory,
    stage2InventorySnapshot: state.stage2InventorySnapshot ?? (hasMop ? ["mop"] : []),
    isGameOver: false,
    isWin: false,
    lastDeathType: null,
    output: [...prefixLines, ...hintLines, ...getNodeLines(nextNode, content)],
  };
}

function resolvePeriodicalsCheck(
  state: GameState,
  inventory: ItemId[],
  prefixLines: string[],
  content?: ContentCatalog,
): GameState {
  if (inventory.includes("mop")) {
    const nextNode: NodeId = "stage2_reading_room_door";
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

  const nextNode: NodeId = "stage2_death_choice";
  recordDeath({
    stage: "stage2",
    death_type: "monster_attack",
    node_id: "stage2_periodicals_check",
  });
  const deathLines = getDeathScreenLines("stage2_periodicals_check", NO_MOP_CHOICE, content);
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

function resolveStacksDoorCheck(
  state: GameState,
  inventory: ItemId[],
  prefixLines: string[],
  content?: ContentCatalog,
): GameState {
  const hasStacksKey = inventory.includes("stacks key");
  const nextNode: NodeId = hasStacksKey ? "stage3_arrival" : "stage2_stacks_door_locked_no_key";

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

export function transitionStage2(
  state: GameState,
  rawInput: string,
  content?: ContentCatalog,
): GameState {
  if (!isStage2Node(state.currentNode)) {
    return state;
  }

  if (state.currentNode === "stage2_respawn_check") {
    return resolveRespawnCheck(state, state.inventory, [], content);
  }

  if (state.currentNode === "stage2_periodicals_check") {
    return resolvePeriodicalsCheck(state, state.inventory, [], content);
  }

  if (state.currentNode === "stage2_stacks_door_check") {
    return resolveStacksDoorCheck(state, state.inventory, [], content);
  }

  const normalized = rawInput.trim().toLowerCase();
  if (!normalized) {
    return {
      ...state,
      lastDeathType: null,
      output: getParserFallback(0, content),
    };
  }

  const choices = STAGE2_TRANSITIONS[state.currentNode];
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

  const nextInventory = mutateInventory(
    state.inventory,
    matchedChoice.addItems,
    matchedChoice.removeItems,
  );
  const nextNode = matchedChoice.target;

  if (nextNode === "stage2_respawn_check") {
    return resolveRespawnCheck(state, nextInventory, [], content);
  }

  if (nextNode === "stage2_periodicals_check") {
    const checkLines = getNodeLines(nextNode, content);
    return resolvePeriodicalsCheck(state, nextInventory, checkLines, content);
  }

  if (nextNode === "stage2_stacks_door_check") {
    const checkLines = getNodeLines(nextNode, content);
    return resolveStacksDoorCheck(state, nextInventory, checkLines, content);
  }

  if (matchedChoice.deathType) {
    recordDeath({
      stage: "stage2",
      death_type: matchedChoice.deathType,
      node_id: state.currentNode,
    });
  }

  if (nextNode === "game_over") {
    recordRunCompleted({
      outcome: "loss",
      final_stage: "stage2",
    });
  } else if (nextNode === "game_win") {
    recordRunCompleted({
      outcome: "win",
      final_stage: "stage2",
    });
  }

  const deathLines = matchedChoice.deathType
    ? getDeathScreenLines(state.currentNode, matchedChoice.command, content)
    : [];
  const nodeLines = getNodeLines(nextNode, content);
  const stage2InventorySnapshot =
    state.stage2InventorySnapshot ??
    (state.currentNode === "stage2_foyer" ? [...state.inventory] : null);

  return {
    ...state,
    currentNode: nextNode,
    inventory: nextInventory,
    stage2InventorySnapshot,
    isGameOver: nextNode === "game_over",
    isWin: nextNode === "game_win",
    lastDeathType: matchedChoice.deathType ?? null,
    output: [...deathLines, ...nodeLines],
  };
}
