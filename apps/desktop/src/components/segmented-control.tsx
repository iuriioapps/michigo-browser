import { useId } from "react";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  label: string;
}

const pill =
  "h-8 cursor-pointer rounded-full px-3 text-sm font-medium transition-colors " +
  "flex items-center has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50";

/**
 * The pill toggle from the page header.
 *
 * Real radio inputs behind visually-hidden labels rather than buttons with
 * `role="radio"`: the platform then supplies arrow-key navigation and the
 * roving focus, and none of that has to be reimplemented.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: SegmentedControlProps<T>) {
  const name = useId();

  return (
    <fieldset aria-label={label} className="flex items-center gap-1.5">
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <label
            key={option.value}
            className={cn(
              pill,
              selected
                ? "bg-accent text-accent-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => {
                onChange(option.value);
              }}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
}
