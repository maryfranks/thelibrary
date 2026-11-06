import { describe, expect, it } from "vitest";
import {
  ROW2_CORPSE_ITEMS,
  ROW4_BACKPACK_ITEMS,
  createInitialState,
  getAvailableChoices,
  loadContent,
  transition,
} from "../index";
import type { ContentCatalog, GameState, ItemId, NodeId } from "../types";

function makeState(
  currentNode: NodeId,
  inventory: ItemId[] = [],
  overrides: Partial<GameState> = {},
): GameState {
  return {
    ...createInitialState(),
    currentNode,
    inventory: [...inventory],
    ...overrides,
  };
}

describe("Stage 3 Engine (The Stacks)", () => {
  describe("stage3_arrival & stage3_early_death_choice", () => {
    it("fails arrival ambush with environmental_hazard and transitions to stage3_early_death_choice when holding mop (without fireplace poker)", () => {
      const stateWithMop = makeState("stage3_arrival", ["mop", "stacks key"]);
      const next = transition(stateWithMop, "1");

      expect(next.currentNode).toBe("stage3_early_death_choice");
      expect(next.lastDeathType).toBe("environmental_hazard");
      expect(next.isGameOver).toBe(false);
      expect(next.isWin).toBe(false);
    });

    it("survives arrival ambush and transitions to stage3_hub_unexplored when holding fireplace poker", () => {
      const stateWithPoker = makeState("stage3_arrival", ["stacks key", "fireplace poker"]);
      const next = transition(stateWithPoker, "2");

      expect(next.currentNode).toBe("stage3_hub_unexplored");
      expect(next.lastDeathType).toBeNull();
      expect(next.inventory).toEqual(["stacks key", "fireplace poker"]);
      expect(next.isGameOver).toBe(false);
    });

    it("respawns at stage2_foyer on 'try again' and ends game on 'give up' from stage3_early_death_choice", () => {
      const state = makeState("stage3_early_death_choice", ["mop", "stacks key"]);

      const retried = transition(state, "try again");
      expect(retried.currentNode).toBe("stage2_foyer");
      expect(retried.lastDeathType).toBeNull();
      expect(retried.isGameOver).toBe(false);

      const gaveUp = transition(state, "give up");
      expect(gaveUp.currentNode).toBe("game_over");
      expect(gaveUp.lastDeathType).toBeNull();
      expect(gaveUp.isGameOver).toBe(true);
    });
    it("lets a mop holder who died at arrival retry, get the poker and reach stage3_hub_unexplored (no soft-lock)", () => {
      let state = makeState("stage2_stacks_door_check", ["mop", "stacks key"], {
        stage2InventorySnapshot: ["mop"],
      });
      state = transition(state, "");
      expect(state.currentNode).toBe("stage3_early_death_choice");
      expect(state.lastDeathType).toBe("environmental_hazard");

      state = transition(state, "try again");
      expect(state.currentNode).toBe("stage2_foyer");
      expect(state.inventory).toEqual(["mop"]);

      state = transition(state, "look around");
      expect(state.currentNode).toBe("stage2_foyer_searched");
      state = transition(state, "search desk");
      expect(state.inventory).toContain("stacks key");
      state = transition(state, "explore periodicals");
      expect(state.currentNode).toBe("stage2_reading_room_door");
      state = transition(state, "try the lock quietly");
      state = transition(state, "look around");
      expect(state.currentNode).toBe("stage2_fireplace_revealed");
      state = transition(state, "search fireplace");
      expect(state.inventory).toContain("fireplace poker");
      state = transition(state, "go deeper");
      expect(state.currentNode).toBe("stage3_hub_unexplored");
      expect(state.stage3InventorySnapshot).toEqual([
        "small notebook",
        "stacks key",
        "fireplace poker",
      ]);
    });

    it("never rests on stage3_arrival: resolves on entry from stage 2", () => {
      const withMop = transition(
        makeState("stage2_poker_acquired", ["mop", "stacks key"]),
        "go deeper",
      );
      expect(withMop.currentNode).toBe("stage3_early_death_choice");
      expect(withMop.lastDeathType).toBe("environmental_hazard");
    });
  });

  describe("stage3_hub_unexplored", () => {
    it("triggers monster_attack and transitions to stage3_early_death_choice on 'go deeper'", () => {
      const state = makeState("stage3_hub_unexplored", ["fireplace poker"]);
      const next = transition(state, "go deeper");

      expect(next.currentNode).toBe("stage3_early_death_choice");
      expect(next.lastDeathType).toBe("monster_attack");
      expect(next.isGameOver).toBe(false);
    });

    it("stays at stage3_hub_unexplored on 'go back toward foyer'", () => {
      const state = makeState("stage3_hub_unexplored", ["fireplace poker"]);
      const next = transition(state, "go back toward foyer");

      expect(next.currentNode).toBe("stage3_hub_unexplored");
      expect(next.lastDeathType).toBeNull();
    });

    it("transitions to stage3_hub on 'look around'", () => {
      const state = makeState("stage3_hub_unexplored", ["fireplace poker"]);
      const next = transition(state, "look around");

      expect(next.currentNode).toBe("stage3_hub");
      expect(next.lastDeathType).toBeNull();
    });
  });

  describe("stage3_hub row safety checks (Rows 1–4) & stage3_death_choice", () => {
    it("initializes row1_safe through row5_safe as false", () => {
      const state = createInitialState();
      expect(state.row1_safe).toBe(false);
      expect(state.row2_safe).toBe(false);
      expect(state.row3_safe).toBe(false);
      expect(state.row4_safe).toBe(false);
      expect(state.row5_safe).toBe(false);
    });

    it("triggers monster_attack and transitions to stage3_death_choice when going down Rows 1–4 blindly without peering first", () => {
      const hub = makeState("stage3_hub", ["fireplace poker"]);

      for (const row of [1, 2, 3, 4]) {
        const result = transition(hub, `go down row ${row}`);
        expect(result.currentNode).toBe("stage3_death_choice");
        expect(result.lastDeathType).toBe("monster_attack");
        expect(result.isGameOver).toBe(false);
      }
    });

    it("sets row1_safe..row4_safe when peering and allows safe movement into row encounters", () => {
      let state = makeState("stage3_hub", ["fireplace poker"]);

      state = transition(state, "peer down row 1");
      expect(state.currentNode).toBe("stage3_hub");
      expect(state.row1_safe).toBe(true);
      expect(state.lastDeathType).toBeNull();
      const row1 = transition(state, "go down row 1");
      expect(row1.currentNode).toBe("stage3_row1_encounter");
      expect(row1.lastDeathType).toBeNull();

      state = transition(state, "peer down row 2");
      expect(state.row2_safe).toBe(true);
      const row2 = transition(state, "go down row 2");
      expect(row2.currentNode).toBe("stage3_row2_encounter");
      expect(row2.lastDeathType).toBeNull();

      state = transition(state, "peer down row 3");
      expect(state.row3_safe).toBe(true);
      const row3 = transition(state, "go down row 3");
      expect(row3.currentNode).toBe("stage3_row3_encounter");
      expect(row3.lastDeathType).toBeNull();

      state = transition(state, "peer down row 4");
      expect(state.row4_safe).toBe(true);
      const row4 = transition(state, "go down row 4");
      expect(row4.currentNode).toBe("stage3_row4_encounter");
      expect(row4.lastDeathType).toBeNull();
    });

    it("respawns at stage3_hub_unexplored and restores Stage 3 snapshot on 'try again' and ends game on 'give up' from stage3_death_choice", () => {
      const deathState = makeState(
        "stage3_death_choice",
        ["fireplace poker", "stacks key", "pocketknife", "umbrella"],
        {
          stage3InventorySnapshot: ["fireplace poker", "stacks key"],
          row1_safe: true,
        },
      );

      const retried = transition(deathState, "try again");
      expect(retried.currentNode).toBe("stage3_hub_unexplored");
      expect(retried.inventory).toEqual(["fireplace poker", "stacks key"]);
      expect(retried.row1_safe).toBe(true);
      expect(retried.lastDeathType).toBeNull();
      expect(retried.isGameOver).toBe(false);

      const gaveUp = transition(deathState, "give up");
      expect(gaveUp.currentNode).toBe("game_over");
      expect(gaveUp.isGameOver).toBe(true);
    });
  });

  describe("Row 5 peek counter and fatal conditions", () => {
    it("sets row5_safe = true on first 'peer down row 5' and stays at stage3_hub", () => {
      const hub = makeState("stage3_hub", ["fireplace poker"]);
      const firstPeek = transition(hub, "peer down row 5");

      expect(firstPeek.currentNode).toBe("stage3_hub");
      expect(firstPeek.row5_safe).toBe(true);
      expect(firstPeek.lastDeathType).toBeNull();
      expect(firstPeek.isGameOver).toBe(false);
    });

    it("triggers unknown_death and transitions to stage3_death_choice on second 'peer down row 5'", () => {
      const hub = makeState("stage3_hub", ["fireplace poker"]);
      const firstPeek = transition(hub, "peer down row 5");
      const secondPeek = transition(firstPeek, "peer down row 5");

      expect(secondPeek.currentNode).toBe("stage3_death_choice");
      expect(secondPeek.lastDeathType).toBe("unknown_death");
      expect(secondPeek.isGameOver).toBe(false);
    });

    it("triggers unknown_death and transitions to stage3_death_choice on 'go down row 5' whether or not row5_safe is set", () => {
      const unpeered = makeState("stage3_hub", ["fireplace poker"], { row5_safe: false });
      const unpeeredResult = transition(unpeered, "go down row 5");
      expect(unpeeredResult.currentNode).toBe("stage3_death_choice");
      expect(unpeeredResult.lastDeathType).toBe("unknown_death");

      const peered = makeState("stage3_hub", ["fireplace poker"], { row5_safe: true });
      const peeredResult = transition(peered, "go down row 5");
      expect(peeredResult.currentNode).toBe("stage3_death_choice");
      expect(peeredResult.lastDeathType).toBe("unknown_death");
    });
  });

  describe("Row 1 & Row 3 encounters", () => {
    it("handles Row 1 glass view, fatal reading room entry, and returning to hub", () => {
      const row1 = makeState("stage3_row1_encounter", ["fireplace poker"]);

      const fatalDirect = transition(row1, "enter the reading room");
      expect(fatalDirect.currentNode).toBe("stage3_death_choice");
      expect(fatalDirect.lastDeathType).toBe("monster_attack");

      const backFromEncounter = transition(row1, "go back");
      expect(backFromEncounter.currentNode).toBe("stage3_hub");

      const glassView = transition(row1, "look through the glass door");
      expect(glassView.currentNode).toBe("stage3_row1_glass_view");
      expect(glassView.lastDeathType).toBeNull();

      const fatalFromGlass = transition(glassView, "enter the reading room");
      expect(fatalFromGlass.currentNode).toBe("stage3_death_choice");
      expect(fatalFromGlass.lastDeathType).toBe("monster_attack");

      const backFromGlass = transition(glassView, "go back");
      expect(backFromGlass.currentNode).toBe("stage3_hub");
    });

    it("handles Row 3 fatal 'walk down row' trap and 'return to hub'", () => {
      const row3 = makeState("stage3_row3_encounter", ["fireplace poker"]);

      const fatalWalk = transition(row3, "walk down row");
      expect(fatalWalk.currentNode).toBe("stage3_death_choice");
      expect(fatalWalk.lastDeathType).toBe("monster_attack");

      const returned = transition(row3, "return to hub");
      expect(returned.currentNode).toBe("stage3_hub");
      expect(returned.lastDeathType).toBeNull();
    });
  });

  describe("Row 2 & Row 4 looting", () => {
    it("loots Row 2 corpse to acquire pocketknife and umbrella and return to hub", () => {
      const row2 = makeState("stage3_row2_encounter", ["fireplace poker"]);
      const looted = transition(row2, "search corpse");

      expect(looted.currentNode).toBe("stage3_row2_looted");
      expect(looted.lastDeathType).toBeNull();
      expect(looted.inventory).toEqual(["fireplace poker", ...ROW2_CORPSE_ITEMS]);
      expect(looted.inventory).toContain("pocketknife");
      expect(looted.inventory).toContain("umbrella");

      const backToHub = transition(looted, "return to hub");
      expect(backToHub.currentNode).toBe("stage3_hub");
      expect(backToHub.inventory).toEqual(["fireplace poker", ...ROW2_CORPSE_ITEMS]);
    });

    it("loots Row 4 backpack to acquire all 6 items, blocks 'go deeper', and returns to hub", () => {
      const row4 = makeState("stage3_row4_encounter", ["fireplace poker"]);

      const fatalBeforeLoot = transition(row4, "go deeper");
      expect(fatalBeforeLoot.currentNode).toBe("stage3_death_choice");
      expect(fatalBeforeLoot.lastDeathType).toBe("monster_attack");

      const looted = transition(row4, "search backpack");
      expect(looted.currentNode).toBe("stage3_row4_looted");
      expect(looted.lastDeathType).toBeNull();
      expect(looted.inventory).toEqual(["fireplace poker", ...ROW4_BACKPACK_ITEMS]);
      expect(looted.inventory).toContain("water");
      expect(looted.inventory).toContain("flashlight");
      expect(looted.inventory).toContain("second snack");
      expect(looted.inventory).toContain("notebook");
      expect(looted.inventory).toContain("dictionary");
      expect(looted.inventory).toContain("pencil");

      const fatalAfterLoot = transition(looted, "go deeper");
      expect(fatalAfterLoot.currentNode).toBe("stage3_death_choice");
      expect(fatalAfterLoot.lastDeathType).toBe("monster_attack");

      const backToHub = transition(looted, "return to hub");
      expect(backToHub.currentNode).toBe("stage3_hub");
      expect(backToHub.inventory).toEqual(["fireplace poker", ...ROW4_BACKPACK_ITEMS]);
    });
  });

  describe("Row 2 flashlight check (stage3_row2_flashlight_check -> Stage 4)", () => {
    it("blocks progression with monster_attack and transitions to stage3_death_choice when moving deeper in Row 2 without flashlight", () => {
      const row2Unlooted = makeState("stage3_row2_encounter", ["fireplace poker"]);
      const failedFromEncounter = transition(row2Unlooted, "move deeper");
      expect(failedFromEncounter.currentNode).toBe("stage3_death_choice");
      expect(failedFromEncounter.lastDeathType).toBe("monster_attack");

      const row2LootedNoFlashlight = makeState("stage3_row2_looted", [
        "fireplace poker",
        "pocketknife",
        "umbrella",
      ]);
      const failedFromLooted = transition(row2LootedNoFlashlight, "move deeper");
      expect(failedFromLooted.currentNode).toBe("stage3_death_choice");
      expect(failedFromLooted.lastDeathType).toBe("monster_attack");
    });

    it("advances to stage4_entry when moving deeper in Row 2 with flashlight in inventory", () => {
      const row2WithFlashlight = makeState("stage3_row2_looted", [
        "fireplace poker",
        "pocketknife",
        "umbrella",
        "flashlight",
      ]);
      const next = transition(row2WithFlashlight, "move deeper");

      expect(next.currentNode).toBe("stage4_entry");
      expect(next.lastDeathType).toBeNull();
      expect(next.isGameOver).toBe(false);
      expect(next.inventory).toContain("flashlight");
    });

    it("evaluates direct transitions from stage3_row2_flashlight_check based on flashlight presence", () => {
      const checkNoFlashlight = makeState("stage3_row2_flashlight_check", ["fireplace poker"]);
      const blocked = transition(checkNoFlashlight, "1");
      expect(blocked.currentNode).toBe("stage3_death_choice");
      expect(blocked.lastDeathType).toBe("monster_attack");

      const checkWithFlashlight = makeState("stage3_row2_flashlight_check", [
        "fireplace poker",
        "flashlight",
      ]);
      const advanced = transition(checkWithFlashlight, "2");
      expect(advanced.currentNode).toBe("stage4_entry");
      expect(advanced.lastDeathType).toBeNull();
    });
  });

  describe("available choices, invalid inputs, and content decoupling", () => {
    it("returns Stage 3 choices via getAvailableChoices", () => {
      expect(getAvailableChoices("stage3_hub_unexplored")).toEqual([
        "go deeper",
        "go back toward foyer",
        "look around",
      ]);
      expect(getAvailableChoices("stage3_death_choice")).toEqual(["try again", "give up"]);
    });

    it("remains on the current node and outputs parser fallback on unmatched commands", () => {
      const catalog = loadContent();
      const state = makeState("stage3_hub", ["fireplace poker"]);
      const next = transition(state, "fly away", catalog);

      expect(next.currentNode).toBe("stage3_hub");
      expect(next.lastDeathType).toBeNull();
      expect(next.output).toEqual([catalog.parser_fallbacks[0]]);
    });

    it("resolves Stage 3 node descriptions and death screens dynamically from injected catalog", () => {
      const customCatalog: ContentCatalog = {
        intro: ["intro"],
        nodes: {
          stage3_hub: ["hub-node"],
          stage3_death_choice: ["stage3-death-node"],
          stage3_row2_flashlight_check: ["flashlight-check-node"],
          stage4_entry: ["stage4-entry-node"],
        },
        death_screens: {
          stage3_hub__go_down_row_1__else: ["row1-blind-death"],
          stage3_row2_flashlight_check__no_flashlight_check: ["no-flashlight-death"],
        },
        parser_fallbacks: ["fallback"],
      };

      const blindRow1 = transition(makeState("stage3_hub"), "go down row 1", customCatalog);
      expect(blindRow1.output).toEqual(["row1-blind-death", "stage3-death-node"]);

      const noFlashlight = transition(
        makeState("stage3_row2_looted"),
        "move deeper",
        customCatalog,
      );
      expect(noFlashlight.output).toEqual([
        "flashlight-check-node",
        "no-flashlight-death",
        "stage3-death-node",
      ]);
    });
  });
});
