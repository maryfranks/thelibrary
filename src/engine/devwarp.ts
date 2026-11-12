// src/engine/devWarp.ts
import { getNodeLines } from "./content";
import type { ContentCatalog, GameState, ItemId, NodeId } from "./types";

interface DevWarpPreset {
  node: NodeId;
  inventory: ItemId[];
  flags?: Partial<GameState>;
}

const DEV_WARP_TABLE: Record<string, DevWarpPreset> = {
  stage1: {
    node: "stage1_vestibule",
    inventory: [
        // "snack", "novel", "pen" // uncomment these once the empty pack in the vestibule is fixed
    ],
  },
  stage2: {
    node: "stage2_foyer",
    inventory: [
        // "snack", "novel", "pen", 
        "mop"],
  },
  stage3: {
    node: "stage3_hub_unexplored",
    inventory: [
    //   "snack",
    //   "novel",
    //   "pen",
      "fireplace poker",
      "stacks key",
      "lemon candy",
      "pack of gum",
      "mace",
      "hair ties",
      "small notebook",
    ],
    flags: {
      stage3InventorySnapshot: [
        // "snack", "novel", "pen", 
        "fireplace poker"],
    },
  },
  stage4: {
    node: "stage4_entry",
    inventory: [
    //   "snack",
    //   "novel",
    //   "pen",
      "fireplace poker",
      "pocketknife",
      "umbrella",
      "flashlight",
      "water",
      "second snack",
      "notebook",
      "dictionary",
      "pencil",
    ],
  },
  "stage5 mezzanine": {
    node: "stage5_mezzanine_arrival",
    inventory: [
      "pocketknife",
      "umbrella",
      "flashlight",
      "water",
      "notebook",
      "pencil",
    ],
  },
  "stage5 basement": {
    node: "stage5_basement_arrival",
    inventory: [
      "umbrella",
      "pocketknife",
      "flashlight",
      "water",
      "dictionary",
    ],
  },
};

/**
 * Checks if rawInput matches any developer warp command.
 * Returns updated GameState if handled, or null to continue normal engine evaluation.
 */
export function tryDevWarp(
  state: GameState,
  rawInput: string,
  content?: ContentCatalog,
): GameState | null {
    // Disables dev warp on any production build / Cloudflare deployment
    if (!import.meta.env.DEV) {
        return null;
    }

  const command = rawInput.trim().toLowerCase();
  const preset = DEV_WARP_TABLE[command];
  if (!preset) return null;

  const nodeLines = getNodeLines(preset.node, content);

  return {
    ...state,
    currentNode: preset.node,
    inventory: [...preset.inventory],
    isGameOver: false,
    isWin: false,
    lastDeathType: null,
    ...(preset.flags ?? {}),
    output: [
      `\x1b[33m[DEV WARP -> ${preset.node}]\x1b[0m`,
      ...nodeLines,
    ],
  };
}
