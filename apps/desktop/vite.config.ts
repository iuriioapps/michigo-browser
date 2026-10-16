import { URL, fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron/simple";

export default defineConfig({
  // Production loads from file://, so asset paths must be relative.
  base: "./",
  plugins: [
    // Must precede react(): it rewrites the route files before the JSX
    // transform sees them.
    tanstackRouter({
      target: "react",
      // Off deliberately. Code splitting emits dynamic import()s, and Chromium
      // treats file:// as an opaque origin, so they fail in the packaged app.
      // A desktop bundle has no network latency to hide anyway.
      autoCodeSplitting: false,
      // Without this a co-located `settings.test.tsx` would be generated into
      // the tree as the route `/settings/test`.
      routeFileIgnorePattern: "\\.test\\.tsx?$",
    }),
    react(),
    tailwindcss(),
    electron({
      main: { entry: "electron/main.ts" },
      preload: {
        input: "electron/preload.ts",
        vite: {
          build: {
            // Sandboxed preload scripts must be CommonJS.
            rolldownOptions: {
              output: { format: "cjs", entryFileNames: "preload.cjs" },
            },
          },
        },
      },
    }),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
