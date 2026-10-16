import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SearchFieldProps {
  collapsed?: boolean;
  /** Collapsed, the field becomes a button that widens the rail to reveal it. */
  onExpand?: () => void;
}

/**
 * Non-functional for now: there is nothing to search yet. It exists because the
 * sidebar reads wrong without it, and it gives the eventual command palette an
 * obvious place to attach.
 */
export function SearchField({ collapsed = false, onExpand }: SearchFieldProps) {
  if (collapsed) {
    return (
      <div className="flex justify-center">
        <Button variant="ghost" size="icon" aria-label="Search" title="Search" onClick={onExpand}>
          <Search />
        </Button>
      </div>
    );
  }

  return (
    <Input
      type="search"
      placeholder="Search"
      aria-label="Search"
      icon={<Search aria-hidden="true" />}
      hint={<kbd className="font-mono">⌘K</kbd>}
      className="mx-2.5"
    />
  );
}
