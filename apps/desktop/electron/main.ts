import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  BrowserWindow,
  Menu,
  type MenuItemConstructorOptions,
  app,
  session,
  shell,
} from "electron";

import { registerIpc } from "./ipc";

// import.meta.dirname is unavailable once bundled; derive it from the URL.
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

// Production loads over file://, hence `base: "./"` in vite.config.ts.
const rendererUrl =
  process.env["VITE_DEV_SERVER_URL"] ??
  pathToFileURL(path.join(moduleDir, "../dist/index.html")).href;

// Only https links leave the app, and they go to the system browser.
function openExternally(url: string): void {
  if (URL.parse(url)?.protocol === "https:") {
    void shell.openExternal(url);
  }
}

// Replaces Electron's default menu, which ships Reload and DevTools in the
// packaged app. The Edit menu stays: without it, copy and paste stop working
// on macOS.
function buildMenu(): Menu {
  const devItems: MenuItemConstructorOptions[] = app.isPackaged
    ? []
    : [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
      ];

  return Menu.buildFromTemplate([
    process.platform === "darwin" ? { role: "appMenu" } : { role: "fileMenu" },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        ...devItems,
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
  ]);
}

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
      devTools: !app.isPackaged,
    },
  });

  // The app is a single page with hash routing, so it never navigates for
  // real. A link in user content must not replace the app or open a window.
  window.webContents.on("will-navigate", (event, url) => {
    event.preventDefault();
    openExternally(url);
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternally(url);

    return { action: "deny" };
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  void window.loadURL(rendererUrl);
}

void app.whenReady().then(() => {
  // Electron grants every permission by default. Deny them all (camera,
  // notifications, geolocation, ...) until a feature needs a specific one.
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler(() => false);
  Menu.setApplicationMenu(buildMenu());
  registerIpc(rendererUrl);
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
