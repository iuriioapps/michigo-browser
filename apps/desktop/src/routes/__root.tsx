import { Outlet, createRootRoute } from "@tanstack/react-router";

import { NewProjectProvider } from "@/components/new-project-dialog";
import { AppSidebar } from "@/components/sidebar/app-sidebar";

export const Route = createRootRoute({ component: AppShell });

/**
 * The two-pane shell every route renders inside: a fixed sidebar beside a
 * scrolling content pane.
 *
 * Both panes open with a drag strip of the same height. Together they span the
 * full window width, which is the only reason the window can be moved by its
 * top edge — `titleBarStyle: "hiddenInset"` removes the title bar macOS would
 * otherwise provide, and nothing is draggable unless we say so.
 *
 * The strip sits outside the scroll container so it cannot scroll away, and
 * holds nothing interactive: a drag region swallows clicks on anything inside
 * it that is not marked `titlebar-no-drag`.
 */
function AppShell() {
  return (
    <NewProjectProvider>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          {/* -ml-px closes the one-pixel dead column over the sidebar's right
              border, so the two strips form one continuous band. */}
          <div className="titlebar-drag -ml-px h-11 shrink-0" />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </NewProjectProvider>
  );
}
