import { act, render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { Provider, useApp } from "../store";
import type { Snapshot } from "../domain";
const mock = vi.hoisted(() => ({ load: vi.fn(), review: vi.fn() }));
vi.mock("../services/adapter", () => ({
  adapter: mock,
  mode: "demo",
  DemoAdapter: class {
    tick() {}
  },
}));
function Probe() {
  const app = useApp();
  return (
    <>
      <output>{app.snapshot?.updatedAt || "waiting"}</output>
      <button onClick={() => void app.refresh()}>retry</button>
    </>
  );
}
function data(updatedAt: string): Snapshot {
  return { events: [], stations: [], updatedAt };
}
beforeEach(() => {
  vi.useFakeTimers();
  mock.load.mockReset();
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});
it("cleans timers and aborts an unfinished request on unmount", async () => {
  mock.load.mockImplementation(() => new Promise(() => {}));
  const view = render(
    <Provider>
      <Probe />
    </Provider>,
  );
  await act(() => vi.advanceTimersByTimeAsync(0));
  const signal: AbortSignal = mock.load.mock.calls[0][0];
  expect(signal.aborted).toBe(false);
  view.unmount();
  expect(signal.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
it("does not overlap scheduled reads while an API response is pending", async () => {
  mock.load.mockImplementation(() => new Promise(() => {}));
  const view = render(
    <Provider>
      <Probe />
    </Provider>,
  );
  await act(() => vi.advanceTimersByTimeAsync(20000));
  expect(mock.load).toHaveBeenCalledTimes(1);
  view.unmount();
});
it("ignores an obsolete response when a manual retry supersedes it", async () => {
  let firstResolve: (s: Snapshot) => void = () => {};
  let secondResolve: (s: Snapshot) => void = () => {};
  mock.load
    .mockImplementationOnce(
      () =>
        new Promise<Snapshot>((resolve) => {
          firstResolve = resolve;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise<Snapshot>((resolve) => {
          secondResolve = resolve;
        }),
    );
  const view = render(
    <Provider>
      <Probe />
    </Provider>,
  );
  await act(() => vi.advanceTimersByTimeAsync(0));
  const signal: AbortSignal = mock.load.mock.calls[0][0];
  fireEvent.click(screen.getByRole("button", { name: "retry" }));
  expect(signal.aborted).toBe(true);
  await act(async () => {
    secondResolve(data("2026-10-25T12:00:01Z"));
  });
  await act(async () => {
    firstResolve(data("2026-10-25T12:00:00Z"));
  });
  expect(screen.getByRole("status")).toHaveTextContent("2026-10-25T12:00:01Z");
  view.unmount();
});
it("does not cancel a slow manual retry when the next scheduled poll arrives", async () => {
  let finishManual: (value: Snapshot) => void = () => {};
  mock.load
    .mockImplementationOnce(
      (signal: AbortSignal) =>
        new Promise((_, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise<Snapshot>((resolve) => {
          finishManual = resolve;
        }),
    )
    .mockResolvedValue(data("2026-10-27T12:00:01Z"));
  const view = render(
    <Provider>
      <Probe />
    </Provider>,
  );
  await act(() => vi.advanceTimersByTimeAsync(0));
  fireEvent.click(screen.getByRole("button", { name: "retry" }));
  const manualSignal: AbortSignal = mock.load.mock.calls[1][0];
  await act(() => vi.advanceTimersByTimeAsync(6000));
  expect(manualSignal.aborted).toBe(false);
  expect(mock.load).toHaveBeenCalledTimes(2);
  await act(async () => finishManual(data("2026-10-27T12:00:00Z")));
  await act(() => vi.advanceTimersByTimeAsync(3000));
  expect(mock.load).toHaveBeenCalledTimes(3);
  expect(screen.getByRole("status")).toHaveTextContent("2026-10-27T12:00:01Z");
  view.unmount();
});
