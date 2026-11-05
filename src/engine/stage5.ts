import { getDeathScreenLines, getNodeLines, getParserFallback } from "./content";
import type { ContentCatalog, DeathType, GameState, ItemId, NodeId, Stage5NodeId } from "./types";

interface Stage5ChoiceDefinition {
  command: string;
  target: NodeId;
  deathType?: DeathType;
}

const NO_UMBRELLA_CHOICE = "no umbrella check";
const WITH_UMBRELLA_CHOICE = "with umbrella check";

const MEZZANINE_UMBRELLA_CHECK_CHOICES: Stage5ChoiceDefinition[] = [
  {
    command: NO_UMBRELLA_CHOICE,
    target: "game_over",
    deathType: "monster_attack",
  },
  {
    command: WITH_UMBRELLA_CHOICE,
    target: "game_over",
    deathType: "monster_attack",
  },
];

export const STAGE5_TRANSITIONS: Record<Stage5NodeId, Stage5ChoiceDefinition[]> = {
  stage5_mezzanine_arrival: [
    {
      command: "go forward",
      target: "stage5_mezzanine_death_choice",
      deathType: "environmental_hazard",
    },
    {
      command: "look around",
      target: "stage5_mezzanine_searched",
    },
  ],
  stage5_mezzanine_death_choice: [
    {
      command: "try again",
      target: "stage5_mezzanine_arrival",
    },
    {
      command: "give up",
      target: "game_over",
    },
  ],
  stage5_mezzanine_searched: [
    {
      command: "look around",
      target: "stage5_mezzanine_searched",
    },
    {
      command: "look in the pack",
      target: "stage5_mezzanine_searched",
    },
    {
      command: "look over railing",
      target: "stage5_mezzanine_death_choice",
      deathType: "monster_attack",
    },
    {
      command: "sneak through stacks",
      target: "stage5_balcony_door",
    },
  ],
  stage5_balcony_door: [
    {
      command: "go out on the balcony",
      target: "stage5_mezzanine_death_choice",
      deathType: "environmental_hazard",
    },
    {
      command: "inspect balcony",
      target: "stage5_balcony_inspected",
    },
  ],
  stage5_balcony_inspected: [
    {
      command: "go out on the balcony",
      target: "stage5_mezzanine_death_choice",
      deathType: "environmental_hazard",
    },
    {
      command: "go back",
      target: "stage5_mezzanine_umbrella_check",
    },
  ],
  stage5_mezzanine_umbrella_check: MEZZANINE_UMBRELLA_CHECK_CHOICES,
  stage5_basement_arrival: [
    {
      command: "go down the stairs",
      target: "stage5_basement_death_choice",
      deathType: "environmental_hazard",
    },
    {
      command: "look around",
      target: "stage5_basement_searched",
    },
  ],
  stage5_basement_death_choice: [
    {
      command: "try again",
      target: "stage5_basement_arrival",
    },
    {
      command: "give up",
      target: "game_over",
    },
  ],
  stage5_basement_searched: [
    {
      command: "go further",
      target: "stage5_basement_umbrella_check",
    },
  ],
  stage5_basement_umbrella_check: [
    {
      command: NO_UMBRELLA_CHOICE,
      target: "game_over",
      deathType: "environmental_hazard",
    },
    {
      command: WITH_UMBRELLA_CHOICE,
      target: "stage5_flooded_corridor",
    },
  ],
  stage5_flooded_corridor: [
    {
      command: "go back",
      target: "stage5_flooded_corridor",
    },
    {
      command: "enter the water",
      target: "stage5_water_step_1",
    },
  ],
  stage5_water_step_1: [
    {
      command: "jump in",
      target: "stage5_basement_death_choice",
      deathType: "monster_attack",
    },
    {
      command: "enter the water slowly",
      target: "stage5_water_step_2",
    },
  ],
  stage5_water_step_2: [
    {
      command: "start running",
      target: "stage5_basement_death_choice",
      deathType: "monster_attack",
    },
    {
      command: "go slowly",
      target: "stage5_water_step_3",
    },
  ],
  stage5_water_step_3: [
    {
      command: "rush out of the water",
      target: "stage5_basement_death_choice",
      deathType: "monster_attack",
    },
    {
      command: "slowly climb out",
      target: "stage5_occult_archive_entry",
    },
  ],
  stage5_occult_archive_entry: [
    {
      command: "go towards the light",
      target: "stage5_basement_death_choice",
      deathType: "environmental_hazard",
    },
    {
      command: "look around",
      target: "stage5_occult_archive_hub",
    },
  ],
  stage5_occult_archive_hub: [
    {
      command: "try the windows",
      target: "stage5_windows_tested_hub",
    },
    {
      command: "search desk",
      target: "stage5_desk_searched_hub",
    },
    {
      command: "approach cave",
      target: "stage5_cave_approach_partial",
    },
  ],
  stage5_windows_tested_hub: [
    {
      command: "search desk",
      target: "stage5_both_tested_hub",
    },
    {
      command: "approach cave",
      target: "stage5_cave_approach_partial",
    },
  ],
  stage5_desk_searched_hub: [
    {
      command: "try the windows",
      target: "stage5_both_tested_hub",
    },
    {
      command: "approach cave",
      target: "stage5_cave_approach_partial",
    },
  ],
  stage5_both_tested_hub: [
    {
      command: "approach cave",
      target: "stage5_cave_approach_final",
    },
  ],
  stage5_cave_approach_partial: [
    {
      command: "go back to archive",
      target: "stage5_occult_archive_hub",
    },
    {
      command: "climb out to safety",
      target: "game_win",
    },
  ],
  stage5_cave_approach_final: [
    {
      command: "climb out to safety",
      target: "game_win",
    },
  ],
};

