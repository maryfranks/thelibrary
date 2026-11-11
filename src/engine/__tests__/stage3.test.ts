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

    it("respawns at stage2_foyer when dying at arrival and at stage3_hub_unexplored when dying after arrival on 'try again', and ends game on 'give up' from stage3_early_death_choice", () => {
      const arrivalDeathState = makeState("stage3_early_death_choice", ["mop", "stacks key"]);

      const retriedArrival = transition(arrivalDeathState, "try again");
      expect(retriedArrival.currentNode).toBe("stage2_foyer");
      expect(retriedArrival.lastDeathType).toBeNull();
      expect(retriedArrival.isGameOver).toBe(false);

      const postArrivalDeathState = makeState(
        "stage3_early_death_choice",
        ["stacks key", "fireplace poker"],
        {
          stage3InventorySnapshot: ["stacks key", "fireplace poker"],
        },
      );
      const retriedPostArrival = transition(postArrivalDeathState, "try again");
      expect(retriedPostArrival.currentNode).toBe("stage3_hub_unexplored");
      expect(retriedPostArrival.inventory).toEqual(["stacks key", "fireplace poker"]);
      expect(retriedPostArrival.lastDeathType).toBeNull();
      expect(retriedPostArrival.isGameOver).toBe(false);

      const gaveUp = transition(arrivalDeathState, "give up");
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

  describe("stage3_hub_unexplored & stage3_foyer_blocked", () => {
    it("triggers monster_attack and transitions to stage3_early_death_choice on 'go deeper' at stage3_hub_unexplored", () => {
      const state = makeState("stage3_hub_unexplored", ["fireplace poker"]);
      const next = transition(state, "go deeper");

      expect(next.currentNode).toBe("stage3_early_death_choice");
      expect(next.lastDeathType).toBe("monster_attack");
      expect(next.isGameOver).toBe(false);
    });

    it("transitions to stage3_foyer_blocked on 'go back' at stage3_hub_unexplored", () => {
      const state = makeState("stage3_hub_unexplored", ["fireplace poker"]);
      const next = transition(state, "go back");

      expect(next.currentNode).toBe("stage3_foyer_blocked");
      expect(next.lastDeathType).toBeNull();
      expect(next.isGameOver).toBe(false);
    });

    it("transitions to stage3_hub on 'look around' at stage3_hub_unexplored", () => {
      const state = makeState("stage3_hub_unexplored", ["fireplace poker"]);
      const next = transition(state, "look around");

      expect(next.currentNode).toBe("stage3_hub");
      expect(next.lastDeathType).toBeNull();
    });

    it("handles stage3_foyer_blocked: fatal 'go deeper' to stage3_early_death_choice and safe 'look around' to stage3_hub", () => {
      const blocked = makeState("stage3_foyer_blocked", ["fireplace poker"], {
        stage3InventorySnapshot: ["fireplace poker"],
      });

      const fatalDeeper = transition(blocked, "go deeper");
      expect(fatalDeeper.currentNode).toBe("stage3_early_death_choice");
      expect(fatalDeeper.lastDeathType).toBe("monster_attack");
      expect(fatalDeeper.isGameOver).toBe(false);

      const retried = transition(fatalDeeper, "try again");
      expect(retried.currentNode).toBe("stage3_hub_unexplored");
      expect(retried.inventory).toEqual(["fireplace poker"]);

      const lookedAround = transition(blocked, "look around");
      expect(lookedAround.currentNode).toBe("stage3_hub");
      expect(lookedAround.lastDeathType).toBeNull();
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

    it("sets row1_safe, row2_safe, and row4_safe when peering and allows safe movement, while Row 3 stays unsafe and is unconditionally fatal", () => {
      const catalog = loadContent();
      let state = makeState("stage3_hub", ["fireplace poker"]);

      state = transition(state, "peer down row 1");
      expect(state.currentNode).toBe("stage3_hub");
      expect(state.row1_safe).toBe(true);
      expect(state.lastDeathType).toBeNull();
      expect(state.output).toEqual([
        ...catalog.nodes["stage3_hub__peer_down_row_1"],
        ...catalog.nodes["stage3_hub"],
      ]);
      const row1 = transition(state, "go down row 1");
      expect(row1.currentNode).toBe("stage3_row1_encounter");
      expect(row1.lastDeathType).toBeNull();

      state = transition(state, "peer down row 2");
      expect(state.row2_safe).toBe(true);
      expect(state.output).toEqual([
        ...catalog.nodes["stage3_hub__peer_down_row_2"],
        ...catalog.nodes["stage3_hub"],
      ]);
      const row2 = transition(state, "go down row 2");
      expect(row2.currentNode).toBe("stage3_row2_encounter");
      expect(row2.lastDeathType).toBeNull();

      state = transition(state, "peer down row 3");
      expect(state.currentNode).toBe("stage3_hub");
      expect(state.row3_safe).toBe(false);
      expect(state.lastDeathType).toBeNull();
      expect(state.output).toEqual([
        ...catalog.nodes["stage3_hub__peer_down_row_3"],
        ...catalog.nodes["stage3_hub"],
      ]);
      const row3 = transition(state, "go down row 3");
      expect(row3.currentNode).toBe("stage3_death_choice");
      expect(row3.lastDeathType).toBe("monster_attack");

      state = transition(state, "peer down row 4");
      expect(state.row4_safe).toBe(true);
      expect(state.output).toEqual([
        ...catalog.nodes["stage3_hub__peer_down_row_4"],
        ...catalog.nodes["stage3_hub"],
      ]);
      const row4 = transition(state, "go down row 4");
      expect(row4.currentNode).toBe("stage3_row4_encounter");
      expect(row4.lastDeathType).toBeNull();
    });

    it("respawns at stage3_hub, preserves acquired Stage 3 items, and resets all row peering flags on 'try again', and ends game on 'give up' from stage3_death_choice", () => {
      const deathState = makeState(
        "stage3_death_choice",
        ["fireplace poker", "stacks key", "pocketknife", "umbrella"],
        {
          stage3InventorySnapshot: ["fireplace poker", "stacks key"],
          row1_safe: true,
          row2_safe: true,
          row3_safe: true,
          row4_safe: true,
          row5_safe: true,
        },
      );

      const retried = transition(deathState, "try again");
      expect(retried.currentNode).toBe("stage3_hub");
      expect(retried.inventory).toEqual([
        "fireplace poker",
        "stacks key",
        "pocketknife",
        "umbrella",
      ]);
      expect(retried.row1_safe).toBe(false);
      expect(retried.row2_safe).toBe(false);
      expect(retried.row3_safe).toBe(false);
      expect(retried.row4_safe).toBe(false);
      expect(retried.row5_safe).toBe(false);
      expect(retried.lastDeathType).toBeNull();
      expect(retried.isGameOver).toBe(false);

      const gaveUp = transition(deathState, "give up");
      expect(gaveUp.currentNode).toBe("game_over");
      expect(gaveUp.isGameOver).toBe(true);
    });
  });

  describe("Row 5 warning and fatal conditions", () => {
    it("transitions to stage3_row5_warning on 'peer down row 5' at stage3_hub", () => {
      const hub = makeState("stage3_hub", ["fireplace poker"]);
      const warning = transition(hub, "peer down row 5");

      expect(warning.currentNode).toBe("stage3_row5_warning");
      expect(warning.row5_safe).toBe(false);
      expect(warning.lastDeathType).toBeNull();
      expect(warning.isGameOver).toBe(false);
    });

    it("triggers unknown_death on 'peer' and returns to stage3_hub on 'go back' at stage3_row5_warning", () => {
      const warning = makeState("stage3_row5_warning", ["fireplace poker"]);

      const fatalPeer = transition(warning, "peer");
      expect(fatalPeer.currentNode).toBe("stage3_death_choice");
      expect(fatalPeer.lastDeathType).toBe("unknown_death");
      expect(fatalPeer.isGameOver).toBe(false);

      const backToHub = transition(warning, "go back");
      expect(backToHub.currentNode).toBe("stage3_hub");
      expect(backToHub.lastDeathType).toBeNull();
    });

    it("triggers unknown_death and transitions to stage3_death_choice on 'go down row 5' at stage3_hub", () => {
      const hub = makeState("stage3_hub", ["fireplace poker"]);
      const result = transition(hub, "go down row 5");
      expect(result.currentNode).toBe("stage3_death_choice");
      expect(result.lastDeathType).toBe("unknown_death");
    });
  });

  describe("Row 1 encounter", () => {
    it("handles Row 1 'look around', fatal reading room entry, and returning to hub", () => {
      const row1 = makeState("stage3_row1_encounter", ["fireplace poker"]);

      const lookedAround = transition(row1, "look around");
      expect(lookedAround.currentNode).toBe("stage3_row1_encounter");
      expect(lookedAround.lastDeathType).toBeNull();

      const fatalDirect = transition(row1, "enter the reading room");
      expect(fatalDirect.currentNode).toBe("stage3_death_choice");
      expect(fatalDirect.lastDeathType).toBe("monster_attack");

      const backFromEncounter = transition(row1, "go back");
      expect(backFromEncounter.currentNode).toBe("stage3_hub");
      expect(backFromEncounter.lastDeathType).toBeNull();
    });
  });

  describe("Row 2 & Row 4 looting", () => {
    it("loots Row 2 corpse to acquire pocketknife and umbrella and returns to hub via 'go back'", () => {
      const row2 = makeState("stage3_row2_encounter", ["fireplace poker"]);

      const directBack = transition(row2, "go back");
      expect(directBack.currentNode).toBe("stage3_hub");

      const looted = transition(row2, "search corpse");
      expect(looted.currentNode).toBe("stage3_row2_looted");
      expect(looted.lastDeathType).toBeNull();
      expect(looted.inventory).toEqual(["fireplace poker", ...ROW2_CORPSE_ITEMS]);
      expect(looted.inventory).toContain("pocketknife");
      expect(looted.inventory).toContain("umbrella");

      const backToHub = transition(looted, "go back");
      expect(backToHub.currentNode).toBe("stage3_hub");
      expect(backToHub.inventory).toEqual(["fireplace poker", ...ROW2_CORPSE_ITEMS]);
    });

    it("loots Row 4 backpack to acquire all 6 items, supports 'look around', blocks 'go deeper', and returns to hub via 'go back'", () => {
      const row4 = makeState("stage3_row4_encounter", ["fireplace poker"]);

      const fatalBeforeLoot = transition(row4, "go deeper");
      expect(fatalBeforeLoot.currentNode).toBe("stage3_death_choice");
      expect(fatalBeforeLoot.lastDeathType).toBe("monster_attack");

      const directBack = transition(row4, "go back");
      expect(directBack.currentNode).toBe("stage3_hub");

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

      const lookedAround = transition(looted, "look around");
      expect(lookedAround.currentNode).toBe("stage3_row4_looted");
      expect(lookedAround.lastDeathType).toBeNull();

      const fatalAfterLoot = transition(looted, "go deeper");
      expect(fatalAfterLoot.currentNode).toBe("stage3_death_choice");
      expect(fatalAfterLoot.lastDeathType).toBe("monster_attack");

      const backToHub = transition(looted, "go back");
      expect(backToHub.currentNode).toBe("stage3_hub");
      expect(backToHub.inventory).toEqual(["fireplace poker", ...ROW4_BACKPACK_ITEMS]);
    });
  });

  describe("Row 2 flashlight check & stage3_row2_dark_warning (stage3_row2_flashlight_check -> Stage 4)", () => {
    it("routes to non-fatal stage3_row2_dark_warning when going deeper in Row 2 without flashlight", () => {
      const row2Unlooted = makeState("stage3_row2_encounter", ["fireplace poker"]);
      const warningFromEncounter = transition(row2Unlooted, "go deeper");
      expect(warningFromEncounter.currentNode).toBe("stage3_row2_dark_warning");
      expect(warningFromEncounter.lastDeathType).toBeNull();
      expect(warningFromEncounter.isGameOver).toBe(false);

      const row2LootedNoFlashlight = makeState("stage3_row2_looted", [
        "fireplace poker",
        "pocketknife",
        "umbrella",
      ]);
      const warningFromLooted = transition(row2LootedNoFlashlight, "go deeper");
      expect(warningFromLooted.currentNode).toBe("stage3_row2_dark_warning");
      expect(warningFromLooted.lastDeathType).toBeNull();
      expect(warningFromLooted.isGameOver).toBe(false);
    });

    it("handles stage3_row2_dark_warning: fatal 'go deeper' to stage3_death_choice and safe 'go back' to stage3_hub", () => {
      const darkWarning = makeState("stage3_row2_dark_warning", [
        "fireplace poker",
        "pocketknife",
        "umbrella",
      ]);

      const fatalDeeper = transition(darkWarning, "go deeper");
      expect(fatalDeeper.currentNode).toBe("stage3_death_choice");
      expect(fatalDeeper.lastDeathType).toBe("monster_attack");
      expect(fatalDeeper.isGameOver).toBe(false);

      const backToHub = transition(darkWarning, "go back");
      expect(backToHub.currentNode).toBe("stage3_hub");
      expect(backToHub.lastDeathType).toBeNull();
    });

    it("advances to stage4_entry when going deeper in Row 2 with flashlight in inventory", () => {
      const row2WithFlashlight = makeState("stage3_row2_looted", [
        "fireplace poker",
        "pocketknife",
        "umbrella",
        "flashlight",
      ]);
      const next = transition(row2WithFlashlight, "go deeper");

      expect(next.currentNode).toBe("stage4_entry");
      expect(next.lastDeathType).toBeNull();
      expect(next.isGameOver).toBe(false);
      expect(next.inventory).toContain("flashlight");
    });

    it("evaluates direct transitions from stage3_row2_flashlight_check based on flashlight presence", () => {
      const checkNoFlashlight = makeState("stage3_row2_flashlight_check", ["fireplace poker"]);
      const warning = transition(checkNoFlashlight, "1");
      expect(warning.currentNode).toBe("stage3_row2_dark_warning");
      expect(warning.lastDeathType).toBeNull();

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
        "go back",
        "look around",
      ]);
      expect(getAvailableChoices("stage3_foyer_blocked")).toEqual(["go deeper", "look around"]);
      expect(getAvailableChoices("stage3_row1_encounter")).toEqual([
        "look around",
        "enter the reading room",
        "go back",
      ]);
      expect(getAvailableChoices("stage3_row2_encounter")).toEqual([
        "search corpse",
        "go deeper",
        "go back",
      ]);
      expect(getAvailableChoices("stage3_row2_looted")).toEqual(["go deeper", "go back"]);
      expect(getAvailableChoices("stage3_row2_dark_warning")).toEqual(["go deeper", "go back"]);
      expect(getAvailableChoices("stage3_row4_encounter")).toEqual([
        "search backpack",
        "go deeper",
        "go back",
      ]);
      expect(getAvailableChoices("stage3_row4_looted")).toEqual([
        "look around",
        "go deeper",
        "go back",
      ]);
      expect(getAvailableChoices("stage3_row5_warning")).toEqual(["peer", "go back"]);
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
          stage3_early_death_choice: ["early-death-node"],
          stage3_foyer_blocked: ["foyer-blocked-node"],
          stage3_hub: ["hub-node"],
          stage3_hub__peer_down_row_1: ["peer-row-1-action"],
          stage3_death_choice: ["stage3-death-node"],
          stage3_row2_flashlight_check: ["flashlight-check-node"],
          stage3_row2_dark_warning: ["dark-warning-node"],
          stage3_row5_warning: ["row5-warning-node"],
          stage4_entry: ["stage4-entry-node"],
        },
        death_screens: {
          stage3_foyer_blocked__go_deeper: ["foyer-blocked-death"],
          stage3_hub__go_down_row_1__else: ["row1-blind-death"],
          stage3_hub__go_down_row_3: ["row3-death"],
          stage3_row2_dark_warning__go_deeper: ["dark-warning-death"],
          stage3_row5_warning__peer: ["row5-peer-death"],
        },
        parser_fallbacks: ["fallback"],
      };

      const foyerBlockedDeath = transition(
        makeState("stage3_foyer_blocked"),
        "go deeper",
        customCatalog,
      );
      expect(foyerBlockedDeath.output).toEqual(["foyer-blocked-death", "early-death-node"]);

      const peerRow1 = transition(makeState("stage3_hub"), "peer down row 1", customCatalog);
      expect(peerRow1.output).toEqual(["peer-row-1-action", "hub-node"]);

      const blindRow1 = transition(makeState("stage3_hub"), "go down row 1", customCatalog);
      expect(blindRow1.output).toEqual(["row1-blind-death", "stage3-death-node"]);

      const row3Death = transition(makeState("stage3_hub"), "go down row 3", customCatalog);
      expect(row3Death.output).toEqual(["row3-death", "stage3-death-node"]);

      const noFlashlight = transition(makeState("stage3_row2_looted"), "go deeper", customCatalog);
      expect(noFlashlight.output).toEqual(["flashlight-check-node", "dark-warning-node"]);

      const darkWarningDeath = transition(
        makeState("stage3_row2_dark_warning"),
        "go deeper",
        customCatalog,
      );
      expect(darkWarningDeath.output).toEqual(["dark-warning-death", "stage3-death-node"]);

      const row5PeerDeath = transition(makeState("stage3_row5_warning"), "peer", customCatalog);
      expect(row5PeerDeath.output).toEqual(["row5-peer-death", "stage3-death-node"]);
    });
  });
});
