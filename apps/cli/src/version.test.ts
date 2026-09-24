import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { VERSION } from "./version";

const PackageSchema = z.object({ version: z.string() });

describe("VERSION", () => {
  // The bundled CLI cannot read package.json at runtime, so the constant is
  // hand-written. This keeps it honest.
  it("matches the version in package.json", () => {
    const pkg = PackageSchema.parse(
      JSON.parse(readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8")),
    );

    expect(VERSION).toBe(pkg.version);
  });
});