export function isStage5Node(nodeId: NodeId): nodeId is Stage5NodeId {
  return Object.prototype.hasOwnProperty.call(STAGE5_TRANSITIONS, nodeId);
}

export function getStage5Choices(nodeId: Stage5NodeId): string[] {
  return STAGE5_TRANSITIONS[nodeId].map((choice) => choice.command);
}

function resolveMezzanineUmbrellaCheck(
  state: GameState,
  inventory: ItemId[],
  prefixLines: string[],
  content?: ContentCatalog,
): GameState {
  const hasUmbrella = inventory.includes("umbrella");
  const choice = hasUmbrella ? WITH_UMBRELLA_CHOICE : NO_UMBRELLA_CHOICE;
  const nextNode: NodeId = "game_over";
  const deathLines = getDeathScreenLines("stage5_mezzanine_umbrella_check", choice, content);

  return {
    ...state,
    currentNode: nextNode,
    inventory: [...inventory],
    isGameOver: true,
    isWin: false,
    lastDeathType: "monster_attack",
    output: [...prefixLines, ...deathLines, ...getNodeLines(nextNode, content)],
  };
}

function resolveBasementUmbrellaCheck(
  state: GameState,
  inventory: ItemId[],
  prefixLines: string[],
  content?: ContentCatalog,
): GameState {
  const hasUmbrella = inventory.includes("umbrella");
  if (hasUmbrella) {
    const nextNode: NodeId = "stage5_flooded_corridor";
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

  const nextNode: NodeId = "game_over";
  const deathLines = getDeathScreenLines(
    "stage5_basement_umbrella_check",
    NO_UMBRELLA_CHOICE,
    content,
  );
  return {
    ...state,
    currentNode: nextNode,
    inventory: [...inventory],
    isGameOver: true,
    isWin: false,
    lastDeathType: "environmental_hazard",
    output: [...prefixLines, ...deathLines, ...getNodeLines(nextNode, content)],
  };
}

export function transitionStage5(
  state: GameState,
  rawInput: string,
  content?: ContentCatalog,
): GameState {
  if (!isStage5Node(state.currentNode)) {
    return state;
  }

  if (state.currentNode === "stage5_mezzanine_umbrella_check") {
    return resolveMezzanineUmbrellaCheck(state, state.inventory, [], content);
  }

  if (state.currentNode === "stage5_basement_umbrella_check") {
    return resolveBasementUmbrellaCheck(state, state.inventory, [], content);
  }

  const normalized = rawInput.trim().toLowerCase();
  if (!normalized) {
    return {
      ...state,
      lastDeathType: null,
      output: getParserFallback(0, content),
    };
  }

  const choices = STAGE5_TRANSITIONS[state.currentNode];
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

  if (nextNode === "stage5_mezzanine_umbrella_check") {
    const checkLines = getNodeLines(nextNode, content);
    return resolveMezzanineUmbrellaCheck(state, state.inventory, checkLines, content);
  }

  if (nextNode === "stage5_basement_umbrella_check") {
    const checkLines = getNodeLines(nextNode, content);
    return resolveBasementUmbrellaCheck(state, state.inventory, checkLines, content);
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
