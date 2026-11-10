import { describe, expect, it } from "vitest";
import {
  CHOICE_PROMPT_HEADER,
  createInitialState,
  formatChoicePrompt,
  getAvailableChoices,
  getTransitionPrompt,
  transition,
} from "../index";
import type { GameState } from "../types";

function expectedPrompt(state: GameState): string[] {
  return [
    CHOICE_PROMPT_HEADER,
    ...getAvailableChoices(state.currentNode).map((c, i) => `  ${i + 1}. ${c}`),
  ];
}

describe("choice prompt", () => {
  it("formats numbered choices for the initial node", () => {
    const state = createInitialState();
    const lines = formatChoicePrompt(state.currentNode);
    expect(lines[0]).toBe("Do you want to:");
    expect(lines).toEqual(expectedPrompt(state));
    expect(lines.length).toBe(getAvailableChoices(state.currentNode).length + 1);
  });

  it("appends choices for the new node after a node-changing transition", () => {
    const initial = createInitialState();
    const next = transition(initial, "look around");
    expect(next.currentNode).not.toBe(initial.currentNode);
    expect(getTransitionPrompt(initial, next)).toEqual(expectedPrompt(next));
  });

  it("is omitted on terminal nodes", () => {
    const base = createInitialState();
    const win: GameState = { ...base, currentNode: "game_win", isWin: true };
    const over: GameState = { ...base, currentNode: "game_over", isGameOver: true };
    expect(formatChoicePrompt("game_win")).toEqual([]);
    expect(formatChoicePrompt("game_over")).toEqual([]);
    expect(getTransitionPrompt(base, win)).toEqual([]);
    expect(getTransitionPrompt(base, over)).toEqual([]);
  });

  it("re-renders choices when a command leaves the node unchanged (ambient, blocked, or invalid)", () => {
    const initial = createInitialState();
    const next = transition(initial, "xyzzy");
    expect(next.currentNode).toBe(initial.currentNode);
    expect(getTransitionPrompt(initial, next)).toEqual(expectedPrompt(next));

    const packLook = transition(initial, "look in the pack");
    expect(packLook.currentNode).toBe(initial.currentNode);
    expect(getTransitionPrompt(initial, packLook)).toEqual(expectedPrompt(packLook));
  });

  it("still accepts 1-based index input matching the listed option", () => {
    const initial = createInitialState();
    const byText = transition(initial, getAvailableChoices(initial.currentNode)[0]);
    const byIndex = transition(initial, "1");
    expect(byIndex.currentNode).toBe(byText.currentNode);
  });
});
