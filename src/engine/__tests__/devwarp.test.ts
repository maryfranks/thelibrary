import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../index";
import { tryDevWarp } from "../devwarp";

describe("tryDevWarp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("outputs the dev warp banner without ANSI escape codes", () => {
    const state = createInitialState();
    const warped = tryDevWarp(state, "stage2");

    expect(warped).not.toBeNull();
    expect(warped?.currentNode).toBe("stage2_foyer");
    expect(warped?.output[0]).toBe("[DEV WARP -> stage2_foyer]");
    expect(warped?.output[0]?.includes("\x1b")).toBe(false);
  });

  it("returns null for non-warp input", () => {
    const state = createInitialState();
    expect(tryDevWarp(state, "look around")).toBeNull();
  });

  it("returns null when import.meta.env.DEV is false", () => {
    vi.stubEnv("DEV", false);
    const state = createInitialState();
    expect(tryDevWarp(state, "stage2")).toBeNull();
  });
});
