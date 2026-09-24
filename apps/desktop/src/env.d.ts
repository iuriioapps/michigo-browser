/// <reference types="vite/client" />
import type { DesktopApi } from "../shared/api";

declare global {
  interface Window {
    /** Injected by the preload script via contextBridge. */
    michigo: DesktopApi;
  }
}
