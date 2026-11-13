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
});
