import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "node",
  // Matches the @types/node floor (Electron 44 bundles Node 24); still runs on newer.
  target: "node24",
  // platform:"node" would otherwise force .mjs; the package is already
  // "type": "module", so plain .js is unambiguous and matches `bin`.
  fixedExtension: false,
});
