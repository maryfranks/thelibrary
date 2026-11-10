import { describe, expect, it } from "vitest";
import {
  CORPSE_ITEMS,
  DESK_ITEMS,
  createInitialState,
  getAvailableChoices,
  getNodeLines,
  loadContent,
  transition,
} from "../index";
import type { ContentCatalog, GameState, ItemId, NodeId } from "../types";

function makeState(currentNode: NodeId, inventory: ItemId[] = []): GameState {
  return {
    ...createInitialState(),
    currentNode,
    inventory: [...inventory],
  };
}

describe("Stage 2 Engine (Foyer & Reading Room Door)", () => {
  describe("stage2_foyer", () => {
    it("transitions to stage2_foyer_searched on 'look around'", () => {
      const state = makeState("stage2_foyer", ["mop"]);
      const next = transition(state, "look around");

      expect(next.currentNode).toBe("stage2_foyer_searched");
      expect(next.lastDeathType).toBeNull();
      expect(next.inventory).toEqual(["mop"]);
      expect(next.isGameOver).toBe(false);
      expect(next.isWin).toBe(false);
    });

    it("offers exactly 'look around' and 'go deeper'", () => {
      expect(getAvailableChoices("stage2_foyer")).toEqual(["look around", "go deeper"]);
    });

    it("triggers monster_attack and transitions to stage2_death_choice on 'go deeper'", () => {
      const state = makeState("stage2_foyer", ["mop"]);
      const next = transition(state, "go deeper");

      expect(next.currentNode).toBe("stage2_death_choice");
      expect(next.lastDeathType).toBe("monster_attack");
      expect(next.inventory).toEqual(["mop"]);
      expect(next.isGameOver).toBe(false);
      expect(next.isWin).toBe(false);
    });

    it("yields the parser fallback (not death) on unmatched input", () => {
      const catalog = loadContent();
      const next = transition(makeState("stage2_foyer", ["mop"]), "walk forward", catalog);

      expect(next.currentNode).toBe("stage2_foyer");
      expect(next.lastDeathType).toBeNull();
      expect(next.output).toEqual([catalog.parser_fallbacks[0]]);
    });
  });

  describe("stage2_death_choice, stage2_respawn_check & stage2_respawn_no_mop", () => {
    it("routes 'try again' through stage2_respawn_check: no mop lands at stage2_respawn_no_mop", () => {
      const catalog = loadContent();
      const next = transition(makeState("stage2_death_choice"), "try again", catalog);

      expect(next.currentNode).toBe("stage2_respawn_no_mop");
      expect(next.lastDeathType).toBeNull();
      expect(next.isGameOver).toBe(false);
      expect(next.output).toEqual([...catalog.nodes.stage2_respawn_no_mop]);
    });

    it("handles stage2_respawn_no_mop choices: 'pick up mop' -> stage1_mop_acquired (adds mop), 'proceed anyway' -> stage2_foyer", () => {
      const noMopRespawn = makeState("stage2_respawn_no_mop", []);
      expect(getAvailableChoices("stage2_respawn_no_mop")).toEqual([
        "pick up mop",
        "proceed anyway",
      ]);

      const pickedMop = transition(noMopRespawn, "pick up mop");
      expect(pickedMop.currentNode).toBe("stage1_mop_acquired");
      expect(pickedMop.inventory).toEqual(["mop"]);

      const proceeded = transition(noMopRespawn, "proceed anyway");
      expect(proceeded.currentNode).toBe("stage2_foyer");
      expect(proceeded.inventory).toEqual([]);
    });

    it("lands at stage2_foyer with a mop", () => {
      const next = transition(makeState("stage2_death_choice", ["mop"]), "try again");

      expect(next.currentNode).toBe("stage2_foyer");
      expect(next.inventory).toEqual(["mop"]);
    });

    it("routes reading room door rattle death to stage2_rattle_death_choice and 'try again' to stage2_reading_room_door_respawn preserving inventory", () => {
      let state = {
        ...makeState("stage2_reading_room_door", ["mop", "stacks key", "lemon candy"]),
        stage2InventorySnapshot: ["mop" as ItemId],
      };
      state = transition(state, "rattle reading room door");
      expect(state.currentNode).toBe("stage2_rattle_death_choice");
      expect(state.lastDeathType).toBe("monster_attack");
      expect(state.inventory).toEqual(["mop", "stacks key", "lemon candy"]);

      state = transition(state, "try again");
      expect(state.currentNode).toBe("stage2_reading_room_door_respawn");
      expect(state.inventory).toEqual(["mop", "stacks key", "lemon candy"]);

      state = transition(state, "try the lock quietly");
      expect(state.currentNode).toBe("stage2_reading_room_locked");
    });

    it("restores Stage 2 snapshot on respawn from stage2_death_choice: poker, key, and corpse/desk items are lost", () => {
      const state = {
        ...makeState("stage2_death_choice", [
          "mop",
          "stacks key",
          "lemon candy",
          "fireplace poker",
        ]),
        stage2InventorySnapshot: ["mop" as ItemId],
      };
      const next = transition(state, "try again");

      expect(next.currentNode).toBe("stage2_foyer");
      expect(next.inventory).toEqual(["mop"]);
    });

    it("respawn without mop restores empty Stage 2 snapshot and lands at stage2_respawn_no_mop", () => {
      const state = {
        ...makeState("stage2_death_choice", ["lemon candy"]),
        stage2InventorySnapshot: [] as ItemId[],
      };
      const catalog = loadContent();
      const next = transition(state, "try again", catalog);

      expect(next.currentNode).toBe("stage2_respawn_no_mop");
      expect(next.inventory).toEqual([]);
      expect(next.output).toEqual([...catalog.nodes.stage2_respawn_no_mop]);
    });

    it("resolves stage2_respawn_check directly on entry", () => {
      expect(transition(makeState("stage2_respawn_check", []), "").currentNode).toBe(
        "stage2_respawn_no_mop",
      );
      expect(transition(makeState("stage2_respawn_check", ["mop"]), "").currentNode).toBe(
        "stage2_foyer",
      );
    });

    it("keeps inventory across deaths", () => {
      const died = transition(
        makeState("stage2_stacks_door_locked_no_key", ["mop"]),
        "defend yourself",
      );
      expect(died.inventory).toEqual(["mop"]);
    });

    it("allows exploring periodicals unsearched; with mop and no key dies at the stacks door and respawns at stage2_respawn_no_key", () => {
      let state = makeState("stage2_foyer_searched", ["mop"]);
      state = transition(state, "explore periodicals");
      expect(state.currentNode).toBe("stage2_reading_room_door");
      state = transition(state, "try the lock quietly");
      state = transition(state, "look around");
      state = transition(state, "search fireplace");
      expect(state.inventory).toEqual(["fireplace poker"]);
      state = transition(state, "go deeper");
      expect(state.currentNode).toBe("stage2_stacks_door_locked_no_key");
      state = transition(state, "defend yourself");
      expect(state.currentNode).toBe("stage2_no_key_death_choice");
      state = transition(state, "try again");
      expect(state.currentNode).toBe("stage2_respawn_no_key");
      expect(state.inventory).toEqual(["fireplace poker"]);
      state = transition(state, "search desk");
      expect(state.currentNode).toBe("stage2_desk_looted");
      expect(state.inventory).toContain("stacks key");
      state = transition(state, "explore periodicals");
      expect(state.currentNode).toBe("stage2_reading_room_door");
    });

    it("passes periodicals check with either mop or fireplace poker, and fails without either weapon", () => {
      const withPoker = transition(
        makeState("stage2_foyer_searched", ["fireplace poker"]),
        "explore periodicals",
      );
      expect(withPoker.currentNode).toBe("stage2_reading_room_door");
      expect(withPoker.lastDeathType).toBeNull();

      const unarmed = transition(
        makeState("stage2_foyer_searched", ["lemon candy"]),
        "explore periodicals",
      );
      expect(unarmed.currentNode).toBe("stage2_death_choice");
      expect(unarmed.lastDeathType).toBe("monster_attack");
    });

    it("transitions to game_over and sets isGameOver on 'give up'", () => {
      const state = makeState("stage2_death_choice");
      const next = transition(state, "give up");

      expect(next.currentNode).toBe("game_over");
      expect(next.lastDeathType).toBeNull();
      expect(next.isGameOver).toBe(true);
      expect(next.isWin).toBe(false);
    });
  });

  describe("stage2_foyer_searched & looting (corpse and desk)", () => {
    it("stays at stage2_foyer_searched on 'look around' and 'look in the pack'", () => {
      const state = makeState("stage2_foyer_searched", ["mop"]);

      const lookedAround = transition(state, "look around");
      expect(lookedAround.currentNode).toBe("stage2_foyer_searched");
      expect(lookedAround.inventory).toEqual(["mop"]);

      const lookedInPack = transition(state, "look in the pack");
      expect(lookedInPack.currentNode).toBe("stage2_foyer_searched");
      expect(lookedInPack.inventory).toEqual(["mop"]);
    });

    it("loots corpse first, then desk to reach stage2_both_looted with all items", () => {
      const start = makeState("stage2_foyer_searched", ["mop"]);

      const corpseLooted = transition(start, "search corpse");
      expect(corpseLooted.currentNode).toBe("stage2_corpse_looted");
      expect(corpseLooted.inventory).toEqual(["mop", ...CORPSE_ITEMS]);
      expect(corpseLooted.inventory).toContain("lemon candy");
      expect(corpseLooted.inventory).toContain("pack of gum");
      expect(corpseLooted.inventory).toContain("mace");
      expect(corpseLooted.inventory).toContain("hair ties");

      expect(transition(corpseLooted, "look around").currentNode).toBe("stage2_corpse_looted");
      expect(transition(corpseLooted, "look in the pack").currentNode).toBe("stage2_corpse_looted");

      const bothLooted = transition(corpseLooted, "search desk");
      expect(bothLooted.currentNode).toBe("stage2_both_looted");
      expect(bothLooted.inventory).toEqual(["mop", ...CORPSE_ITEMS, ...DESK_ITEMS]);
      expect(bothLooted.inventory).toContain("small notebook");
      expect(bothLooted.inventory).toContain("stacks key");
    });

    it("loots desk first, then corpse to reach stage2_both_looted with all items", () => {
      const start = makeState("stage2_foyer_searched", ["mop"]);

      const deskLooted = transition(start, "search desk");
      expect(deskLooted.currentNode).toBe("stage2_desk_looted");
      expect(deskLooted.inventory).toEqual(["mop", ...DESK_ITEMS]);
      expect(deskLooted.inventory).toContain("small notebook");
      expect(deskLooted.inventory).toContain("stacks key");

      expect(transition(deskLooted, "look around").currentNode).toBe("stage2_desk_looted");
      expect(transition(deskLooted, "look in the pack").currentNode).toBe("stage2_desk_looted");

      const bothLooted = transition(deskLooted, "search corpse");
      expect(bothLooted.currentNode).toBe("stage2_both_looted");
      expect(bothLooted.inventory).toEqual(["mop", ...DESK_ITEMS, ...CORPSE_ITEMS]);
    });

    it("stays at stage2_both_looted on 'look around' and 'look in the pack'", () => {
      const state = makeState("stage2_both_looted", ["mop", ...CORPSE_ITEMS, ...DESK_ITEMS]);

      expect(transition(state, "look around").currentNode).toBe("stage2_both_looted");
      expect(transition(state, "look in the pack").currentNode).toBe("stage2_both_looted");
    });
  });

  describe("stage2_periodicals_check (mop conditional check)", () => {
    it("triggers monster_attack and transitions to stage2_death_choice when exploring periodicals without mop", () => {
      const withoutMop = makeState("stage2_foyer_searched", []);
      const next = transition(withoutMop, "explore periodicals");

      expect(next.currentNode).toBe("stage2_death_choice");
      expect(next.lastDeathType).toBe("monster_attack");
      expect(next.isGameOver).toBe(false);
    });

    it("transitions to stage2_reading_room_door when exploring periodicals with mop", () => {
      const withMop = makeState("stage2_both_looted", ["mop", ...CORPSE_ITEMS, ...DESK_ITEMS]);
      const next = transition(withMop, "explore periodicals");

      expect(next.currentNode).toBe("stage2_reading_room_door");
      expect(next.lastDeathType).toBeNull();
      expect(next.isGameOver).toBe(false);
    });

    it("evaluates direct transitions from stage2_periodicals_check based on mop presence", () => {
      const checkNoMop = makeState("stage2_periodicals_check", []);
      const failed = transition(checkNoMop, "1");
      expect(failed.currentNode).toBe("stage2_death_choice");
      expect(failed.lastDeathType).toBe("monster_attack");

      const checkWithMop = makeState("stage2_periodicals_check", ["mop"]);
      const passed = transition(checkWithMop, "2");
      expect(passed.currentNode).toBe("stage2_reading_room_door");
      expect(passed.lastDeathType).toBeNull();
    });
  });

  describe("stage2_reading_room_door, stage2_rattle_death_choice, stage2_reading_room_door_respawn & stage2_reading_room_locked", () => {
    it("triggers monster_attack and transitions to stage2_rattle_death_choice on 'rattle reading room door'", () => {
      const state = makeState("stage2_reading_room_door", ["mop"]);
      const next = transition(state, "rattle reading room door");

      expect(next.currentNode).toBe("stage2_rattle_death_choice");
      expect(next.lastDeathType).toBe("monster_attack");

      const gaveUp = transition(next, "give up");
      expect(gaveUp.currentNode).toBe("game_over");
      expect(gaveUp.isGameOver).toBe(true);
    });

    it("transitions to stage2_reading_room_locked on 'try the lock quietly' and then stage2_fireplace_revealed on 'look around'", () => {
      const state = makeState("stage2_reading_room_door", ["mop"]);
      const locked = transition(state, "try the lock quietly");

      expect(locked.currentNode).toBe("stage2_reading_room_locked");
      expect(locked.lastDeathType).toBeNull();

      const fireplaceRevealed = transition(locked, "look around");
      expect(fireplaceRevealed.currentNode).toBe("stage2_fireplace_revealed");
      expect(fireplaceRevealed.lastDeathType).toBeNull();
    });
  });

  describe("stage2_fireplace_revealed & stage2_poker_acquired (item exchange)", () => {
    it("acquires fireplace poker and drops mop from inventory on 'search fireplace'", () => {
      const state = makeState("stage2_fireplace_revealed", ["mop", "stacks key"]);
      const next = transition(state, "search fireplace");

      expect(next.currentNode).toBe("stage2_poker_acquired");
      expect(next.inventory).toContain("fireplace poker");
      expect(next.inventory).not.toContain("mop");
      expect(next.inventory).toEqual(["stacks key", "fireplace poker"]);
      expect(next.lastDeathType).toBeNull();
    });
  });

  describe("stage2_stacks_door_check, stage2_stacks_door_locked_no_key, stage2_no_key_death_choice & stage2_respawn_no_key", () => {
    it("transitions to stage2_stacks_door_locked_no_key when going deeper without stacks key", () => {
      const fromFireplace = makeState("stage2_fireplace_revealed", ["mop"]);
      const next = transition(fromFireplace, "go deeper");

      expect(next.currentNode).toBe("stage2_stacks_door_locked_no_key");
      expect(next.lastDeathType).toBeNull();
    });

    it("resolves stage3_arrival on entry (no menu) when going deeper with stacks key and poker", () => {
      const fromPoker = makeState("stage2_poker_acquired", ["stacks key", "fireplace poker"]);
      const next = transition(fromPoker, "go deeper");

      expect(next.currentNode).toBe("stage3_hub_unexplored");
      expect(next.lastDeathType).toBeNull();
      expect(next.inventory).toEqual(["stacks key", "fireplace poker"]);
    });

    it("evaluates direct transitions from stage2_stacks_door_check based on stacks key presence", () => {
      const checkNoKey = makeState("stage2_stacks_door_check", ["fireplace poker"]);
      const locked = transition(checkNoKey, "1");
      expect(locked.currentNode).toBe("stage2_stacks_door_locked_no_key");

      const checkWithKey = makeState("stage2_stacks_door_check", ["fireplace poker", "stacks key"]);
      const arrived = transition(checkWithKey, "2");
      expect(arrived.currentNode).toBe("stage3_hub_unexplored");
    });

    it("triggers monster_attack and transitions to stage2_no_key_death_choice on both choices at stage2_stacks_door_locked_no_key", () => {
      const state = makeState("stage2_stacks_door_locked_no_key", ["fireplace poker"]);

      const defend = transition(state, "defend yourself");
      expect(defend.currentNode).toBe("stage2_no_key_death_choice");
      expect(defend.lastDeathType).toBe("monster_attack");

      const backAway = transition(state, "slowly walk backwards");
      expect(backAway.currentNode).toBe("stage2_no_key_death_choice");
      expect(backAway.lastDeathType).toBe("monster_attack");

      const gaveUp = transition(defend, "give up");
      expect(gaveUp.currentNode).toBe("game_over");
      expect(gaveUp.isGameOver).toBe(true);
    });

    it("defines stage2_respawn_no_key transitions per game_map.md ('search desk', 'search corpse', 'explore periodicals')", () => {
      expect(getAvailableChoices("stage2_respawn_no_key")).toEqual([
        "search desk",
        "search corpse",
        "explore periodicals",
      ]);

      const fromNoKey = makeState("stage2_respawn_no_key", ["mop"]);
      const deskLooted = transition(fromNoKey, "search desk");
      expect(deskLooted.currentNode).toBe("stage2_desk_looted");
      expect(deskLooted.inventory).toEqual(["mop", ...DESK_ITEMS]);

      const corpseLooted = transition(fromNoKey, "search corpse");
      expect(corpseLooted.currentNode).toBe("stage2_corpse_looted");
      expect(corpseLooted.inventory).toEqual(["mop", ...CORPSE_ITEMS]);

      const periodicals = transition(fromNoKey, "explore periodicals");
      expect(periodicals.currentNode).toBe("stage2_reading_room_door");
    });

    it("interpolates [INVENTORY] placeholder in stage2_corpse_looted with discovered corpse items", () => {
      const text = getNodeLines("stage2_corpse_looted").join(" ");
      expect(text).not.toContain("[INVENTORY]");
      for (const item of CORPSE_ITEMS) {
        expect(text).toContain(item);
      }
    });
  });

  describe("available choices & invalid inputs", () => {
    it("returns Stage 2 choices via getAvailableChoices", () => {
      expect(getAvailableChoices("stage2_reading_room_door")).toEqual([
        "rattle reading room door",
        "try the lock quietly",
      ]);
      expect(getAvailableChoices("stage2_death_choice")).toEqual(["try again", "give up"]);
    });

    it("remains on the current node and outputs parser fallback on unmatched commands", () => {
      const catalog = loadContent();
      const state = makeState("stage2_reading_room_door", ["mop"]);
      const next = transition(state, "cast a spell", catalog);

      expect(next.currentNode).toBe("stage2_reading_room_door");
      expect(next.inventory).toEqual(["mop"]);
      expect(next.lastDeathType).toBeNull();
      expect(next.output).toEqual([catalog.parser_fallbacks[0]]);
    });
  });

  describe("content decoupling", () => {
    it("resolves Stage 2 node descriptions and death screens dynamically from injected catalog", () => {
      const customCatalog: ContentCatalog = {
        intro: ["intro"],
        nodes: {
          stage2_foyer: ["foyer-node"],
          stage2_death_choice: ["death-choice-node"],
          stage2_periodicals_check: ["periodicals-check-node"],
        },
        death_screens: {
          stage2_foyer__go_deeper: ["foyer-noise-death"],
          stage2_periodicals_check__no_mop_check: ["no-mop-death"],
        },
        parser_fallbacks: ["fallback"],
      };

      const foyerNoise = transition(makeState("stage2_foyer"), "go deeper", customCatalog);
      expect(foyerNoise.output).toEqual(["foyer-noise-death", "death-choice-node"]);

      const noMop = transition(
        makeState("stage2_foyer_searched"),
        "explore periodicals",
        customCatalog,
      );
      expect(noMop.output).toEqual(["periodicals-check-node", "no-mop-death", "death-choice-node"]);
    });
  });
});
