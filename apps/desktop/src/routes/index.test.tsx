import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderRoute } from "../test/render";

async function openDialog() {
  renderRoute("/");

  expect(
    await screen.findByText("No projects yet. Create one to get started."),
  ).toBeInTheDocument();

  // Scoped to the content pane: the sidebar's "+" carries the same name,
  // because it opens the same dialog.
  const header = screen.getByRole("main");
  fireEvent.click(within(header).getByRole("button", { name: /New project/ }));

  return screen.getByLabelText("Name");
}

describe("projects route", () => {
  it("creates a project and shows it in both the grid and the sidebar", async () => {
    const input = await openDialog();

    fireEvent.change(input, { target: { value: "Frieren" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    // Two copies: one project card, one sidebar entry. Both read the same
    // query, so this is what proves the invalidation is wired.
    await waitFor(() => {
      expect(screen.getAllByText("Frieren")).toHaveLength(2);
    });
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("refuses to submit a blank name", async () => {
    const input = await openDialog();

    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();

    fireEvent.change(input, { target: { value: "   " } });

    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
  });

  it("adds nothing when cancelled", async () => {
    const input = await openDialog();

    fireEvent.change(input, { target: { value: "Solo Leveling" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("Solo Leveling")).not.toBeInTheDocument();
    expect(screen.getByText("No projects yet. Create one to get started.")).toBeInTheDocument();
  });
});
