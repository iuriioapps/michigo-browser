import process from "node:process";

import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { describeRuntime } from "./runtime";
import { RuntimeInfoSchema, type ModuleInfo } from "./schemas";

const modules: ModuleInfo[] = [{ name: "@michigo/example", version: "1.2.3", status: "scaffold" }];

describe("describeRuntime", () => {
  it("reports the running process and the modules it was given", () => {
    const info = describeRuntime({ app: "test", version: "0.1.0", modules });

    expect(info.node).toBe(process.versions.node);
    expect(info.platform).toBe(`${process.platform}-${process.arch}`);
    expect(info.modules).toEqual(modules);
    expect(RuntimeInfoSchema.safeParse(info).success).toBe(true);
  });

  it("omits the electron version outside Electron", () => {
    expect(describeRuntime({ app: "test", version: "0.1.0", modules }).electron).toBeUndefined();
  });

  it("carries the electron version through when the host supplies one", () => {
    const info = describeRuntime({
      app: "test",
      version: "0.1.0",
      modules,
      electron: "44.4.5",
    });

    expect(info.electron).toBe("44.4.5");
  });

  it("rejects a module that does not satisfy the schema", () => {
    expect(() =>
      describeRuntime({
        app: "test",
        version: "0.1.0",
        modules: [{ name: "", version: "1.0.0", status: "scaffold" }],
      }),
    ).toThrow(ZodError);
  });
});
