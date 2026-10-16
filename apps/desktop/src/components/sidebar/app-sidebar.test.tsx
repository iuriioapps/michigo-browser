import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { createApiStub, renderRoute } from "@/test/render";

describe("AppSidebar", () => {
  // The collapsed state is persisted, so one test's toggle would otherwise
  // decide how the next test's sidebar renders.
  beforeEach(() => {
    localStorage.clear();
  });

  it("navigates to another route when a nav item is clicked", async () => {
    renderRoute("/");

    expect(await screen.findByRole("heading", { name: "Projects", level: 1 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Settings" }));

    expect(await screen.findByRole("heading", { name: "Settings", level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Projects", level: 1 })).not.toBeInTheDocument();
  });

  it("marks the matched route as the active nav item", async () => {
    renderRoute("/queue");

    expect(await screen.findByRole("link", { name: /Card queue/ })).toHaveAttribute(
      "data-status",
      "active",
    );
  });

  it("opens the new project dialog from the + beside the project list", async () => {
    renderRoute("/");

    const sidebar = await screen.findByRole("complementary");
    fireEvent.click(within(sidebar).getByRole("button", { name: "New project" }));

    expect(await screen.findByLabelText("Name")).toBeInTheDocument();
  });

  it("opens that dialog from a route that has no new project button of its own", async () => {
    // The dialog lives in the shell, not in the projects route, so the "+"
    // has to work from anywhere the sidebar is visible.
    renderRoute("/settings");

    const sidebar = await screen.findByRole("complementary");
    fireEvent.click(within(sidebar).getByRole("button", { name: "New project" }));

    expect(await screen.findByLabelText("Name")).toBeInTheDocument();
  });

  it("creates the project from the sidebar dialog", async () => {
    renderRoute("/settings");

    const sidebar = await screen.findByRole("complementary");
    fireEvent.click(within(sidebar).getByRole("button", { name: "New project" }));

    fireEvent.change(await screen.findByLabelText("Name"), { target: { value: "Frieren" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(await within(sidebar).findByText("Frieren")).toBeInTheDocument();
  });

  it("collapses to an icon rail and expands again", async () => {
    renderRoute("/");
    const sidebar = await screen.findByRole("complementary");

    fireEvent.click(within(sidebar).getByRole("button", { name: "Collapse sidebar" }));

    // The search field has no room in the rail, so it becomes an icon button.
    expect(within(sidebar).queryByRole("searchbox")).not.toBeInTheDocument();
    expect(within(sidebar).getByRole("button", { name: "Search" })).toBeInTheDocument();

    fireEvent.click(within(sidebar).getByRole("button", { name: "Expand sidebar" }));

    expect(within(sidebar).getByRole("searchbox")).toBeInTheDocument();
  });

  it("keeps every nav item reachable by name while collapsed", async () => {
    renderRoute("/");
    const sidebar = await screen.findByRole("complementary");

    fireEvent.click(within(sidebar).getByRole("button", { name: "Collapse sidebar" }));

    // The labels are hidden visually, not removed, so navigation still works
    // and assistive technology still announces each destination.
    for (const name of ["Projects", "Lists", "Card queue", "Settings"]) {
      expect(within(sidebar).getByRole("link", { name })).toBeInTheDocument();
    }

    fireEvent.click(within(sidebar).getByRole("link", { name: "Settings" }));

    expect(await screen.findByRole("heading", { name: "Settings", level: 1 })).toBeInTheDocument();
  });

  it("still lists projects when collapsed", async () => {
    renderRoute("/", createApiStub({}, ["Frieren"]));
    const sidebar = await screen.findByRole("complementary");

    expect(await within(sidebar).findByRole("link", { name: "Frieren" })).toBeInTheDocument();

    fireEvent.click(within(sidebar).getByRole("button", { name: "Collapse sidebar" }));

    expect(within(sidebar).getByRole("link", { name: "Frieren" })).toBeInTheDocument();
  });

  it("remembers that it was collapsed", async () => {
    const first = renderRoute("/");
    fireEvent.click(
      within(await screen.findByRole("complementary")).getByRole("button", {
        name: "Collapse sidebar",
      }),
    );
    first.unmount();

    renderRoute("/");

    expect(
      within(await screen.findByRole("complementary")).getByRole("button", {
        name: "Expand sidebar",
      }),
    ).toBeInTheDocument();
  });
});
