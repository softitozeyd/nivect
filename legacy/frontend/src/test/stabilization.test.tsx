import { beforeEach, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InspectionFrame } from "../components/ui";
import { EventDetail } from "../components/events";
import { seedEvents } from "../services/adapter";
import { emptyFilters, filterEvents } from "../domain";
const app = vi.hoisted(() => ({
  preferences: { zone: "Europe/Istanbul", notifications: true },
  review: vi.fn(),
  mode: "demo",
  offline: false,
  error: "",
}));
vi.mock("../store", () => ({ useApp: () => app }));
beforeEach(() => {
  app.offline = false;
  app.review.mockReset();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
it("does not render an acceptable bottle when no event exists", () => {
  render(<InspectionFrame />);
  expect(screen.getByText("No inspection image")).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
it("shows confidence zero as a value rather than missing data", () => {
  render(<InspectionFrame event={{ ...seedEvents()[0], confidence: 0 }} />);
  expect(screen.getByRole("img")).toHaveTextContent("0.0%");
});
it("recovers the image view when a later event has a different image", () => {
  const event = { ...seedEvents()[0], imageUrl: "/missing.png" };
  const { rerender } = render(<InspectionFrame event={event} />);
  fireEvent.error(screen.getByRole("img"));
  expect(screen.getByText(/Could not load image/)).toBeVisible();
  rerender(
    <InspectionFrame
      event={{ ...event, id: "next", imageUrl: "/valid.png" }}
    />,
  );
  fireEvent.load(screen.getByRole("img", { hidden: true }));
  expect(screen.getByRole("img")).toBeVisible();
  expect(screen.queryByText(/Could not load image/)).not.toBeInTheDocument();
});
it("reopens the saved operator outcome without resetting it", () => {
  const event = {
    ...seedEvents()[0],
    review: {
      outcome: "false-positive" as const,
      note: "Inspection checked",
      at: new Date().toISOString(),
    },
  };
  render(<EventDetail event={event} onClose={() => {}} />);
  expect(screen.getByLabelText("Review outcome")).toHaveValue("false-positive");
});
it("blocks confirmation when connection is lost after opening the form", () => {
  const event = seedEvents()[0];
  const { rerender } = render(<EventDetail event={event} onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Save review" }));
  app.offline = true;
  rerender(<EventDetail event={event} onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Confirm and save" }));
  expect(app.review).not.toHaveBeenCalled();
});
it("includes a timestamp without fractional seconds at the end of a filtered day", () => {
  const event = { ...seedEvents()[0], timestamp: "2026-10-25T20:59:59Z" };
  expect(
    filterEvents([event], { ...emptyFilters, to: "2026-10-25" }),
  ).toHaveLength(1);
});
it("sorts timestamps by actual instant with optional fractional precision", () => {
  const event = seedEvents()[0];
  const earlier = { ...event, id: "early", timestamp: "2026-10-25T12:00:00Z" };
  const later = { ...event, id: "late", timestamp: "2026-10-25T12:00:00.500Z" };
  expect(filterEvents([earlier, later], emptyFilters)[0].id).toBe("late");
});
