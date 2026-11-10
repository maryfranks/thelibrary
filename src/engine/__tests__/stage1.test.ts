import { describe, expect, it } from "vitest";
import {
  createInitialState,
  getAvailableChoices,
  getNodeLines,
  loadContent,
  transition,
} from "../index";
import type { ContentCatalog, GameState } from "../types";

describe("Stage 1 Engine (Vestibule)", () => {
  it("initializes at stage1_vestibule with empty inventory and active game flags", () => {
    const state = createInitialState();
    expect(state.currentNode).toBe("stage1_vestibule");
    expect(state.inventory).toEqual([]);
    expect(state.isGameOver).toBe(false);
    expect(state.isWin).toBe(false);
  });

  describe("stage1_vestibule", () => {
    it("transitions to stage1_vestibule_respawn on fatal 'try to leave' choice", () => {
      const initial = createInitialState();
      const next = transition(initial, "try to leave");

      expect(next.currentNode).toBe("stage1_vestibule_respawn");
      expect(next.lastDeathType).toBe("monster_attack");
      expect(next.inventory).toEqual([]);
      expect(next.isGameOver).toBe(false);
      expect(next.isWin).toBe(false);
    });

    it("transitions to stage1_vestibule_searched on 'look around'", () => {
      const initial = createInitialState();
      const next = transition(initial, "look around");

      expect(next.currentNode).toBe("stage1_vestibule_searched");
      expect(next.lastDeathType).toBeNull();
      expect(next.inventory).toEqual([]);
      expect(next.isGameOver).toBe(false);
      expect(next.isWin).toBe(false);
    });
  });

  describe("stage1_vestibule_respawn", () => {
    it("transitions to stage1_vestibule_searched on 'look around'", () => {
      const respawnState = transition(createInitialState(), "try to leave");
      expect(respawnState.currentNode).toBe("stage1_vestibule_respawn");

      const next = transition(respawnState, "look around");
      expect(next.currentNode).toBe("stage1_vestibule_searched");
      expect(next.lastDeathType).toBeNull();
      expect(next.inventory).toEqual([]);
    });
  });

  describe("stage1_vestibule_searched", () => {
    const searchedState: GameState = {
      ...createInitialState(),
      currentNode: "stage1_vestibule_searched",
    };

    it("stays at stage1_vestibule_searched on 'look around'", () => {
      const next = transition(searchedState, "look around");
      expect(next.currentNode).toBe("stage1_vestibule_searched");
      expect(next.inventory).toEqual([]);
    });

    it("transitions to stage1_pack_checked on 'look in the pack'", () => {
      const next = transition(searchedState, "look in the pack");
      expect(next.currentNode).toBe("stage1_pack_checked");
      expect(next.inventory).toEqual([]);
    });
  });

  describe("stage1_pack_checked", () => {
    const packCheckedState: GameState = {
      ...createInitialState(),
      currentNode: "stage1_pack_checked",
    };

    it("offers only progression choices ('hop turnstiles', 'pick up mop')", () => {
      expect(getAvailableChoices("stage1_pack_checked")).toEqual(["hop turnstiles", "pick up mop"]);
    });

    it("stays at stage1_pack_checked and re-prints node lines on ambient 'look around'", () => {
      const next = transition(packCheckedState, "look around");
      expect(next.currentNode).toBe("stage1_pack_checked");
      expect(next.inventory).toEqual([]);
      expect(next.output).toEqual(getNodeLines("stage1_pack_checked"));
    });

    it("stays at stage1_pack_checked on ambient 'look in the pack'", () => {
      const next = transition(packCheckedState, "look in the pack");
      expect(next.currentNode).toBe("stage1_pack_checked");
      expect(next.inventory).toEqual([]);
    });

    it("interpolates [INVENTORY] placeholder in stage1_pack_checked node lines", () => {
      const lines = getNodeLines("stage1_pack_checked");
      expect(lines.join(" ")).not.toContain("[INVENTORY]");
    });

    it("transitions to stage1_turnstile_check without mop on 'hop turnstiles'", () => {
      const next = transition(packCheckedState, "hop turnstiles");
      expect(next.currentNode).toBe("stage1_turnstile_check");
      expect(next.inventory).not.toContain("mop");
    });

    it("transitions to stage1_mop_acquired and adds mop to inventory on 'pick up mop'", () => {
      const next = transition(packCheckedState, "pick up mop");
      expect(next.currentNode).toBe("stage1_mop_acquired");
      expect(next.inventory).toEqual(["mop"]);
    });
  });

  describe("stage1_turnstile_check", () => {
    const turnstileCheckState: GameState = {
      ...createInitialState(),
      currentNode: "stage1_turnstile_check",
    };

    it("stays at stage1_turnstile_check on ambient 'look around' and 'look in the pack'", () => {
      const lookedAround = transition(turnstileCheckState, "look around");
      expect(lookedAround.currentNode).toBe("stage1_turnstile_check");
      expect(lookedAround.inventory).toEqual([]);
      expect(lookedAround.output).toEqual(getNodeLines("stage1_turnstile_check"));

      const lookedInPack = transition(turnstileCheckState, "look in the pack");
      expect(lookedInPack.currentNode).toBe("stage1_turnstile_check");
      expect(lookedInPack.inventory).toEqual([]);
    });

    it("transitions to stage1_mop_acquired and adds mop on 'go back for mop'", () => {
      const next = transition(turnstileCheckState, "go back for mop");
      expect(next.currentNode).toBe("stage1_mop_acquired");
      expect(next.inventory).toEqual(["mop"]);
    });

    it("transitions to stage2_foyer without mop on 'proceed anyway' and saves empty Stage 2 inventory snapshot", () => {
      const next = transition(turnstileCheckState, "proceed anyway");
      expect(next.currentNode).toBe("stage2_foyer");
      expect(next.inventory).toEqual([]);
      expect(next.stage2InventorySnapshot).toEqual([]);
      expect(next.isGameOver).toBe(false);
      expect(next.isWin).toBe(false);
    });
  });

  describe("stage1_mop_acquired", () => {
    const mopAcquiredState: GameState = {
      ...createInitialState(),
      currentNode: "stage1_mop_acquired",
      inventory: ["mop"],
    };

    it("stays at stage1_mop_acquired on ambient 'look around' and preserves mop in inventory", () => {
      const next = transition(mopAcquiredState, "look around");
      expect(next.currentNode).toBe("stage1_mop_acquired");
      expect(next.inventory).toEqual(["mop"]);
      expect(next.output).toEqual(getNodeLines("stage1_mop_acquired"));
    });

    it("stays at stage1_mop_acquired on ambient 'look in the pack' and preserves mop in inventory", () => {
      const next = transition(mopAcquiredState, "look in the pack");
      expect(next.currentNode).toBe("stage1_mop_acquired");
      expect(next.inventory).toEqual(["mop"]);
    });

    it("transitions to stage2_foyer on 'hop turnstiles' with mop in inventory and saves Stage 2 inventory snapshot", () => {
      const next = transition(mopAcquiredState, "hop turnstiles");
      expect(next.currentNode).toBe("stage2_foyer");
      expect(next.inventory).toEqual(["mop"]);
      expect(next.stage2InventorySnapshot).toEqual(["mop"]);
      expect(next.isGameOver).toBe(false);
      expect(next.isWin).toBe(false);
    });

    it("does not duplicate mop in inventory if picked up again at pack_checked", () => {
      const packWithMop: GameState = {
        ...mopAcquiredState,
        currentNode: "stage1_pack_checked",
      };
      const pickedAgain = transition(packWithMop, "pick up mop");
      expect(pickedAgain.currentNode).toBe("stage1_mop_acquired");
      expect(pickedAgain.inventory).toEqual(["mop"]);
    });
  });

  describe("invalid inputs", () => {
    it("remains on the current node and does not mutate inventory on unknown commands", () => {
      const initial = createInitialState();
      const next = transition(initial, "dance wildly");
      expect(next.currentNode).toBe("stage1_vestibule");
      expect(next.inventory).toEqual([]);
      expect(next.isGameOver).toBe(false);
      expect(next.isWin).toBe(false);
    });
  });

  describe("content decoupling", () => {
    it("loads narrative text dynamically from content.json and supports injected catalogs", () => {
      const catalog = loadContent();
      const initial = createInitialState(catalog);
      expect(initial.output).toEqual([...catalog.intro, ...(catalog.nodes.stage1_vestibule ?? [])]);

      const customCatalog: ContentCatalog = {
        intro: ["custom-intro"],
        nodes: {
          stage1_vestibule: ["custom-vestibule"],
          stage1_vestibule_respawn: ["custom-respawn"],
        },
        death_screens: {
          stage1_vestibule__try_to_leave: ["custom-death"],
        },
        parser_fallbacks: ["custom-fallback"],
      };

      const customStart = createInitialState(customCatalog);
      expect(customStart.output).toEqual(["custom-intro", "custom-vestibule"]);

      const customFatal = transition(customStart, "try to leave", customCatalog);
      expect(customFatal.output).toEqual(["custom-death", "custom-respawn"]);

      const customInvalid = transition(customStart, "unknown", customCatalog);
      expect(customInvalid.output).toEqual(["custom-fallback"]);
    });
  });
});
