import type { RuntimeInfo } from "@michigo/core/schemas";
import { describe, expect, it } from "vitest";

import { formatRuntimeInfo } from "./format";

const base: RuntimeInfo = {
  app: "michigo",
  version: "0.1.0",
  node: "24.19.0",
  platform: "darwin-x64",
  modules: [
    { name: "@michigo/vocab", version: "0.1.0", status: "scaffold" },
    { name: "@michigo/anki", version: "0.1.0", status: "scaffold" },
  ],
};

describe("formatRuntimeInfo", () => {
  it("lists every module with its version and status", () => {
    const output = formatRuntimeInfo(base);

    expect(output).toContain("michigo 0.1.0");
    expect(output).toContain("modules (2)");
    expect(output).toContain("@michigo/vocab");
    expect(output).toContain("@michigo/anki");
    expect(output).toContain("scaffold");
  });

  it("omits the electron row outside Electron", () => {
    expect(formatRuntimeInfo(base)).not.toContain("electron");
  });

  it("includes the electron row when running inside Electron", () => {
    expect(formatRuntimeInfo({ ...base, electron: "44.4.5" })).toContain("electron  44.4.5");
  });
});
