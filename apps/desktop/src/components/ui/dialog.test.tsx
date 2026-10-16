import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";
import { Dialog, DialogFooter } from "./dialog";

function Fixture({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="New project">
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
      </DialogFooter>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("renders nothing while closed", () => {
    render(<Fixture open={false} onClose={vi.fn<() => void>()} />);

    expect(screen.queryByText("New project")).not.toBeInTheDocument();
  });

  it("shows its content once open", () => {
    render(<Fixture open onClose={vi.fn<() => void>()} />);

    expect(screen.getByText("New project")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
  });

  it("reports a close request from a control inside it", () => {
    const onClose = vi.fn<() => void>();

    render(<Fixture open onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
  });
});
