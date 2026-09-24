import { contextBridge, ipcRenderer } from "electron";

import { channels, type DesktopApi } from "../shared/api";

/**
 * The waiter between the renderer and main.
 *
 * Only these named functions are exposed — never `ipcRenderer` itself, which
 * would let any code in the page send any message on any channel. Typing the
 * object as `DesktopApi` means a missing or misshapen entry fails to compile.
 */
const api: DesktopApi = {
  app: {
    info: () => ipcRenderer.invoke(channels.appInfo),
  },
};

contextBridge.exposeInMainWorld("michigo", api);
