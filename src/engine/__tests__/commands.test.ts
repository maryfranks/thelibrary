import { describe, expect, it } from "vitest";
import { createInitialState, getAvailableChoices, getSceneEntries, processCommand } from "../index";
import type { GameState } from "../types";

const promptCount = (entries: { text: string }[]) =>
  entries.filter((e) => e.text === "Do you want to:").length;

describe("getSceneEntries", () => {
  it("lists output then prompt with the initial node's choices", () => {
    const state = createInitialState();
    const entries = getSceneEntries(state);
    expect(promptCount(entries)).toBe(1);
    expect(entries.every((e) => e.kind === "out")).toBe(true);
    const choices = getAvailableChoices(state.currentNode);
    expect(entries.length).toBe(state.output.length + 1 + choices.length);
  });

  it("omits the prompt for terminal states", () => {
    const state: GameState = { ...createInitialState(), currentNode: "game_win", isWin: true };
    expect(promptCount(getSceneEntries(state))).toBe(0);
  });
});

describe("processCommand", () => {
  it("appends the prompt after a node-changing transition", () => {
    const initial = createInitialState();
    const r = processCommand(initial, "look around");
    expect(r.isSystem).toBe(false);
    expect(r.clear).toBe(false);
    expect(r.state.currentNode).not.toBe(initial.currentNode);
    expect(promptCount(r.entries)).toBe(1);
    expect(r.entries.length).toBe(
      r.state.output.length + 1 + getAvailableChoices(r.state.currentNode).length,
    );
  });

  it("accepts index input", () => {
    const initial = createInitialState();
    const byIndex = processCommand(initial, " 1 ");
    const byText = processCommand(initial, getAvailableChoices(initial.currentNode)[0]);
    expect(byIndex.state.currentNode).toBe(byText.state.currentNode);
  });

  it("re-displays the choice prompt after invalid input", () => {
    const initial = createInitialState();
    const r = processCommand(initial, "xyzzy");
    expect(r.state.currentNode).toBe(initial.currentNode);
    expect(promptCount(r.entries)).toBe(1);
  });

  it("handles global ambient 'look in the pack' and 'look around' without changing node state", () => {
    const state: GameState = {
      ...createInitialState(),
      currentNode: "stage2_reading_room_door",
      inventory: ["mop"],
    };

    const packResult = processCommand(state, "look in the pack");
    expect(packResult.state.currentNode).toBe("stage2_reading_room_door");
    expect(packResult.entries).toContainEqual({ kind: "sys", text: "Inventory: mop" });
    expect(promptCount(packResult.entries)).toBe(1);

    const lookResult = processCommand(state, "look around");
    expect(lookResult.state.currentNode).toBe("stage2_reading_room_door");
    expect(lookResult.state.output.length).toBeGreaterThan(0);
    expect(promptCount(lookResult.entries)).toBe(1);
  });

  it("does not prompt when the game is already over", () => {
    const over: GameState = { ...createInitialState(), currentNode: "game_over", isGameOver: true };
    const r = processCommand(over, "1");
    expect(r.state).toBe(over);
    expect(promptCount(r.entries)).toBe(0);
  });

  it("does not prompt on a terminal transition", () => {
    const state: GameState = {
      ...createInitialState(),
      currentNode: "stage5_cave_approach_final",
    };
    const r = processCommand(state, "climb out to safety");
    expect(r.state.isWin).toBe(true);
    expect(promptCount(r.entries)).toBe(0);
  });

  it.each(["help", "HELP", "inventory", "inv", "i"])(
    "treats %s as a system command without changing state or prompting",
    (cmd) => {
      const initial = createInitialState();
      const r = processCommand(initial, cmd);
      expect(r.isSystem).toBe(true);
      expect(r.state).toBe(initial);
      expect(r.entries.every((e) => e.kind === "sys")).toBe(true);
      expect(promptCount(r.entries)).toBe(0);
    },
  );

  it("help lists the current node's choices", () => {
    const initial = createInitialState();
    const r = processCommand(initial, "help");
    for (const c of getAvailableChoices(initial.currentNode)) {
      expect(r.entries[0].text).toContain(c);
    }
  });

  it("inventory reports contents or empty", () => {
    const initial = createInitialState();
    expect(processCommand(initial, "inv").entries[0].text).toContain("empty");
    const withItem = { ...initial, inventory: ["umbrella" as const] };
    expect(processCommand(withItem, "i").entries[0].text).toContain("umbrella");
  });

  it("clear requests a buffer wipe with no entries or prompt", () => {
    const initial = createInitialState();
    const r = processCommand(initial, "clear");
    expect(r.clear).toBe(true);
    expect(r.entries).toEqual([]);
    expect(r.state).toBe(initial);
  });
});

describe("inventory display", () => {
  const at = (
    node: GameState["currentNode"],
    inventory: GameState["inventory"] = [],
  ): GameState => ({
    ...createInitialState(),
    currentNode: node,
    inventory,
  });
  const invLines = (entries: { kind: string; text: string }[]) =>
    entries.filter((e) => e.kind === "sys" && e.text.startsWith("Inventory:"));

  it("prints inventory when it changes (pick up mop, search corpse, search desk, fireplace)", () => {
    expect(invLines(processCommand(at("stage1_pack_checked"), "pick up mop").entries)).toEqual([
      { kind: "sys", text: "Inventory: mop" },
    ]);
    expect(
      invLines(processCommand(at("stage2_foyer_searched"), "search corpse").entries),
    ).toHaveLength(1);
    expect(
      invLines(processCommand(at("stage2_foyer_searched"), "search desk").entries),
    ).toHaveLength(1);
    expect(
      invLines(
        processCommand(at("stage2_fireplace_revealed", ["mop"]), "search fireplace").entries,
      ),
    ).toEqual([{ kind: "sys", text: "Inventory: fireplace poker" }]);
  });

  it("prints inventory on 'look in the pack' at stage1_pack_checked and stage 2 nodes", () => {
    expect(
      invLines(processCommand(at("stage1_pack_checked"), "look in the pack").entries),
    ).toHaveLength(1);
    for (const node of [
      "stage2_foyer_searched",
      "stage2_corpse_looted",
      "stage2_desk_looted",
      "stage2_both_looted",
    ] as const) {
      const r = processCommand(at(node, ["mop"]), "look in the pack");
      expect(invLines(r.entries)).toEqual([{ kind: "sys", text: "Inventory: mop" }]);
    }
  });

  it("does not print inventory when nothing changed and no pack look", () => {
    expect(
      invLines(processCommand(at("stage2_foyer", ["mop"]), "look around").entries),
    ).toHaveLength(0);
  });
});
