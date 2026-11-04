import { describe, expect, it } from "vitest";
import { createInitialState, getAvailableChoices, loadContent, transition } from "../index";
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

describe("Stage 4 Engine (Deep Stacks Maze)", () => {
  describe("stage4_entry & stage4_death_choice", () => {
    it("triggers environmental_hazard and transitions to stage4_death_choice on 'go deeper'", () => {
      const state = makeState("stage4_entry", ["flashlight", "pocketknife"]);
      const next = transition(state, "go deeper");

      expect(next.currentNode).toBe("stage4_death_choice");
      expect(next.lastDeathType).toBe("environmental_hazard");
      expect(next.isGameOver).toBe(false);
      expect(next.isWin).toBe(false);
    });

    it("transitions to stage4_junction_a on 'look around'", () => {
      const state = makeState("stage4_entry", ["flashlight", "pocketknife"]);
      const next = transition(state, "look around");

      expect(next.currentNode).toBe("stage4_junction_a");
      expect(next.lastDeathType).toBeNull();
      expect(next.isGameOver).toBe(false);
    });

    it("respawns at stage4_entry on 'try again' and ends game on 'give up' from stage4_death_choice", () => {
      const deathState = makeState("stage4_death_choice", ["flashlight", "pocketknife"]);

      const retried = transition(deathState, "try again");
      expect(retried.currentNode).toBe("stage4_entry");
      expect(retried.lastDeathType).toBeNull();
      expect(retried.isGameOver).toBe(false);

      const gaveUp = transition(deathState, "give up");
      expect(gaveUp.currentNode).toBe("game_over");
      expect(gaveUp.lastDeathType).toBeNull();
      expect(gaveUp.isGameOver).toBe(true);
    });
  });

  describe("Junctions A, B, and C (dead ends & progression)", () => {
    it("handles Junction A dead end ('go left') and safe path ('go right' -> stage4_junction_b)", () => {
      const junctionA = makeState("stage4_junction_a", ["flashlight"]);

      const leftFatal = transition(junctionA, "go left");
      expect(leftFatal.currentNode).toBe("stage4_death_choice");
      expect(leftFatal.lastDeathType).toBe("environmental_hazard");

      const rightSafe = transition(junctionA, "go right");
      expect(rightSafe.currentNode).toBe("stage4_junction_b");
      expect(rightSafe.lastDeathType).toBeNull();
    });

    it("handles Junction B dead end ('go straight') and safe path ('go sideways' -> stage4_junction_c)", () => {
      const junctionB = makeState("stage4_junction_b", ["flashlight"]);

      const straightFatal = transition(junctionB, "go straight");
      expect(straightFatal.currentNode).toBe("stage4_death_choice");
      expect(straightFatal.lastDeathType).toBe("environmental_hazard");

      const sidewaysSafe = transition(junctionB, "go sideways");
      expect(sidewaysSafe.currentNode).toBe("stage4_junction_c");
      expect(sidewaysSafe.lastDeathType).toBeNull();
    });

    it("handles Junction C dead end ('go around' -> stage4_death_choice)", () => {
      const junctionC = makeState("stage4_junction_c", ["flashlight"]);

      const aroundFatal = transition(junctionC, "go around");
      expect(aroundFatal.currentNode).toBe("stage4_death_choice");
      expect(aroundFatal.lastDeathType).toBe("environmental_hazard");
    });
  });

  describe("Junction C pocketknife check (stage4_junction_c -> stage4_junction_c_check)", () => {
    it("fails pocketknife check with environmental_hazard and routes to stage3_death_choice when pocketknife is missing", () => {
      const withoutKnife = makeState("stage4_junction_c", ["flashlight"]);
      const next = transition(withoutKnife, "go forward");

      expect(next.currentNode).toBe("stage3_death_choice");
      expect(next.lastDeathType).toBe("environmental_hazard");
      expect(next.isGameOver).toBe(false);
    });

    it("passes pocketknife check and transitions to stage4_junction_d when holding pocketknife", () => {
      const withKnife = makeState("stage4_junction_c", ["flashlight", "pocketknife"]);
      const next = transition(withKnife, "go forward");

      expect(next.currentNode).toBe("stage4_junction_d");
      expect(next.lastDeathType).toBeNull();
      expect(next.inventory).toEqual(["flashlight", "pocketknife"]);
      expect(next.isGameOver).toBe(false);
    });

    it("evaluates direct transitions from stage4_junction_c_check based on pocketknife presence", () => {
      const checkNoKnife = makeState("stage4_junction_c_check", ["flashlight"]);
      const failed = transition(checkNoKnife, "1");
      expect(failed.currentNode).toBe("stage3_death_choice");
      expect(failed.lastDeathType).toBe("environmental_hazard");

      const checkWithKnife = makeState("stage4_junction_c_check", ["flashlight", "pocketknife"]);
      const passed = transition(checkWithKnife, "2");
      expect(passed.currentNode).toBe("stage4_junction_d");
      expect(passed.lastDeathType).toBeNull();
    });
  });

  describe("Junction D (Loopback 1)", () => {
    it("loops back to stage4_junction_a on 'go left' and advances to stage4_junction_e on 'go right'", () => {
      const junctionD = makeState("stage4_junction_d", ["flashlight", "pocketknife"]);

      const loopedBack = transition(junctionD, "go left");
      expect(loopedBack.currentNode).toBe("stage4_junction_a");
      expect(loopedBack.lastDeathType).toBeNull();

      const advanced = transition(junctionD, "go right");
      expect(advanced.currentNode).toBe("stage4_junction_e");
      expect(advanced.lastDeathType).toBeNull();
    });
  });

  describe("Junctions E, F, and G (hazards & progression)", () => {
    it("handles Junction E electrical hazard ('step down') and safe path ('step across' -> stage4_junction_f)", () => {
      const junctionE = makeState("stage4_junction_e", ["flashlight", "pocketknife"]);

      const stepDownFatal = transition(junctionE, "step down");
      expect(stepDownFatal.currentNode).toBe("stage4_death_choice");
      expect(stepDownFatal.lastDeathType).toBe("environmental_hazard");

      const stepAcrossSafe = transition(junctionE, "step across");
      expect(stepAcrossSafe.currentNode).toBe("stage4_junction_f");
      expect(stepAcrossSafe.lastDeathType).toBeNull();
    });

    it("handles Junction F monster nest ('explore alcove') and safe path ('bypass alcove' -> stage4_junction_g)", () => {
      const junctionF = makeState("stage4_junction_f", ["flashlight", "pocketknife"]);

      const alcoveFatal = transition(junctionF, "explore alcove");
      expect(alcoveFatal.currentNode).toBe("stage4_death_choice");
      expect(alcoveFatal.lastDeathType).toBe("monster_attack");

      const bypassSafe = transition(junctionF, "bypass alcove");
      expect(bypassSafe.currentNode).toBe("stage4_junction_g");
      expect(bypassSafe.lastDeathType).toBeNull();
    });

    it("handles Junction G hazard ('climb aisle') and safe path ('duck under' -> stage4_junction_h)", () => {
      const junctionG = makeState("stage4_junction_g", ["flashlight", "pocketknife"]);

      const climbFatal = transition(junctionG, "climb aisle");
      expect(climbFatal.currentNode).toBe("stage4_death_choice");
      expect(climbFatal.lastDeathType).toBe("environmental_hazard");

      const duckSafe = transition(junctionG, "duck under");
      expect(duckSafe.currentNode).toBe("stage4_junction_h");
      expect(duckSafe.lastDeathType).toBeNull();
    });
  });

  describe("Junction H (Loopback 2) & stage4_structural_hub", () => {
    it("loops back to stage4_junction_e on 'take left corridor' and advances to stage4_structural_hub on 'take right corridor'", () => {
      const junctionH = makeState("stage4_junction_h", ["flashlight", "pocketknife"]);

      const loopedBack = transition(junctionH, "take left corridor");
      expect(loopedBack.currentNode).toBe("stage4_junction_e");
      expect(loopedBack.lastDeathType).toBeNull();

      const structuralHub = transition(junctionH, "take right corridor");
      expect(structuralHub.currentNode).toBe("stage4_structural_hub");
      expect(structuralHub.lastDeathType).toBeNull();
    });

    it("branches from stage4_structural_hub to stage5_mezzanine_arrival ('go upstairs') and stage5_basement_arrival ('go into basement')", () => {
      const hub = makeState("stage4_structural_hub", ["flashlight", "pocketknife", "umbrella"]);

      const upstairs = transition(hub, "go upstairs");
      expect(upstairs.currentNode).toBe("stage5_mezzanine_arrival");
      expect(upstairs.lastDeathType).toBeNull();

      const basement = transition(hub, "go into basement");
      expect(basement.currentNode).toBe("stage5_basement_arrival");
      expect(basement.lastDeathType).toBeNull();
    });

    it("supports full maze traversal including loopbacks from Junction D and Junction H", () => {
      let state = makeState("stage4_entry", ["flashlight", "pocketknife", "umbrella"]);

      state = transition(state, "look around");
      expect(state.currentNode).toBe("stage4_junction_a");

      state = transition(state, "go right");
      expect(state.currentNode).toBe("stage4_junction_b");

      state = transition(state, "go sideways");
      expect(state.currentNode).toBe("stage4_junction_c");

      state = transition(state, "go forward");
      expect(state.currentNode).toBe("stage4_junction_d");

      // Trigger Loopback 1 (Junction D -> Junction A) and traverse A -> B -> C -> D again
      state = transition(state, "go left");
      expect(state.currentNode).toBe("stage4_junction_a");
      state = transition(state, "2");
      state = transition(state, "2");
      state = transition(state, "2");
      expect(state.currentNode).toBe("stage4_junction_d");

      state = transition(state, "go right");
      expect(state.currentNode).toBe("stage4_junction_e");

      state = transition(state, "step across");
      expect(state.currentNode).toBe("stage4_junction_f");

      state = transition(state, "bypass alcove");
      expect(state.currentNode).toBe("stage4_junction_g");

      state = transition(state, "duck under");
      expect(state.currentNode).toBe("stage4_junction_h");

      // Trigger Loopback 2 (Junction H -> Junction E) and traverse E -> F -> G -> H again
      state = transition(state, "take left corridor");
      expect(state.currentNode).toBe("stage4_junction_e");
      state = transition(state, "2");
      state = transition(state, "2");
      state = transition(state, "2");
      expect(state.currentNode).toBe("stage4_junction_h");

      state = transition(state, "take right corridor");
      expect(state.currentNode).toBe("stage4_structural_hub");
    });
  });

  describe("available choices, invalid inputs, and content decoupling", () => {
    it("returns Stage 4 choices via getAvailableChoices", () => {
      expect(getAvailableChoices("stage4_entry")).toEqual(["go deeper", "look around"]);
      expect(getAvailableChoices("stage4_junction_h")).toEqual([
        "take left corridor",
        "take right corridor",
      ]);
      expect(getAvailableChoices("stage4_structural_hub")).toEqual([
        "go upstairs",
        "go into basement",
      ]);
    });

    it("remains on the current node and outputs parser fallback on empty or unmatched commands", () => {
      const catalog = loadContent();
      const state = makeState("stage4_junction_a", ["flashlight"]);

      const empty = transition(state, "   ", catalog);
      expect(empty.currentNode).toBe("stage4_junction_a");
      expect(empty.lastDeathType).toBeNull();
      expect(empty.output).toEqual([catalog.parser_fallbacks[0]]);

      const unmatched = transition(state, "teleport", catalog);
      expect(unmatched.currentNode).toBe("stage4_junction_a");
      expect(unmatched.lastDeathType).toBeNull();
      expect(unmatched.output).toEqual([catalog.parser_fallbacks[0]]);
    });

    it("resolves Stage 4 node descriptions and death screens dynamically from injected catalog", () => {
      const customCatalog: ContentCatalog = {
        intro: ["intro"],
        nodes: {
          stage4_junction_c: ["junction-c-node"],
          stage4_junction_c_check: ["pocketknife-check-node"],
          stage4_junction_d: ["junction-d-node"],
          stage3_death_choice: ["stage3-death-node"],
          stage4_death_choice: ["stage4-death-node"],
        },
        death_screens: {
          stage4_junction_c__go_around: ["around-death"],
          stage4_junction_c_check__no_pocketknife_check: ["no-knife-death"],
        },
        parser_fallbacks: ["fallback"],
      };

      const aroundFatal = transition(makeState("stage4_junction_c"), "go around", customCatalog);
      expect(aroundFatal.output).toEqual(["around-death", "stage4-death-node"]);

      const noKnife = transition(
        makeState("stage4_junction_c", ["flashlight"]),
        "go forward",
        customCatalog,
      );
      expect(noKnife.output).toEqual([
        "pocketknife-check-node",
        "no-knife-death",
        "stage3-death-node",
      ]);

      const withKnife = transition(
        makeState("stage4_junction_c", ["flashlight", "pocketknife"]),
        "go forward",
        customCatalog,
      );
      expect(withKnife.output).toEqual(["pocketknife-check-node", "junction-d-node"]);
    });
  });
});
