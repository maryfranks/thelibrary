import { getDeathScreenLines, getNodeLines, getParserFallback } from "./content";
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
      command: "look around",
      target: "stage1_vestibule_searched",
    },
    {
      command: "look in the pack",
      target: "stage1_pack_checked",
    },
  ],
  stage1_pack_checked: [
    {
      command: "look around",
      target: "stage1_vestibule_searched",
    },
    {
      command: "look in the pack",
      target: "stage1_pack_checked",
    },
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
      command: "look around",
      target: "stage1_vestibule_searched",
    },
    {
      command: "look in the pack",
      target: "stage1_pack_checked",
    },
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
      command: "look around",
      target: "stage1_mop_acquired",
    },
    {
      command: "look in the pack",
      target: "stage1_pack_checked",
    },
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

export function transitionStage1(
  state: GameState,
  rawInput: string,
  content?: ContentCatalog,
): GameState {
  if (!isStage1Node(state.currentNode)) {
    return state;
  }

  const normalized = rawInput.trim().toLowerCase();
  const choices = STAGE1_TRANSITIONS[state.currentNode];

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
  const nextNode = matchedChoice.target;
  const deathLines = matchedChoice.deathType
    ? getDeathScreenLines(state.currentNode, matchedChoice.command, content)
    : [];
  const nodeLines = getNodeLines(nextNode, content);

  return {
    ...state,
    currentNode: nextNode,
    inventory: nextInventory,
    isGameOver: nextNode === "game_over",
    isWin: nextNode === "game_win",
    lastDeathType: matchedChoice.deathType ?? null,
    output: [...deathLines, ...nodeLines],
  };
}
