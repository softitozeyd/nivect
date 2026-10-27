import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Badge, MetricCard, ErrorState, EmptyState } from "../components/ui";
import { FilterPanel } from "../components/events";
import { emptyFilters } from "../domain";
describe("operator components", () => {
  it("renders metric labels and units", () => {
    render(
      <MetricCard
        label="Inspected"
        value="240"
        unit="units"
        detail="Simulated"
      />,
    );
    expect(screen.getByText("Inspected")).toBeInTheDocument();
    expect(screen.getByText("units")).toBeInTheDocument();
  });
  it("communicates critical state through text", () => {
    render(<Badge tone="danger">Disconnected</Badge>);
    expect(screen.getByText("Disconnected")).toBeVisible();
  });
  it("allows recovery from errors", () => {
    const retry = vi.fn();
    render(<ErrorState message="offline" retry={retry} />);
    fireEvent.click(screen.getByText("Try again"));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toHaveTextContent("may be out of date");
  });
  it("shows useful empty state", () => {
    render(<EmptyState />);
    expect(screen.getByText("No records found")).toBeVisible();
  });
  it("emits accessible filter changes and resets", () => {
    const change = vi.fn();
    render(<FilterPanel value={emptyFilters} onChange={change} />);
    fireEvent.change(screen.getByLabelText("Station"), {
      target: { value: "CAM-02" },
    });
    expect(change).toHaveBeenCalledWith({ ...emptyFilters, station: "CAM-02" });
    fireEvent.click(screen.getByText("Clear"));
    expect(change).toHaveBeenLastCalledWith(emptyFilters);
  });
});
