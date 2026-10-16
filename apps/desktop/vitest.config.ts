import { URL, fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineProject } from "vitest/config";

// Deliberately separate from vite.config.ts: importing that would pull in
// vite-plugin-electron and try to launch Electron during the test run.
export default defineProject({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
