import { stationStatus } from "../domain";
import { describe, it, expect, vi } from "vitest";
import {
  metrics,
  formatDate,
  freshness,
  filterEvents,
  emptyFilters,
  snapshotSchema,
} from "../domain";
import { DemoAdapter, seedEvents, ApiAdapter } from "../services/adapter";
describe("inspection domain", () => {
  it("calculates consistent totals, including empty data", () => {
    expect(metrics([])).toEqual({ total: 0, defective: 0, rate: 0, fps: 0 });
    const events = seedEvents(1000000000000);
    const m = metrics(events);
    expect(m.rate).toBe((m.defective / m.total) * 100);
    expect(m.total).toBe(240);
  });
  it("uses deterministic seeds with valid contracts", () => {
    expect(seedEvents(1000000000000)).toEqual(seedEvents(1000000000000));
    expect(seedEvents(1000000000000)[0].decision).toBe("reject");
  });
  it("filters by station, category, search and decision", () => {
    const events = seedEvents();
    const rows = filterEvents(events, {
      ...emptyFilters,
      station: "CAM-01",
      decision: "reject",
      category: "Missing cap",
      search: "VQC",
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.every(
        (e) =>
          e.stationId === "CAM-01" &&
          e.category === "Missing cap" &&
          e.decision === "reject",
      ),
    ).toBe(true);
    expect(
      filterEvents(events, { ...emptyFilters, search: "does not exist" }),
    ).toHaveLength(0);
  });
  it("applies date ranges in Istanbul and ordering", () => {
    const e = seedEvents(Date.parse("2026-10-25T09:00:00Z"));
    expect(
      filterEvents(e, { ...emptyFilters, from: "2026-10-26" }),
    ).toHaveLength(0);
    const rows = filterEvents(e, { ...emptyFilters, sort: "oldest" });
    expect(Date.parse(rows[0].timestamp)).toBeLessThan(
      Date.parse(rows[1].timestamp),
    );
  });
  it("never describes stale, missing or disconnected data as healthy", () => {
    expect(freshness("invalid", true)).toBe("unknown");
    expect(freshness(new Date(0).toISOString(), true, 20000)).toBe("warning");
    expect(freshness(new Date().toISOString(), false)).toBe("disconnected");
    expect(formatDate("bad")).toBe("Unknown");
    expect(formatDate("2026-10-25T09:00:00Z")).toContain("12:00:00");
  });
  it("validates uncertain external payloads", () => {
    expect(
      snapshotSchema.safeParse({ events: [], stations: [], updatedAt: "bad" })
        .success,
    ).toBe(false);
  });
  it("caps stream growth and preserves review separately from AI", async () => {
    const adapter = new DemoAdapter();
    for (let i = 0; i < 600; i++) adapter.tick();
    const data = await adapter.load();
    expect(data.events).toHaveLength(500);
    expect(new Set(data.events.map((e) => e.id)).size).toBe(500);
    const event = data.events[0];
    await adapter.review(event.id, {
      outcome: "false-positive",
      note: "test",
      at: new Date().toISOString(),
    });
    const updated = (await adapter.load()).events[0];
    expect(updated.decision).toBe(event.decision);
    expect(updated.review?.outcome).toBe("false-positive");
    expect(snapshotSchema.safeParse(await adapter.load()).success).toBe(true);
  });
  it("retries reads, surfaces API errors and blocks unsupported review mutations", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const api = new ApiAdapter();
    await expect(api.request("/api/v1/inspections/failures")).rejects.toThrow(
      "offline",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockClear();
    await expect(
      api.review("id", {
        outcome: "flagged",
        note: "",
        at: new Date().toISOString(),
      }),
    ).rejects.toThrow("operator reviews");
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

it("does not label unknown or stale station inference as active", async () => {
  const s = (await new DemoAdapter().load()).stations[0];
  expect(stationStatus({ ...s, inference: "unknown" }, true)).toBe("unknown");
  expect(stationStatus({ ...s, heartbeat: "2000-01-01T00:00:00Z" }, true)).toBe(
    "warning",
  );
  expect(stationStatus(s, false)).toBe("disconnected");
});
it("rejects duplicate external event identities", async () => {
  const data = await new DemoAdapter().load();
  expect(
    snapshotSchema.safeParse({
      ...data,
      events: [data.events[0], data.events[0]],
    }).success,
  ).toBe(false);
});
import { activityBins } from "../domain";
it("finds individual defects inside a multi-defect inspection", () => {
  const event = {
    ...seedEvents()[0],
    category: "Multiple defects" as const,
    defects: ["Cap defect", "Label defect"] as const,
  };
  const record = { ...event, defects: [...event.defects] };
  expect(
    filterEvents([record], { ...emptyFilters, category: "Cap defect" }),
  ).toEqual([record]);
  expect(
    filterEvents([record], { ...emptyFilters, category: "Label defect" }),
  ).toEqual([record]);
  expect(
    filterEvents([record], { ...emptyFilters, category: "Fill level defect" }),
  ).toEqual([]);
  expect(
    filterEvents([record], { ...emptyFilters, search: "CAP DEFECT" }),
  ).toEqual([record]);
});
it("counts a selected report period completely, including boundaries", () => {
  const event = seedEvents()[0];
  const start = Date.parse("2026-10-01T00:00:00Z");
  const end = Date.parse("2026-10-25T00:00:00Z");
  const events = [
    { ...event, timestamp: new Date(start).toISOString() },
    { ...event, id: "end", timestamp: new Date(end).toISOString() },
    { ...event, id: "outside", timestamp: new Date(end + 1).toISOString() },
  ];
  const bins = activityBins(events, start, end);
  expect(bins).toHaveLength(12);
  expect(bins.reduce((n, b) => n + b.total, 0)).toBe(2);
  expect(bins.reduce((n, b) => n + b.bad, 0)).toBe(2);
  expect(activityBins(events, NaN, end)).toEqual([]);
});
import { inspectionCsv } from "../utils/csv";
it("exports notes safely and preserves quotes, decimals and zero confidence", () => {
  const csv = inspectionCsv([
    {
      ...seedEvents()[0],
      confidence: 0,
      review: {
        outcome: "flagged",
        at: new Date().toISOString(),
        note: '\t=1+1, "test"',
      },
    },
  ]);
  expect(csv).toContain('"0"');
  expect(csv).toContain('"\'\t=1+1, ""test"""');
});
it("neutralizes spreadsheet formulas in untrusted API metadata and operator notes", () => {
  for (const value of [
    "=1+1",
    "+1+1",
    "-1+1",
    "@SUM(1)",
    "   =1+1",
    "\r=1+1",
  ]) {
    const csv = inspectionCsv([
      {
        ...seedEvents()[0],
        lineId: value,
        imagePath: value,
        review: {
          outcome: "flagged",
          at: new Date().toISOString(),
          note: value,
        },
      },
    ]);
    expect(csv.split(`"'${value}"`)).toHaveLength(4);
  }
});
