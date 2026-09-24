import { URL, fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron/simple";

export default defineConfig({
  // Production loads from file://, so asset paths must be relative.
  base: "./",
  plugins: [
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
