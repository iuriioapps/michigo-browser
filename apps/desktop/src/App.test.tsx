import type { RuntimeInfo } from "@michigo/core/schemas";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

const runtimeInfo: RuntimeInfo = {
  app: "Michigo",
  version: "0.1.0",
  node: "24.21.0",
  platform: "darwin-x64",
  electron: "44.4.5",
  modules: [
    { name: "@michigo/vocab", version: "0.1.0", status: "scaffold" },
    { name: "@michigo/anki", version: "0.1.0", status: "scaffold" },
  ],
};

/**
 * The preload design pays off here: the renderer only ever talks to
 * `window.michigo`, so the whole UI is testable by faking that object. No
 * Electron process is started.
 */
function stubApi(info: () => Promise<RuntimeInfo>): void {
  window.michigo = { app: { info } };
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  stubApi(vi.fn().mockResolvedValue(runtimeInfo));
});

describe("App", () => {
  it("renders runtime details fetched from the main process", async () => {
    renderApp();

    expect(await screen.findByText("Michigo 0.1.0")).toBeInTheDocument();
    expect(screen.getByText("24.21.0")).toBeInTheDocument();
    expect(screen.getByText("darwin-x64")).toBeInTheDocument();
    expect(screen.getByText("44.4.5")).toBeInTheDocument();
  });

  it("lists every module the main process reported", async () => {
    renderApp();

    expect(await screen.findByText("@michigo/vocab")).toBeInTheDocument();
    expect(screen.getByText("@michigo/anki")).toBeInTheDocument();
    expect(screen.getAllByText("scaffold")).toHaveLength(2);
  });

  it("surfaces an IPC failure instead of rendering stale chrome", async () => {
    stubApi(vi.fn().mockRejectedValue(new Error("main process unavailable")));

    renderApp();

    expect(await screen.findByText("main process unavailable")).toBeInTheDocument();
  });

  it("omits the electron row when not running inside Electron", async () => {
    const { electron: _electron, ...withoutElectron } = runtimeInfo;
    stubApi(vi.fn().mockResolvedValue(withoutElectron));

    renderApp();

    expect(await screen.findByText("Michigo 0.1.0")).toBeInTheDocument();
    expect(screen.queryByText("electron")).not.toBeInTheDocument();
  });
});
