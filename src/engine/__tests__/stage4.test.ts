import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState, getAvailableChoices, loadContent, transition } from "../index";
import { deathsCounter, meterProvider, metricExporter } from "../telemetry";
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

  describe("Junctions A and B (dead ends & progression)", () => {
    it("handles Junction A dead end ('go straight') and safe path ('go sideways' -> stage4_junction_b)", () => {
      const junctionA = makeState("stage4_junction_a", ["flashlight"]);

      const straightFatal = transition(junctionA, "go straight");
      expect(straightFatal.currentNode).toBe("stage4_death_choice");
      expect(straightFatal.lastDeathType).toBe("environmental_hazard");

      const sidewaysSafe = transition(junctionA, "go sideways");
      expect(sidewaysSafe.currentNode).toBe("stage4_junction_b");
      expect(sidewaysSafe.lastDeathType).toBeNull();
    });

    it("handles Junction B dead end ('go around' -> stage4_death_choice)", () => {
      const junctionB = makeState("stage4_junction_b", ["flashlight"]);

      const aroundFatal = transition(junctionB, "go around");
      expect(aroundFatal.currentNode).toBe("stage4_death_choice");
      expect(aroundFatal.lastDeathType).toBe("environmental_hazard");
    });
  });

  describe("Junction B pocketknife check (stage4_junction_b -> stage4_junction_b_check)", () => {
    it("fails pocketknife check with environmental_hazard and routes to stage3_death_choice when pocketknife is missing", () => {
      const withoutKnife = makeState("stage4_junction_b", ["flashlight"]);
      const next = transition(withoutKnife, "go forward");

      expect(next.currentNode).toBe("stage3_death_choice");
      expect(next.lastDeathType).toBe("environmental_hazard");
      expect(next.isGameOver).toBe(false);
    });

    it("passes pocketknife check and transitions to stage4_junction_c when holding pocketknife", () => {
      const withKnife = makeState("stage4_junction_b", ["flashlight", "pocketknife"]);
      const next = transition(withKnife, "go forward");

      expect(next.currentNode).toBe("stage4_junction_c");
      expect(next.lastDeathType).toBeNull();
      expect(next.inventory).toEqual(["flashlight", "pocketknife"]);
      expect(next.isGameOver).toBe(false);
    });

    it("evaluates direct transitions from stage4_junction_b_check based on pocketknife presence", () => {
      const checkNoKnife = makeState("stage4_junction_b_check", ["flashlight"]);
      const failed = transition(checkNoKnife, "1");
      expect(failed.currentNode).toBe("stage3_death_choice");
      expect(failed.lastDeathType).toBe("environmental_hazard");

      const checkWithKnife = makeState("stage4_junction_b_check", ["flashlight", "pocketknife"]);
      const passed = transition(checkWithKnife, "2");
      expect(passed.currentNode).toBe("stage4_junction_c");
      expect(passed.lastDeathType).toBeNull();
    });
  });

  describe("Junction C (The Electrical Hazard) & Junction D (Loopback 1)", () => {
    it("handles Junction C electrical hazard ('step down') and safe path ('step across' -> stage4_junction_d)", () => {
      const junctionC = makeState("stage4_junction_c", ["flashlight", "pocketknife"]);

      const stepDownFatal = transition(junctionC, "step down");
      expect(stepDownFatal.currentNode).toBe("stage4_death_choice");
      expect(stepDownFatal.lastDeathType).toBe("environmental_hazard");

      const stepAcrossSafe = transition(junctionC, "step across");
      expect(stepAcrossSafe.currentNode).toBe("stage4_junction_d");
      expect(stepAcrossSafe.lastDeathType).toBeNull();
    });

    it("loops back to stage4_junction_d_loopback on 'go left' and advances to stage4_junction_e on 'go right'", () => {
      const junctionD = makeState("stage4_junction_d", ["flashlight", "pocketknife"]);

      const loopedBack = transition(junctionD, "go left");
      expect(loopedBack.currentNode).toBe("stage4_junction_d_loopback");
      expect(loopedBack.lastDeathType).toBeNull();

      const advanced = transition(junctionD, "go right");
      expect(advanced.currentNode).toBe("stage4_junction_e");
      expect(advanced.lastDeathType).toBeNull();
    });

    it("handles stage4_junction_d_loopback dead end ('go straight') and safe path ('go sideways' -> stage4_junction_b)", () => {
      const loopback = makeState("stage4_junction_d_loopback", ["flashlight", "pocketknife"]);

      const straightFatal = transition(loopback, "go straight");
      expect(straightFatal.currentNode).toBe("stage4_death_choice");
      expect(straightFatal.lastDeathType).toBe("environmental_hazard");

      const sidewaysSafe = transition(loopback, "go sideways");
      expect(sidewaysSafe.currentNode).toBe("stage4_junction_b");
      expect(sidewaysSafe.lastDeathType).toBeNull();
    });
  });

  describe("Junctions E, F, and stage4_structural_hub", () => {
    it("handles Junction E monster nest ('explore alcove') and safe path ('bypass alcove' -> stage4_junction_f)", () => {
      const junctionE = makeState("stage4_junction_e", ["flashlight", "pocketknife"]);

      const alcoveFatal = transition(junctionE, "explore alcove");
      expect(alcoveFatal.currentNode).toBe("stage4_death_choice");
      expect(alcoveFatal.lastDeathType).toBe("monster_attack");

      const bypassSafe = transition(junctionE, "bypass alcove");
      expect(bypassSafe.currentNode).toBe("stage4_junction_f");
      expect(bypassSafe.lastDeathType).toBeNull();
    });

    describe("Junction F temporary_game_over ('duck under')", () => {
      beforeEach(() => {
        vi.spyOn(metricExporter, "export").mockImplementation((_metrics, resultCallback) => {
          resultCallback({ code: 0 });
        });
        vi.spyOn(metricExporter, "forceFlush").mockResolvedValue(undefined);
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it("handles Junction F hazard ('climb aisle') and terminates at temporary_game_over ('duck under')", () => {
        const deathSpy = vi.spyOn(deathsCounter, "add");
        const flushSpy = vi.spyOn(meterProvider, "forceFlush");
        const junctionF = makeState("stage4_junction_f", ["flashlight", "pocketknife"]);

        const climbFatal = transition(junctionF, "climb aisle");
        expect(climbFatal.currentNode).toBe("stage4_death_choice");
        expect(climbFatal.lastDeathType).toBe("environmental_hazard");

        const duckSafe = transition(junctionF, "duck under");
        expect(duckSafe.currentNode).toBe("temporary_game_over");
        expect(duckSafe.lastDeathType).toBe("mysterious_disappearance");
        expect(duckSafe.isGameOver).toBe(true);
        expect(duckSafe.isWin).toBe(false);
        expect(getAvailableChoices("temporary_game_over")).toEqual([]);
        expect(deathSpy).toHaveBeenCalledTimes(2);
        expect(deathSpy).toHaveBeenLastCalledWith(1, {
          stage: "stage4",
          death_type: "mysterious_disappearance",
          node_id: "stage4_junction_f",
        });
        expect(flushSpy).toHaveBeenCalledTimes(2);

        // Terminal state accepts no further gameplay commands and emits no duplicate metrics
        const afterCommand = transition(duckSafe, "duck under");
        expect(afterCommand).toBe(duckSafe);
        expect(deathSpy).toHaveBeenCalledTimes(2);
      });
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

    it("supports full maze traversal including loopback from Junction D", () => {
      let state = makeState("stage4_entry", ["flashlight", "pocketknife", "umbrella"]);

      state = transition(state, "look around");
      expect(state.currentNode).toBe("stage4_junction_a");

      state = transition(state, "go sideways");
      expect(state.currentNode).toBe("stage4_junction_b");

      state = transition(state, "go forward");
      expect(state.currentNode).toBe("stage4_junction_c");

      state = transition(state, "step across");
      expect(state.currentNode).toBe("stage4_junction_d");

      // Trigger Loopback 1 (Junction D -> stage4_junction_d_loopback) and traverse back to Junction D
      state = transition(state, "go left");
      expect(state.currentNode).toBe("stage4_junction_d_loopback");
      state = transition(state, "2");
      expect(state.currentNode).toBe("stage4_junction_b");
      state = transition(state, "2");
      expect(state.currentNode).toBe("stage4_junction_c");
      state = transition(state, "2");
      expect(state.currentNode).toBe("stage4_junction_d");

      state = transition(state, "go right");
      expect(state.currentNode).toBe("stage4_junction_e");

      state = transition(state, "bypass alcove");
      expect(state.currentNode).toBe("stage4_junction_f");

      state = transition(state, "duck under");
      expect(state.currentNode).toBe("temporary_game_over");
      expect(state.isGameOver).toBe(true);
    });
  });

  describe("available choices, invalid inputs, and content decoupling", () => {
    it("returns Stage 4 choices via getAvailableChoices", () => {
      expect(getAvailableChoices("stage4_entry")).toEqual(["go deeper", "look around"]);
      expect(getAvailableChoices("stage4_junction_d_loopback")).toEqual([
        "go straight",
        "go sideways",
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
          stage4_junction_b: ["junction-b-node"],
          stage4_junction_b_check: ["pocketknife-check-node"],
          stage4_junction_c: ["junction-c-node"],
          stage3_death_choice: ["stage3-death-node"],
          stage4_death_choice: ["stage4-death-node"],
        },
        death_screens: {
          stage4_junction_a__go_straight: ["straight-death"],
          stage4_junction_b__go_around: ["around-death"],
          stage4_junction_b_check__no_pocketknife_check: ["no-knife-death"],
        },
        parser_fallbacks: ["fallback"],
      };

      const aroundFatal = transition(makeState("stage4_junction_b"), "go around", customCatalog);
      expect(aroundFatal.output).toEqual(["around-death", "stage4-death-node"]);

      const loopbackFatal = transition(
        makeState("stage4_junction_d_loopback"),
        "go straight",
        customCatalog,
      );
      expect(loopbackFatal.output).toEqual(["straight-death", "stage4-death-node"]);

      const noKnife = transition(
        makeState("stage4_junction_b", ["flashlight"]),
        "go forward",
        customCatalog,
      );
      expect(noKnife.output).toEqual([
        "pocketknife-check-node",
        "no-knife-death",
        "stage3-death-node",
      ]);

      const withKnife = transition(
        makeState("stage4_junction_b", ["flashlight", "pocketknife"]),
        "go forward",
        customCatalog,
      );
      expect(withKnife.output).toEqual(["pocketknife-check-node", "junction-c-node"]);
    });
  });
});
