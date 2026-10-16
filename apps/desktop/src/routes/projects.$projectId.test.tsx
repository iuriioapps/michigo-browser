import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createApiStub, renderRoute } from "../test/render";

describe("project detail route", () => {
  it("opens when a project card is clicked", async () => {
    renderRoute("/", createApiStub({}, ["Frieren"]));

    // Scoped to the content pane: the sidebar carries a link of the same name.
    const grid = await screen.findByRole("main");
    fireEvent.click(await within(grid).findByRole("link", { name: /Frieren/ }));

    expect(await screen.findByRole("heading", { name: "Frieren", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("opens when the sidebar entry is clicked", async () => {
    renderRoute("/", createApiStub({}, ["Solo Leveling"]));

    const sidebar = await screen.findByRole("complementary");
    fireEvent.click(await within(sidebar).findByRole("link", { name: /Solo Leveling/ }));

    expect(
      await screen.findByRole("heading", { name: "Solo Leveling", level: 1 }),
    ).toBeInTheDocument();
  });

  it("marks the open project as active in the sidebar", async () => {
    renderRoute("/projects/project-0", createApiStub({}, ["Frieren"]));

    const sidebar = await screen.findByRole("complementary");

    expect(await within(sidebar).findByRole("link", { name: /Frieren/ })).toHaveAttribute(
      "data-status",
      "active",
    );
  });

  it("returns to the grid from the detail page", async () => {
    renderRoute("/projects/project-0", createApiStub({}, ["Frieren"]));

    fireEvent.click(await screen.findByRole("link", { name: /All projects/ }));

    expect(await screen.findByRole("heading", { name: "Projects", level: 1 })).toBeInTheDocument();
  });

  it("says so when the id matches nothing", async () => {
    renderRoute("/projects/does-not-exist", createApiStub({}, ["Frieren"]));

    expect(
      await screen.findByRole("heading", { name: "Project not found", level: 1 }),
    ).toBeInTheDocument();
  });
});
