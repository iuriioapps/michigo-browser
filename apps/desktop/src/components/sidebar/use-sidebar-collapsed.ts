import { useCallback, useState } from "react";

const storageKey = "michigo:sidebar-collapsed";

/*
 * A view preference, so it lives in the renderer's own storage rather than
 * going through IPC. Both accessors are guarded: storage can be unavailable or
 * throw, and a sidebar that fails to remember its width is not worth a crash.
 */
function read(): boolean {
  try {
    return localStorage.getItem(storageKey) === "true";
  } catch {
    return false;
  }
}

function write(collapsed: boolean): void {
  try {
    localStorage.setItem(storageKey, String(collapsed));
  } catch {
    // Preference simply will not survive the session.
  }
}

export function useSidebarCollapsed(): readonly [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(read);

  const toggle = useCallback(() => {
    setCollapsed((previous) => {
      write(!previous);

      return !previous;
    });
  }, []);

  return [collapsed, toggle];
}
