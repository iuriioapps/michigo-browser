import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Each workspace supplies its own config where it needs one (the desktop
    // app needs a DOM environment); the rest run with Vitest defaults.
    projects: ["packages/*", "apps/*"],
  },
});
