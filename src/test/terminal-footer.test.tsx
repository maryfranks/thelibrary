import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Route } from "@/routes/index";

describe("Terminal footer controls", () => {
  it("renders the Count the lost external link beside Start Over with matching terminal styling", () => {
    const Page = Route.options.component;
    if (!Page) {
      throw new Error("Expected Index route component to be defined");
    }

    render(<Page />);

    const startOverButton = screen.getByRole("button", { name: "Start Over" });
    const countTheLostLink = screen.getByRole("link", { name: "Count the lost ↗" });

    expect(startOverButton).toBeInTheDocument();
    expect(countTheLostLink).toBeInTheDocument();
    expect(startOverButton.parentElement).toBe(countTheLostLink.parentElement);

    expect(countTheLostLink).toHaveAttribute(
      "href",
      "https://stats.littlefuzzydinos.com/d/thelibrary/death-toll?orgId=1&refresh=10s",
    );
    expect(countTheLostLink).toHaveAttribute("target", "_blank");
    expect(countTheLostLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not interrupt active game state when Count the lost is clicked", () => {
    const Page = Route.options.component;
    if (!Page) {
      throw new Error("Expected Index route component to be defined");
    }

    render(<Page />);

    const input = screen.getByLabelText("Command input");
    fireEvent.change(input, { target: { value: "look around" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("turn 002")).toBeInTheDocument();

    const countTheLostLink = screen.getByRole("link", { name: "Count the lost ↗" });
    fireEvent.click(countTheLostLink);

    expect(screen.getByText("turn 002")).toBeInTheDocument();
    expect(screen.getByText("> look around")).toBeInTheDocument();
  });

  it("renders a persistent ambient actions footer inside the terminal frame outside the scroll buffer", () => {
    const Page = Route.options.component;
    if (!Page) {
      throw new Error("Expected Index route component to be defined");
    }

    render(<Page />);

    const footer = screen.getByLabelText("Ambient actions");
    const lookAroundLabel = screen.getByText("[look around]");
    const input = screen.getByLabelText("Command input");

    expect(footer).toBeInTheDocument();
    expect(footer).toContainElement(lookAroundLabel);
    expect(screen.queryByText("[look in the pack]")).not.toBeInTheDocument();
    expect(footer.className).toContain("border-t");

    // Verify footer is a sibling after the scrollable narrative container, not inside it.
    const scrollContainer = input.closest("div.overflow-y-auto");
    expect(scrollContainer).not.toBeNull();
    expect(scrollContainer).not.toContainElement(footer);
    expect(scrollContainer?.nextElementSibling).toBe(footer);
  });

  it("hides [look in the pack] until stage1_pack_checked and keeps it visible across later stages and resets on Start Over", () => {
    const Page = Route.options.component;
    if (!Page) {
      throw new Error("Expected Index route component to be defined");
    }

    render(<Page />);

    const input = screen.getByLabelText("Command input");
    expect(screen.queryByText("[look in the pack]")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "look around" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("turn 002")).toBeInTheDocument();
    expect(screen.getByText("[look around]")).toBeInTheDocument();
    expect(screen.queryByText("[look in the pack]")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "look in the pack" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("turn 003")).toBeInTheDocument();
    expect(screen.getByText("Inventory: snack, novel, pen")).toBeInTheDocument();
    expect(screen.getByText("[look around]")).toBeInTheDocument();
    expect(screen.getByText("[look in the pack]")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "hop turnstiles" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "proceed anyway" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("[look around]")).toBeInTheDocument();
    expect(screen.getByText("[look in the pack]")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start Over" }));
    expect(screen.getByText("[look around]")).toBeInTheDocument();
    expect(screen.queryByText("[look in the pack]")).not.toBeInTheDocument();
  });
});
