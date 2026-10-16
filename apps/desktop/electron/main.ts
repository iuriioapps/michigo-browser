import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { BrowserWindow, app } from "electron";

import { registerIpc } from "./ipc";

// import.meta.dirname is unavailable once bundled; derive it from the URL.
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1100,
    height: 750,
    // Avoids a flash of empty chrome before the renderer paints.
    show: false,
    // The design puts the traffic lights inside the sidebar, so macOS loses its
    // title bar and the sidebar supplies its own drag strip. Other platforms
    // keep their normal frame until there is a design for them.
    ...(process.platform === "darwin" ? { titleBarStyle: "hiddenInset" as const } : {}),
    webPreferences: {
      preload: path.join(moduleDir, "preload.cjs"),
      // Electron's security baseline: the renderer is a locked-down browser
      // tab with no Node access. Everything it needs goes through preload.
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  const devServerUrl = process.env["VITE_DEV_SERVER_URL"];

  if (devServerUrl === undefined) {
    // Production loads over file://, hence `base: "./"` in vite.config.ts.
    void window.loadFile(path.join(moduleDir, "../dist/index.html"));
  } else {
    void window.loadURL(devServerUrl);
  }
}

void app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on("activate", () => {
    // macOS keeps the app running with no windows; recreate on dock click.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
