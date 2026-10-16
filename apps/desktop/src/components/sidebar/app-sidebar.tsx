import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Folder, Layers, List, PanelLeft, Plus, Settings } from "lucide-react";

import { useNewProject } from "@/components/new-project-dialog";
import { Button } from "@/components/ui/button";
import { projectsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

import { NavLink } from "./nav-link";
import { SearchField } from "./search-field";
import { SectionLabel } from "./section-label";
import { StatusRow } from "./status-row";
import { useSidebarCollapsed } from "./use-sidebar-collapsed";

/*
 * The collapsed rail is 80px, which is wider than an icon needs.
 *
 * That is not a design choice. `titleBarStyle: "hiddenInset"` leaves the macOS
 * traffic lights drawn over the top-left of the window, and they span roughly
 * 72px. A narrower rail would let them overhang onto the content pane, so they
 * would sit half on one background and half on the other.
 */
const collapsedWidth = "w-20";
const expandedWidth = "w-58";

export function AppSidebar() {
  // The same query the projects grid reads. Neither view owns the data, so
  // creating a project updates both without either telling the other.
  const projects = useQuery(projectsQuery);
  const openNewProject = useNewProject();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? collapsedWidth : expandedWidth,
      )}
    >
      {/* Reserves room for the macOS traffic lights and drags the window. */}
      <div className="titlebar-drag h-11 shrink-0" />

      <div className={cn("flex items-center gap-2.5 pb-3", collapsed ? "justify-center" : "px-4")}>
        {collapsed ? null : (
          <>
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            >
              <Layers className="size-4" />
            </span>
            <span className="flex-1 font-heading text-base font-semibold">Michigo</span>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft />
        </Button>
      </div>

      <SearchField collapsed={collapsed} onExpand={toggleCollapsed} />

      <nav className="mt-4 flex flex-col gap-0.5 px-2.5" aria-label="Main">
        <NavLink to="/" icon={<Folder />} label="Projects" collapsed={collapsed} />
        <NavLink to="/lists" icon={<List />} label="Lists" collapsed={collapsed} />
        <NavLink to="/queue" icon={<Layers />} label="Card queue" count={5} collapsed={collapsed} />
        <NavLink to="/settings" icon={<Settings />} label="Settings" collapsed={collapsed} />
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <SectionLabel
          collapsed={collapsed}
          action={
            <Button
              variant="ghost"
              size="icon"
              aria-label="New project"
              title="New project"
              onClick={openNewProject}
            >
              <Plus />
            </Button>
          }
        >
          Projects
        </SectionLabel>

        <ul className="flex flex-col gap-0.5 overflow-y-auto px-2.5">
          {projects.data?.map((project) => (
            <li key={project.id}>
              <Link
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                title={collapsed ? project.name : undefined}
                className={cn(
                  "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm",
                  collapsed && "justify-center",
                )}
                activeProps={{
                  className: "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                }}
                inactiveProps={{ className: "text-muted-foreground hover:bg-sidebar-accent/50" }}
              >
                {collapsed ? (
                  // A project has no icon of its own, so its initial stands in
                  // for one rather than the rail simply dropping the list.
                  <span
                    aria-hidden="true"
                    className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[0.625rem] font-medium"
                  >
                    {project.name.slice(0, 1).toUpperCase()}
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-current opacity-40"
                  />
                )}
                <span className={cn("truncate", collapsed && "sr-only")}>{project.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-sidebar-border py-2">
        <StatusRow label="AnkiConnect · connected" collapsed={collapsed} />
        <StatusRow label="9 dictionaries loaded" collapsed={collapsed} />
      </div>
    </aside>
  );
}
