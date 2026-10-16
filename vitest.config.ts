import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Each workspace supplies its own config where it needs one (the desktop
    // app needs a DOM environment); the rest run with Vitest defaults.
    projects: ["packages/*", "apps/*"],
    // Reported, not enforced: thresholds wait until there is real domain code.
    coverage: {
      provider: "v8",
      include: [
        "packages/*/src/**",
        "apps/*/src/**",
        "apps/desktop/electron/**",
        "apps/desktop/shared/**",
      ],
      exclude: ["**/*.test.{ts,tsx}", "**/routeTree.gen.ts", "**/test/**"],
    },
  },
});
