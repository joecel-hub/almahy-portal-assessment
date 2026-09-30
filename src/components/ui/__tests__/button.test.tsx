import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../button";

describe("Button", () => {
  it("is keyboard-activatable", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders its child element when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/cases">Cases</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Cases" })).toHaveAttribute("href", "/cases");
  });
});
