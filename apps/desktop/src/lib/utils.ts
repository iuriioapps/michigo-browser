/**
 * Joins class names, dropping anything falsy.
 *
 * Deliberately *not* `clsx` + `tailwind-merge`: there is no conflict
 * resolution here, so `cn("px-2", "px-6")` emits both and the stylesheet order
 * decides. The convention that makes that safe is in CLAUDE.md — a variant map
 * never repeats a utility the base string sets, and `className` is for layout
 * only. If that ever stops holding, this is the one function to swap.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
