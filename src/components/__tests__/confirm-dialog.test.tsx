import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "../confirm-dialog";

function setup() {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Delete 3 cases?"
      description="This cannot be undone."
      confirmLabel="Delete"
      destructive
      onConfirm={onConfirm}
    />,
  );
  return { onConfirm, onOpenChange };
}

describe("ConfirmDialog", () => {
  it("is announced as an alert dialog with its title and description", () => {
    setup();
    const dialog = screen.getByRole("alertdialog", { name: "Delete 3 cases?" });
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
  });

  it("focuses the safe choice (Cancel) first", () => {
    setup();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("closes on Escape without confirming", async () => {
    const { onConfirm, onOpenChange } = setup();
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms only on an explicit click of the destructive action", async () => {
    const { onConfirm } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
