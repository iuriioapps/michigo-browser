import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RuntimeInfo } from "@michigo/core/schemas";

import { createApiStub, renderRoute, runtimeInfo } from "../test/render";

describe("settings route", () => {
  it("renders runtime details fetched from the main process", async () => {
    renderRoute("/settings");

    expect(await screen.findByText("Michigo 0.1.0")).toBeInTheDocument();
    expect(screen.getByText("24.21.0")).toBeInTheDocument();
    expect(screen.getByText("darwin-x64")).toBeInTheDocument();
    expect(screen.getByText("44.4.5")).toBeInTheDocument();
  });

  it("lists every module the main process reported", async () => {
    renderRoute("/settings");

    expect(await screen.findByText("@michigo/vocab")).toBeInTheDocument();
    expect(screen.getByText("@michigo/anki")).toBeInTheDocument();
    expect(screen.getAllByText("scaffold")).toHaveLength(2);
  });

  it("surfaces an IPC failure instead of rendering stale chrome", async () => {
    renderRoute(
      "/settings",
      createApiStub({
        app: {
          info: vi
            .fn<() => Promise<RuntimeInfo>>()
            .mockRejectedValue(new Error("main process unavailable")),
        },
      }),
    );

    expect(await screen.findByText("main process unavailable")).toBeInTheDocument();
  });

  it("omits the electron row when not running inside Electron", async () => {
    const { electron: _electron, ...withoutElectron } = runtimeInfo;

    renderRoute(
      "/settings",
      createApiStub({ app: { info: () => Promise.resolve(withoutElectron) } }),
    );

    expect(await screen.findByText("Michigo 0.1.0")).toBeInTheDocument();
    expect(screen.queryByText("electron")).not.toBeInTheDocument();
  });
});
