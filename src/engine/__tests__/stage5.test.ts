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

describe("Stage 5 Engine (Endgame, Mezzanine, Basement & Win)", () => {
  describe("Upper Mezzanine path & fatal encounters", () => {
    it("triggers environmental_hazard and transitions to stage5_mezzanine_death_choice on 'go forward' at stage5_mezzanine_arrival", () => {
      const state = makeState("stage5_mezzanine_arrival", ["flashlight", "pocketknife"]);
      const next = transition(state, "go forward");

      expect(next.currentNode).toBe("stage5_mezzanine_death_choice");
      expect(next.lastDeathType).toBe("environmental_hazard");
      expect(next.isGameOver).toBe(false);
      expect(next.isWin).toBe(false);
    });

    it("transitions to stage5_mezzanine_searched on 'look around' at stage5_mezzanine_arrival", () => {
      const state = makeState("stage5_mezzanine_arrival", ["flashlight", "pocketknife"]);
      const next = transition(state, "look around");

      expect(next.currentNode).toBe("stage5_mezzanine_searched");
      expect(next.lastDeathType).toBeNull();
      expect(next.isGameOver).toBe(false);
    });

    it("respawns at stage5_mezzanine_arrival on 'try again' and ends game on 'give up' from stage5_mezzanine_death_choice", () => {
      const deathState = makeState("stage5_mezzanine_death_choice", ["flashlight", "pocketknife"]);

      const retried = transition(deathState, "try again");
      expect(retried.currentNode).toBe("stage5_mezzanine_arrival");
      expect(retried.lastDeathType).toBeNull();
      expect(retried.isGameOver).toBe(false);

      const gaveUp = transition(deathState, "give up");
      expect(gaveUp.currentNode).toBe("game_over");
      expect(gaveUp.lastDeathType).toBeNull();
      expect(gaveUp.isGameOver).toBe(true);
      expect(gaveUp.isWin).toBe(false);
    });

    it("handles stage5_mezzanine_searched options ('look around', 'look in the pack', fatal 'look over railing', 'sneak through stacks')", () => {
      const searched = makeState("stage5_mezzanine_searched", ["flashlight", "pocketknife"]);

      expect(transition(searched, "look around").currentNode).toBe("stage5_mezzanine_searched");
      expect(transition(searched, "look in the pack").currentNode).toBe(
        "stage5_mezzanine_searched",
      );

      const railingFatal = transition(searched, "look over railing");
      expect(railingFatal.currentNode).toBe("stage5_mezzanine_death_choice");
      expect(railingFatal.lastDeathType).toBe("monster_attack");
      expect(railingFatal.isGameOver).toBe(false);

      const balconyDoor = transition(searched, "sneak through stacks");
      expect(balconyDoor.currentNode).toBe("stage5_balcony_door");
      expect(balconyDoor.lastDeathType).toBeNull();
    });

    it("handles stage5_balcony_door and stage5_balcony_inspected balcony hazard and inspection", () => {
      const door = makeState("stage5_balcony_door", ["flashlight", "pocketknife"]);

      const doorFatal = transition(door, "go out on the balcony");
      expect(doorFatal.currentNode).toBe("stage5_mezzanine_death_choice");
      expect(doorFatal.lastDeathType).toBe("environmental_hazard");

      const inspected = transition(door, "inspect balcony");
      expect(inspected.currentNode).toBe("stage5_balcony_inspected");
      expect(inspected.lastDeathType).toBeNull();

      const inspectedFatal = transition(inspected, "go out on the balcony");
      expect(inspectedFatal.currentNode).toBe("stage5_mezzanine_death_choice");
      expect(inspectedFatal.lastDeathType).toBe("environmental_hazard");
    });

    it("handles mezzanine umbrella check from stage5_balcony_inspected ('go back') as fatal monster_attack to stage5_mezzanine_end_death_choice both with and without umbrella", () => {
      const withoutUmbrella = makeState("stage5_balcony_inspected", ["flashlight", "pocketknife"]);
      const deadNoUmbrella = transition(withoutUmbrella, "go back");
      expect(deadNoUmbrella.currentNode).toBe("stage5_mezzanine_end_death_choice");
      expect(deadNoUmbrella.lastDeathType).toBe("monster_attack");
      expect(deadNoUmbrella.isGameOver).toBe(false);
      expect(deadNoUmbrella.isWin).toBe(false);

      const withUmbrella = makeState("stage5_balcony_inspected", [
        "flashlight",
        "pocketknife",
        "umbrella",
      ]);
      const deadWithUmbrella = transition(withUmbrella, "go back");
      expect(deadWithUmbrella.currentNode).toBe("stage5_mezzanine_end_death_choice");
      expect(deadWithUmbrella.lastDeathType).toBe("monster_attack");
      expect(deadWithUmbrella.isGameOver).toBe(false);
      expect(deadWithUmbrella.isWin).toBe(false);

      const retried = transition(deadWithUmbrella, "try again");
      expect(retried.currentNode).toBe("stage4_structural_hub");
      expect(retried.lastDeathType).toBeNull();
      expect(retried.isGameOver).toBe(false);

      const gaveUp = transition(deadWithUmbrella, "give up");
      expect(gaveUp.currentNode).toBe("game_over");
      expect(gaveUp.lastDeathType).toBeNull();
      expect(gaveUp.isGameOver).toBe(true);
    });

    it("evaluates direct transitions from stage5_mezzanine_umbrella_check based on umbrella presence", () => {
      const directNoUmbrella = makeState("stage5_mezzanine_umbrella_check", []);
      const resNo = transition(directNoUmbrella, "1");
      expect(resNo.currentNode).toBe("stage5_mezzanine_end_death_choice");
      expect(resNo.lastDeathType).toBe("monster_attack");
      expect(resNo.isGameOver).toBe(false);

      const directWithUmbrella = makeState("stage5_mezzanine_umbrella_check", ["umbrella"]);
      const resWith = transition(directWithUmbrella, "2");
      expect(resWith.currentNode).toBe("stage5_mezzanine_end_death_choice");
      expect(resWith.lastDeathType).toBe("monster_attack");
      expect(resWith.isGameOver).toBe(false);
    });
  });

  describe("Basement entry & umbrella survival gate", () => {
    it("triggers environmental_hazard and transitions to stage5_basement_death_choice on 'go down the stairs' at stage5_basement_arrival", () => {
      const arrival = makeState("stage5_basement_arrival", ["flashlight", "pocketknife"]);
      const next = transition(arrival, "go down the stairs");

      expect(next.currentNode).toBe("stage5_basement_death_choice");
      expect(next.lastDeathType).toBe("environmental_hazard");
      expect(next.isGameOver).toBe(false);
    });

    it("respawns at stage5_basement_arrival on 'try again' and ends game on 'give up' from stage5_basement_death_choice", () => {
      const deathState = makeState("stage5_basement_death_choice", ["flashlight", "pocketknife"]);

      const retried = transition(deathState, "try again");
      expect(retried.currentNode).toBe("stage5_basement_arrival");
      expect(retried.lastDeathType).toBeNull();
      expect(retried.isGameOver).toBe(false);

      const gaveUp = transition(deathState, "give up");
      expect(gaveUp.currentNode).toBe("game_over");
      expect(gaveUp.lastDeathType).toBeNull();
      expect(gaveUp.isGameOver).toBe(true);
    });

    it("transitions to stage5_basement_searched on 'look around' at stage5_basement_arrival", () => {
      const arrival = makeState("stage5_basement_arrival", ["flashlight", "pocketknife"]);
      const searched = transition(arrival, "look around");

      expect(searched.currentNode).toBe("stage5_basement_searched");
      expect(searched.lastDeathType).toBeNull();
      expect(searched.isGameOver).toBe(false);
    });

    it("enforces basement umbrella check as a survival gate: routes to stage5_basement_umbrella_death_choice without umbrella and advances to stage5_flooded_corridor with umbrella", () => {
      const searchedNoUmbrella = makeState("stage5_basement_searched", [
        "flashlight",
        "pocketknife",
      ]);
      const failed = transition(searchedNoUmbrella, "go further");
      expect(failed.currentNode).toBe("stage5_basement_umbrella_death_choice");
      expect(failed.lastDeathType).toBe("environmental_hazard");
      expect(failed.isGameOver).toBe(false);
      expect(failed.isWin).toBe(false);

      const retried = transition(failed, "try again");
      expect(retried.currentNode).toBe("stage3_row2_encounter");
      expect(retried.lastDeathType).toBeNull();
      expect(retried.isGameOver).toBe(false);

      const gaveUp = transition(failed, "give up");
      expect(gaveUp.currentNode).toBe("game_over");
      expect(gaveUp.lastDeathType).toBeNull();
      expect(gaveUp.isGameOver).toBe(true);

      const searchedWithUmbrella = makeState("stage5_basement_searched", [
        "flashlight",
        "pocketknife",
        "umbrella",
      ]);
      const survived = transition(searchedWithUmbrella, "go further");
      expect(survived.currentNode).toBe("stage5_flooded_corridor");
      expect(survived.lastDeathType).toBeNull();
      expect(survived.isGameOver).toBe(false);
      expect(survived.isWin).toBe(false);
    });

    it("evaluates direct transitions from stage5_basement_umbrella_check based on umbrella presence", () => {
      const checkNoUmbrella = makeState("stage5_basement_umbrella_check", []);
      const failed = transition(checkNoUmbrella, "1");
      expect(failed.currentNode).toBe("stage5_basement_umbrella_death_choice");
      expect(failed.lastDeathType).toBe("environmental_hazard");
      expect(failed.isGameOver).toBe(false);

      const checkWithUmbrella = makeState("stage5_basement_umbrella_check", ["umbrella"]);
      const passed = transition(checkWithUmbrella, "2");
      expect(passed.currentNode).toBe("stage5_flooded_corridor");
      expect(passed.lastDeathType).toBeNull();
      expect(passed.isGameOver).toBe(false);
    });
  });

  describe("Flooded corridor & water movement progression", () => {
    it("transitions to stage5_flooded_corridor_blocked on 'go back', triggers monster_attack on 'get in the water', and advances to stage5_water_step_1 on 'look around'", () => {
      const corridor = makeState("stage5_flooded_corridor", ["umbrella"]);

      const blocked = transition(corridor, "go back");
      expect(blocked.currentNode).toBe("stage5_flooded_corridor_blocked");
      expect(blocked.lastDeathType).toBeNull();

      const corridorFatal = transition(corridor, "get in the water");
      expect(corridorFatal.currentNode).toBe("stage5_basement_death_choice");
      expect(corridorFatal.lastDeathType).toBe("monster_attack");
      expect(corridorFatal.isGameOver).toBe(false);

      const blockedFatal = transition(blocked, "get in the water");
      expect(blockedFatal.currentNode).toBe("stage5_basement_death_choice");
      expect(blockedFatal.lastDeathType).toBe("monster_attack");
      expect(blockedFatal.isGameOver).toBe(false);

      const step1FromCorridor = transition(corridor, "look around");
      expect(step1FromCorridor.currentNode).toBe("stage5_water_step_1");
      expect(step1FromCorridor.lastDeathType).toBeNull();

      const step1FromBlocked = transition(blocked, "look around");
      expect(step1FromBlocked.currentNode).toBe("stage5_water_step_1");
      expect(step1FromBlocked.lastDeathType).toBeNull();
    });

    it("enforces slow movement through water steps 1, 2, and 3 and triggers monster_attack on rushing choices", () => {
      const step1 = makeState("stage5_water_step_1", ["umbrella"]);

      const jumpFatal = transition(step1, "jump in");
      expect(jumpFatal.currentNode).toBe("stage5_basement_death_choice");
      expect(jumpFatal.lastDeathType).toBe("monster_attack");
      expect(jumpFatal.isGameOver).toBe(false);

      const step2 = transition(step1, "enter the water slowly");
      expect(step2.currentNode).toBe("stage5_water_step_2");
      expect(step2.lastDeathType).toBeNull();

      const runFatal = transition(step2, "start running");
      expect(runFatal.currentNode).toBe("stage5_basement_death_choice");
      expect(runFatal.lastDeathType).toBe("monster_attack");
      expect(runFatal.isGameOver).toBe(false);

      const step3 = transition(step2, "go slowly");
      expect(step3.currentNode).toBe("stage5_water_step_3");
      expect(step3.lastDeathType).toBeNull();

      const rushFatal = transition(step3, "rush out of the water");
      expect(rushFatal.currentNode).toBe("stage5_basement_death_choice");
      expect(rushFatal.lastDeathType).toBe("monster_attack");
      expect(rushFatal.isGameOver).toBe(false);

      const archiveEntry = transition(step3, "slowly climb out");
      expect(archiveEntry.currentNode).toBe("stage5_occult_archive_entry");
      expect(archiveEntry.lastDeathType).toBeNull();
    });
  });

  describe("Occult Archive hub, cave approaches, and game_win", () => {
    it("handles stage5_occult_archive_entry fatal 'go towards the light' and safe 'look around'", () => {
      const entry = makeState("stage5_occult_archive_entry", ["umbrella"]);

      const lightFatal = transition(entry, "go towards the light");
      expect(lightFatal.currentNode).toBe("stage5_basement_death_choice");
      expect(lightFatal.lastDeathType).toBe("environmental_hazard");

      const hub = transition(entry, "look around");
      expect(hub.currentNode).toBe("stage5_occult_archive_hub");
      expect(hub.lastDeathType).toBeNull();
    });

    it("supports cave approaches from unexplored, windows-tested, and desk-searched hub states, searching the desk or stepping closer to stage5_cave_approach_final -> game_win", () => {
      const hub = makeState("stage5_occult_archive_hub", ["umbrella"]);

      // Direct approach from unexplored hub
      const caveUnexplored = transition(hub, "approach cave");
      expect(caveUnexplored.currentNode).toBe("stage5_cave_approach_unexplored");

      const searchFromUnexplored = transition(caveUnexplored, "search desk");
      expect(searchFromUnexplored.currentNode).toBe("stage5_desk_searched_hub");

      const finalFromUnexplored = transition(caveUnexplored, "step closer");
      expect(finalFromUnexplored.currentNode).toBe("stage5_cave_approach_final");
      expect(finalFromUnexplored.isWin).toBe(false);
      expect(finalFromUnexplored.lastDeathType).toBeNull();

      const winFromUnexplored = transition(finalFromUnexplored, "climb out to safety");
      expect(winFromUnexplored.currentNode).toBe("game_win");
      expect(winFromUnexplored.isWin).toBe(true);
      expect(winFromUnexplored.isGameOver).toBe(false);
      expect(winFromUnexplored.lastDeathType).toBeNull();

      // Approach after testing windows only
      const windowsTested = transition(hub, "try the windows");
      expect(windowsTested.currentNode).toBe("stage5_windows_tested_hub");
      const caveWindowsTested = transition(windowsTested, "approach cave");
      expect(caveWindowsTested.currentNode).toBe("stage5_cave_approach_windows_tested");

      const searchFromWindowsCave = transition(caveWindowsTested, "search desk");
      expect(searchFromWindowsCave.currentNode).toBe("stage5_both_tested_hub");

      const finalFromWindowsCave = transition(caveWindowsTested, "step closer");
      expect(finalFromWindowsCave.currentNode).toBe("stage5_cave_approach_final");
      const winFromWindowsCave = transition(finalFromWindowsCave, "climb out to safety");
      expect(winFromWindowsCave.currentNode).toBe("game_win");

      // Approach after searching desk only goes directly to final cave approach
      const deskSearched = transition(hub, "search desk");
      expect(deskSearched.currentNode).toBe("stage5_desk_searched_hub");
      expect(transition(deskSearched, "approach cave").currentNode).toBe(
        "stage5_cave_approach_final",
      );
    });

    it("reaches stage5_both_tested_hub via either exploration order and transitions to stage5_cave_approach_final -> game_win", () => {
      const hub = makeState("stage5_occult_archive_hub", ["umbrella"]);

      // Windows then desk
      const windowsFirst = transition(transition(hub, "try the windows"), "search desk");
      expect(windowsFirst.currentNode).toBe("stage5_both_tested_hub");

      // Desk then windows
      const deskFirst = transition(transition(hub, "search desk"), "try the windows");
      expect(deskFirst.currentNode).toBe("stage5_both_tested_hub");

      const finalCave = transition(windowsFirst, "approach cave");
      expect(finalCave.currentNode).toBe("stage5_cave_approach_final");
      expect(finalCave.lastDeathType).toBeNull();

      const won = transition(finalCave, "climb out to safety");
      expect(won.currentNode).toBe("game_win");
      expect(won.isWin).toBe(true);
      expect(won.isGameOver).toBe(false);
      expect(won.lastDeathType).toBeNull();

      // Terminal state ignores further commands
      const afterWin = transition(won, "look around");
      expect(afterWin).toBe(won);
    });
  });

  describe("available choices, invalid inputs, and content decoupling", () => {
    it("returns Stage 5 choices via getAvailableChoices", () => {
      expect(getAvailableChoices("stage5_mezzanine_arrival")).toEqual([
        "go forward",
        "look around",
      ]);
      expect(getAvailableChoices("stage5_occult_archive_hub")).toEqual([
        "try the windows",
        "search desk",
        "approach cave",
      ]);
      expect(getAvailableChoices("stage5_mezzanine_end_death_choice")).toEqual([
        "try again",
        "give up",
      ]);
      expect(getAvailableChoices("stage5_basement_umbrella_death_choice")).toEqual([
        "try again",
        "give up",
      ]);
      expect(getAvailableChoices("stage5_flooded_corridor")).toEqual([
        "go back",
        "get in the water",
        "look around",
      ]);
      expect(getAvailableChoices("stage5_flooded_corridor_blocked")).toEqual([
        "get in the water",
        "look around",
      ]);
      expect(getAvailableChoices("stage5_cave_approach_unexplored")).toEqual([
        "search desk",
        "step closer",
      ]);
      expect(getAvailableChoices("stage5_cave_approach_windows_tested")).toEqual([
        "search desk",
        "step closer",
      ]);
      expect(getAvailableChoices("stage5_cave_approach_final")).toEqual(["climb out to safety"]);
    });

    it("remains on the current node and outputs parser fallback on empty or unmatched commands", () => {
      const catalog = loadContent();
      const state = makeState("stage5_occult_archive_hub", ["umbrella"]);

      const empty = transition(state, "   ", catalog);
      expect(empty.currentNode).toBe("stage5_occult_archive_hub");
      expect(empty.lastDeathType).toBeNull();
      expect(empty.output).toEqual([catalog.parser_fallbacks[0]]);

      const unmatched = transition(state, "cast spell", catalog);
      expect(unmatched.currentNode).toBe("stage5_occult_archive_hub");
      expect(unmatched.lastDeathType).toBeNull();
      expect(unmatched.output).toEqual([catalog.parser_fallbacks[0]]);
    });

    it("resolves Stage 5 node descriptions and death screens dynamically from injected catalog", () => {
      const customCatalog: ContentCatalog = {
        intro: ["intro"],
        nodes: {
          stage5_balcony_inspected: ["balcony-inspected-node"],
          stage5_mezzanine_umbrella_check: ["mezzanine-check-node"],
          stage5_mezzanine_end_death_choice: ["mezzanine-end-death-choice-node"],
          stage5_basement_searched: ["basement-searched-node"],
          stage5_basement_umbrella_check: ["basement-umbrella-check-node"],
          stage5_basement_umbrella_death_choice: ["basement-umbrella-death-choice-node"],
          stage5_flooded_corridor: ["flooded-corridor-node"],
          stage5_cave_approach_final: ["cave-final-node"],
          game_over: ["game-over-node"],
          game_win: ["game-win-node"],
        },
        death_screens: {
          stage5_mezzanine_umbrella_check__no_umbrella_check: ["mezzanine-no-umbrella-death"],
          stage5_mezzanine_umbrella_check__with_umbrella_check: ["mezzanine-with-umbrella-death"],
          stage5_basement_umbrella_check__no_umbrella_check: ["basement-no-umbrella-death"],
        },
        parser_fallbacks: ["fallback"],
      };

      const mezzanineNoUmbrella = transition(
        makeState("stage5_balcony_inspected"),
        "go back",
        customCatalog,
      );
      expect(mezzanineNoUmbrella.output).toEqual([
        "mezzanine-check-node",
        "mezzanine-no-umbrella-death",
        "mezzanine-end-death-choice-node",
      ]);

      const mezzanineWithUmbrella = transition(
        makeState("stage5_balcony_inspected", ["umbrella"]),
        "go back",
        customCatalog,
      );
      expect(mezzanineWithUmbrella.output).toEqual([
        "mezzanine-check-node",
        "mezzanine-with-umbrella-death",
        "mezzanine-end-death-choice-node",
      ]);

      const basementNoUmbrella = transition(
        makeState("stage5_basement_searched"),
        "go further",
        customCatalog,
      );
      expect(basementNoUmbrella.output).toEqual([
        "basement-umbrella-check-node",
        "basement-no-umbrella-death",
        "basement-umbrella-death-choice-node",
      ]);

      const basementWithUmbrella = transition(
        makeState("stage5_basement_searched", ["umbrella"]),
        "go further",
        customCatalog,
      );
      expect(basementWithUmbrella.output).toEqual([
        "basement-umbrella-check-node",
        "flooded-corridor-node",
      ]);

      const winState = transition(
        makeState("stage5_cave_approach_final", ["umbrella"]),
        "climb out to safety",
        customCatalog,
      );
      expect(winState.output).toEqual(["game-win-node"]);
    });
  });

  describe("End-to-End Integration: Full Winning Playthrough (Stage 1 -> Stage 5)", () => {
    it("completes a full winning playthrough from stage1_vestibule to game_win", () => {
      let state = createInitialState();
      expect(state.currentNode).toBe("stage1_vestibule");
      expect(state.isGameOver).toBe(false);
      expect(state.isWin).toBe(false);

      // Stage 1: Vestibule -> acquire mop -> hop turnstiles
      state = transition(state, "look around");
      expect(state.currentNode).toBe("stage1_vestibule_searched");

      state = transition(state, "look in the pack");
      expect(state.currentNode).toBe("stage1_pack_checked");

      state = transition(state, "pick up mop");
      expect(state.currentNode).toBe("stage1_mop_acquired");
      expect(state.inventory).toContain("mop");

      state = transition(state, "hop turnstiles");
      expect(state.currentNode).toBe("stage2_foyer");

      // Stage 2: Foyer -> loot corpse & desk -> explore periodicals -> reading room -> fireplace poker -> stacks door
      state = transition(state, "look around");
      expect(state.currentNode).toBe("stage2_foyer_searched");

      state = transition(state, "search corpse");
      expect(state.currentNode).toBe("stage2_corpse_looted");

      state = transition(state, "search desk");
      expect(state.currentNode).toBe("stage2_both_looted");
      expect(state.inventory).toContain("stacks key");

      state = transition(state, "explore periodicals");
      expect(state.currentNode).toBe("stage2_reading_room_door");

      state = transition(state, "try the lock quietly");
      expect(state.currentNode).toBe("stage2_reading_room_locked");

      state = transition(state, "look around");
      expect(state.currentNode).toBe("stage2_fireplace_revealed");

      state = transition(state, "search fireplace");
      expect(state.currentNode).toBe("stage2_poker_acquired");
      expect(state.inventory).toContain("fireplace poker");
      expect(state.inventory).not.toContain("mop");

      state = transition(state, "go deeper");
      expect(state.currentNode).toBe("stage3_hub_unexplored");

      // Stage 3: Stacks -> arrival ambush auto-resolves with poker -> loot Row 4 (flashlight) & Row 2 (pocketknife, umbrella) -> advance to Stage 4
      state = transition(state, "look around");
      expect(state.currentNode).toBe("stage3_hub");

      state = transition(state, "peer down row 4");
      expect(state.row4_safe).toBe(true);

      state = transition(state, "go down row 4");
      expect(state.currentNode).toBe("stage3_row4_encounter");

      state = transition(state, "search backpack");
      expect(state.currentNode).toBe("stage3_row4_looted");
      expect(state.inventory).toContain("flashlight");

      state = transition(state, "go back");
      expect(state.currentNode).toBe("stage3_hub");

      state = transition(state, "peer down row 2");
      expect(state.row2_safe).toBe(true);

      state = transition(state, "go down row 2");
      expect(state.currentNode).toBe("stage3_row2_encounter");

      state = transition(state, "search corpse");
      expect(state.currentNode).toBe("stage3_row2_looted");
      expect(state.inventory).toContain("pocketknife");
      expect(state.inventory).toContain("umbrella");

      state = transition(state, "go deeper");
      expect(state.currentNode).toBe("stage4_entry");
      expect(state.isGameOver).toBe(false);

      // Stage 4: Deep Stacks Maze -> navigate Junctions A through F -> Structural Hub -> Basement
      state = transition(state, "look around");
      expect(state.currentNode).toBe("stage4_junction_a");

      state = transition(state, "hug the wall");
      expect(state.currentNode).toBe("stage4_junction_b");

      state = transition(state, "remove tapestry");
      expect(state.currentNode).toBe("stage4_junction_c");

      state = transition(state, "step across");
      expect(state.currentNode).toBe("stage4_junction_d");

      state = transition(state, "go right");
      expect(state.currentNode).toBe("stage4_junction_e");

      state = transition(state, "bypass alcove");
      expect(state.currentNode).toBe("stage4_junction_f");

      state = transition(state, "duck under");
      expect(state.currentNode).toBe("stage4_structural_hub");

      state = transition(state, "go into basement");
      expect(state.currentNode).toBe("stage5_basement_arrival");

      // Stage 5: Basement -> umbrella check -> water steps 1-3 -> Occult Archive -> Cave -> Win
      state = transition(state, "look around");
      expect(state.currentNode).toBe("stage5_basement_searched");

      state = transition(state, "go further");
      expect(state.currentNode).toBe("stage5_flooded_corridor");

      state = transition(state, "look around");
      expect(state.currentNode).toBe("stage5_water_step_1");

      state = transition(state, "enter the water slowly");
      expect(state.currentNode).toBe("stage5_water_step_2");

      state = transition(state, "go slowly");
      expect(state.currentNode).toBe("stage5_water_step_3");

      state = transition(state, "slowly climb out");
      expect(state.currentNode).toBe("stage5_occult_archive_entry");

      state = transition(state, "look around");
      expect(state.currentNode).toBe("stage5_occult_archive_hub");

      state = transition(state, "try the windows");
      expect(state.currentNode).toBe("stage5_windows_tested_hub");

      state = transition(state, "search desk");
      expect(state.currentNode).toBe("stage5_both_tested_hub");

      state = transition(state, "approach cave");
      expect(state.currentNode).toBe("stage5_cave_approach_final");

      state = transition(state, "climb out to safety");
      expect(state.currentNode).toBe("game_win");
      expect(state.isWin).toBe(true);
      expect(state.isGameOver).toBe(false);
      expect(state.lastDeathType).toBeNull();
    });
  });
});
