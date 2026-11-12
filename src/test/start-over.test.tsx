import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as engine from "@/engine";
import { Index } from "@/routes/index";

describe("Start Over Button", () => {
  let recordDeathSpy: ReturnType<typeof vi.spyOn>;
  let forceFlushSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(engine.metricExporter, "export").mockImplementation((_metrics, callback) => {
      callback({ code: 0 });
    });
    vi.spyOn(engine.metricExporter, "forceFlush").mockResolvedValue(undefined);
    forceFlushSpy = vi.spyOn(engine.meterProvider, "forceFlush");
    recordDeathSpy = vi.spyOn(engine.deathsCounter, "add");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a centered button labeled 'Start Over' outside and below the terminal container", () => {
    render(<Index />);
    const button = screen.getByRole("button", { name: "Start Over" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Start Over");

    // Styling checks according to design_system.md
    expect(button).toHaveClass("font-mono");
    expect(button).toHaveClass("border-brass-border");
    expect(button).toHaveClass("bg-card");
    expect(button).toHaveClass("text-foreground");
    expect(button).toHaveClass("rounded-md");

    // Verify parent layout centers the button below the terminal container
    const parentContainer = button.parentElement;
    expect(parentContainer).toHaveClass("flex");
    expect(parentContainer).toHaveClass("flex-col");
    expect(parentContainer).toHaveClass("items-center");
  });

  it("records mysterious_disappearance death metric and flushes telemetry when clicked during active gameplay", () => {
    render(<Index />);
    const button = screen.getByRole("button", { name: "Start Over" });

    fireEvent.click(button);

    expect(recordDeathSpy).toHaveBeenCalledTimes(1);
    expect(recordDeathSpy).toHaveBeenCalledWith(1, {
      stage: "stage1",
      death_type: "mysterious_disappearance",
      node_id: "stage1_vestibule",
    });
    expect(forceFlushSpy).toHaveBeenCalledTimes(1);
  });

  it("records mysterious_disappearance with the active room stage and node_id after player moves", () => {
    render(<Index />);
    const input = screen.getByLabelText("Command input");

    // Progress to stage1_vestibule_searched
    fireEvent.change(input, { target: { value: "look around" } });
    fireEvent.keyDown(input, { key: "Enter" });

    const button = screen.getByRole("button", { name: "Start Over" });
    fireEvent.click(button);

    expect(recordDeathSpy).toHaveBeenCalledWith(1, {
      stage: "stage1",
      death_type: "mysterious_disappearance",
      node_id: "stage1_vestibule_searched",
    });
  });

  it("resets terminal output history, turn counter, input, and returns focus to terminal input", () => {
    render(<Index />);
    const input = screen.getByLabelText("Command input");

    // Enter a command
    fireEvent.change(input, { target: { value: "look around" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("turn 002")).toBeInTheDocument();
    expect(screen.getByText("> look around")).toBeInTheDocument();

    const button = screen.getByRole("button", { name: "Start Over" });
    fireEvent.click(button);

    // Turn is reset to 1
    expect(screen.getByText("turn 001")).toBeInTheDocument();
    // Input is cleared
    expect(input).toHaveValue("");
    // Command history in output is cleared
    expect(screen.queryByText("> look around")).not.toBeInTheDocument();
    // Input receives focus automatically
    expect(input).toHaveFocus();
  });

  it("resets state without recording mysterious_disappearance when game is in game_over", () => {
    render(<Index />);
    const input = screen.getByLabelText("Command input");

    fireEvent.change(input, { target: { value: "look around" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "look in the pack" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "pick up mop" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "hop turnstiles" } });
    fireEvent.keyDown(input, { key: "Enter" });
    // In stage 2 foyer, go deeper triggers death to stage2_death_choice
    fireEvent.change(input, { target: { value: "go deeper" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Clear spy count from monster_attack death
    recordDeathSpy.mockClear();

    // Now give up to reach game_over
    fireEvent.change(input, { target: { value: "give up" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Click Start Over from game_over screen
    const button = screen.getByRole("button", { name: "Start Over" });
    fireEvent.click(button);

    // Should NOT record mysterious_disappearance because game was already over
    expect(recordDeathSpy).not.toHaveBeenCalled();

    // Should be reset to fresh stage 1 vestibule
    expect(screen.getByText("turn 001")).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("resets state without recording mysterious_disappearance when on a death choice screen", () => {
    render(<Index />);
    const input = screen.getByLabelText("Command input");

    // Navigate to stage2_death_choice
    fireEvent.change(input, { target: { value: "look around" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "look in the pack" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "pick up mop" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "hop turnstiles" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "go deeper" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Reset spy after monster_attack
    recordDeathSpy.mockClear();

    // Click Start Over while on stage2_death_choice
    const button = screen.getByRole("button", { name: "Start Over" });
    fireEvent.click(button);

    // Should NOT record mysterious_disappearance because player was on death choice screen
    expect(recordDeathSpy).not.toHaveBeenCalled();

    // Should be reset to fresh stage 1 vestibule
    expect(screen.getByText("turn 001")).toBeInTheDocument();
    expect(input).toHaveFocus();
  });
});
