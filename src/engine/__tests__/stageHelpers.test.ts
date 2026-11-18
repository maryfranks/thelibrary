import { describe, expect, it, vi } from "vitest";
import { createInitialState } from "../transition";
import {
  applyChoiceOutcome,
  matchStageChoice,
  mutateInventory,
  parserFallbackState,
} from "../stageHelpers";
import * as telemetry from "../telemetry";
import type { ContentCatalog } from "../types";

const MOCK_CONTENT: ContentCatalog = {
  intro: ["Intro line"],
  nodes: {
    stage1_vestibule: ["Vestibule"],
    stage1_vestibule_searched: ["Searched"],
    game_over: ["Game over"],
    game_win: ["You win"],
  },
  death_screens: {
    stage1_vestibule__try_to_leave: ["Died leaving"],
  },
  parser_fallbacks: ["Try again."],
};

describe("stageHelpers", () => {
  describe("mutateInventory", () => {
    it("adds unique items without mutating the original array", () => {
      const initial: ("snack" | "novel")[] = ["snack"];
      const next = mutateInventory(initial, ["snack", "novel"]);
      expect(next).toEqual(["snack", "novel"]);
      expect(initial).toEqual(["snack"]);
    });

    it("removes specified items and adds new items", () => {
      const next = mutateInventory(["snack", "mop"], ["fireplace poker"], ["mop"]);
      expect(next).toEqual(["snack", "fireplace poker"]);
    });
  });

  describe("matchStageChoice", () => {
    const choices = [
      { command: "look around", target: "stage1_vestibule_searched" as const },
      { command: "try to leave", target: "stage1_vestibule_respawn" as const },
    ];

    it("matches by trimmed, case-insensitive command or 1-based index", () => {
      expect(matchStageChoice(choices, "  LOOK AROUND  ")?.command).toBe("look around");
      expect(matchStageChoice(choices, "2")?.command).toBe("try to leave");
    });

    it("returns undefined for empty or unmatched input", () => {
      expect(matchStageChoice(choices, "   ")).toBeUndefined();
      expect(matchStageChoice(choices, "99")).toBeUndefined();
      expect(matchStageChoice(choices, "dance")).toBeUndefined();
    });
  });

  describe("parserFallbackState", () => {
    it("clears lastDeathType and sets fallback output", () => {
      const state = {
        ...createInitialState(MOCK_CONTENT),
        lastDeathType: "monster_attack" as const,
      };
      const fallback = parserFallbackState(state, MOCK_CONTENT);
      expect(fallback.lastDeathType).toBeNull();
      expect(fallback.output).toEqual(["Try again."]);
    });
  });

  describe("applyChoiceOutcome", () => {
    it("records death and includes death screen + node lines", () => {
      const deathSpy = vi.spyOn(telemetry, "recordDeath").mockImplementation(() => {});
      const state = createInitialState(MOCK_CONTENT);
      const next = applyChoiceOutcome(state, {
        stage: "stage1",
        nextNode: "stage1_vestibule_searched",
        inventory: ["snack"],
        deathType: "monster_attack",
        deathScreenCommand: "try to leave",
        content: MOCK_CONTENT,
      });

      expect(deathSpy).toHaveBeenCalledWith({
        stage: "stage1",
        death_type: "monster_attack",
        node_id: "stage1_vestibule",
      });
      expect(next.currentNode).toBe("stage1_vestibule_searched");
      expect(next.inventory).toEqual(["snack"]);
      expect(next.lastDeathType).toBe("monster_attack");
      expect(next.output).toEqual(["Died leaving", "Searched"]);
      deathSpy.mockRestore();
    });

    it("records loss on game_over and win only for stage5 game_win", () => {
      const runSpy = vi.spyOn(telemetry, "recordRunCompleted").mockImplementation(() => {});
      const state = createInitialState(MOCK_CONTENT);

      const loss = applyChoiceOutcome(state, {
        stage: "stage2",
        nextNode: "game_over",
        inventory: [],
        content: MOCK_CONTENT,
      });
      expect(loss.isGameOver).toBe(true);
      expect(loss.isWin).toBe(false);
      expect(runSpy).toHaveBeenCalledWith({ outcome: "loss", final_stage: "stage2" });

      const win = applyChoiceOutcome(state, {
        stage: "stage5",
        nextNode: "game_win",
        inventory: [],
        content: MOCK_CONTENT,
      });
      expect(win.isWin).toBe(true);
      expect(win.isGameOver).toBe(false);
      expect(runSpy).toHaveBeenCalledWith({ outcome: "win", final_stage: "stage5" });

      runSpy.mockRestore();
    });

    it("supports prefixLines and suppressNodeLines", () => {
      const state = createInitialState(MOCK_CONTENT);
      const next = applyChoiceOutcome(state, {
        stage: "stage3",
        nextNode: "stage1_vestibule_searched",
        inventory: [],
        prefixLines: ["Action line"],
        suppressNodeLines: true,
        content: MOCK_CONTENT,
      });
      expect(next.output).toEqual(["Action line"]);
    });
  });
});
