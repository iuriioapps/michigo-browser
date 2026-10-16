import { describe, expect, it } from "vitest";

import { CreateProjectInputSchema } from "./schemas";

/**
 * These schemas are the IPC validation boundary. They are pure, so the cheapest
 * honest place to prove they reject bad renderer input is right here, rather
 * than by standing up an Electron process.
 */
describe("CreateProjectInputSchema", () => {
  it("trims surrounding whitespace", () => {
    expect(CreateProjectInputSchema.parse({ name: "  Frieren  " })).toEqual({ name: "Frieren" });
  });

  it("rejects a name that is empty or only whitespace", () => {
    expect(CreateProjectInputSchema.safeParse({ name: "" }).success).toBe(false);
    expect(CreateProjectInputSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects an over-long name", () => {
    expect(CreateProjectInputSchema.safeParse({ name: "a".repeat(201) }).success).toBe(false);
  });

  it("rejects anything that is not an object with a string name", () => {
    expect(CreateProjectInputSchema.safeParse({ name: 42 }).success).toBe(false);
    expect(CreateProjectInputSchema.safeParse(null).success).toBe(false);
  });
});
