import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "./segmented-control";

const options = [
  { value: "group", label: "By group" },
  { value: "easiest", label: "Easiest first" },
] as const;

describe("SegmentedControl", () => {
  it("marks only the selected option as checked", () => {
    render(
      <SegmentedControl
        label="Sort"
        value="group"
        options={options}
        onChange={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByRole("radio", { name: "By group" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Easiest first" })).not.toBeChecked();
  });

  it("reports the chosen value", () => {
    const onChange = vi.fn<(value: "group" | "easiest") => void>();

    render(<SegmentedControl label="Sort" value="group" options={options} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Easiest first" }));

    expect(onChange).toHaveBeenCalledWith("easiest");
  });
});
