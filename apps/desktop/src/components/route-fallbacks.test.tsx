import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderRoute } from "../test/render";

describe("route fallbacks", () => {
  it("shows the not-found page inside the app shell for an unknown path", async () => {
    renderRoute("/no-such-page");

    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to projects" })).toHaveAttribute("href", "/");
  });
});
