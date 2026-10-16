import { PROJECT_NAME_MAX_LENGTH } from "@michigo/core/schemas";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateProject } from "@/lib/queries";

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

function NewProjectDialog({ open, onClose }: NewProjectDialogProps) {
  const [name, setName] = useState("");
  const createProject = useCreateProject();

  // Every exit funnels through here, so reopening always starts clean — a
  // stale name or a stale error from the last attempt would both be confusing.
  function close() {
    setName("");
    createProject.reset();
    onClose();
  }

  const trimmed = name.trim();

  return (
    <Dialog open={open} onClose={close} title="New project">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          createProject.mutate({ name: trimmed }, { onSuccess: close });
        }}
      >
        <DialogBody>
          <label htmlFor="project-name" className="text-muted-foreground">
            Name
          </label>
          <Input
            id="project-name"
            maxLength={PROJECT_NAME_MAX_LENGTH}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
          {/* A name main rejects surfaces here rather than closing the dialog. */}
          {createProject.isError ? (
            <p className="text-destructive">{createProject.error.message}</p>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={trimmed === "" || createProject.isPending}>
            OK
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

const NewProjectContext = createContext<(() => void) | null>(null);

/**
 * Owns the one New project dialog for the whole app.
 *
 * It lives in the shell rather than in a route because two things open it from
 * different places in the tree — the page header on `/` and the `+` beside the
 * sidebar's project list — and because the sidebar is rendered on every route,
 * so the `+` has to work from anywhere, not only from the projects grid.
 */
export function NewProjectProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openDialog = useCallback(() => {
    setOpen(true);
  }, []);
  const closeDialog = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <NewProjectContext.Provider value={openDialog}>
      {children}
      <NewProjectDialog open={open} onClose={closeDialog} />
    </NewProjectContext.Provider>
  );
}

/** Returns the function that opens the New project dialog. */
export function useNewProject(): () => void {
  const openDialog = useContext(NewProjectContext);

  if (openDialog === null) {
    throw new Error("useNewProject must be used inside NewProjectProvider");
  }

  return openDialog;
}
