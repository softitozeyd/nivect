import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  ApiAdapter,
  failuresSchema,
  modelDetectionsSchema,
  toModelEvent,
  historySchema,
  toInspectionEvent,
  normalizeInspectedAt,
} from "../services/nivect";
import type { NivectFailure } from "../services/nivect";
const sample: NivectFailure = {
  id: 12,
  lineCode: "line-2",
  capOk: false,
  labelOk: true,
  liquidLevelOk: true,
  overallResult: "FAIL",
  imagePath: "snapshots/capture.jpg",
  inspectedAt: "2026-10-27T12:00:00.123456789",
};
afterEach(() => vi.unstubAllGlobals());
beforeEach(() => vi.restoreAllMocks());
it("maps confirmed fields without manufacturing station, confidence or image endpoints", () => {
  const event = toInspectionEvent(sample, "+03:00");
  expect(event).toMatchObject({
    id: "NIV-12",
    lineId: "line-2",
    stationId: "Unavailable",
    category: "Cap defect",
    decision: "reject",
    confidence: null,
    modelVersion: "Unavailable",
    imageUrl: null,
    imagePath: "snapshots/capture.jpg",
    timestamp: "2026-10-27T09:00:00.123Z",
  });
  expect(event.category).not.toBe("Missing cap");
});
it("preserves simultaneous cap, label and liquid findings separately", () => {
  const e = toInspectionEvent({
    ...sample,
    labelOk: false,
    liquidLevelOk: false,
  });
  expect(e.category).toBe("Multiple defects");
  expect(e.defects).toEqual([
    "Cap defect",
    "Label defect",
    "Fill level defect",
  ]);
  expect(e.checks).toEqual({
    capOk: false,
    labelOk: false,
    liquidLevelOk: false,
  });
});
it("normalizes Java LocalDateTime with an explicit server offset", () => {
  expect(normalizeInspectedAt("2026-10-27T12:00:00")).toBe(
    "2026-10-27T12:00:00.000Z",
  );
  expect(normalizeInspectedAt("2026-10-27T12:00", "+03:00")).toBe(
    "2026-10-27T09:00:00.000Z",
  );
  expect(normalizeInspectedAt("2026-10-27T12:00:00", "Z")).toBe(
    "2026-10-27T12:00:00.000Z",
  );
  expect(() => normalizeInspectedAt("2026-02-30T12:00:00")).toThrow();
  expect(() => normalizeInspectedAt(sample.inspectedAt, "+14:30")).toThrow();
});
it("rejects invalid, duplicate, PASS, inconsistent or unbounded failure payloads", () => {
  expect(failuresSchema.safeParse([{ ...sample, capOk: null }]).success).toBe(
    false,
  );
  expect(
    failuresSchema.safeParse([{ ...sample, overallResult: "PASS" }]).success,
  ).toBe(false);
  expect(failuresSchema.safeParse([{ ...sample, capOk: true }]).success).toBe(
    false,
  );
  expect(failuresSchema.safeParse([sample, sample]).success).toBe(false);
  expect(
    failuresSchema.safeParse(
      Array.from({ length: 21 }, (_, i) => ({ ...sample, id: i + 1 })),
    ).success,
  ).toBe(false);
});
it("loads only confirmed read paths and labels coverage as failures-only", async () => {
  const fetchMock = vi
    .fn()
    .mockImplementation((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(url.endsWith("/health") ? { status: "UP" } : url.endsWith("/summary") ? { legacyFailureRecords: 1, cameraDetectionRecords: 0 } : (url.endsWith("/model-detections") || url.endsWith("/reviews")) ? [] : [sample]),
          { status: 200 },
        ),
      ),
    );
  vi.stubGlobal("fetch", fetchMock);
  const snapshot = await new ApiAdapter("/backend", "+03:00").load();
  expect(snapshot).toMatchObject({
    coverage: "failures-only",
    backendHealth: "UP",
    stations: [],
  });
  expect(snapshot.events).toHaveLength(1);
  expect(fetchMock.mock.calls.map((call) => call[0]).sort()).toEqual([
    "/backend/actuator/health",
    "/backend/api/v1/inspections/failures",
    "/backend/api/v1/model-detections",
    "/backend/api/v1/reviews",
    "/backend/api/v1/summary",
  ]);
});
it("keeps failure records when health is down, without inventing healthy cameras", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          url.endsWith("/health")
            ? new Response('{"status":"DOWN"}', { status: 503 })
            : url.endsWith("/summary") ? new Response('{"legacyFailureRecords":1,"cameraDetectionRecords":0}')
            : new Response(JSON.stringify((url.endsWith("/model-detections") || url.endsWith("/reviews")) ? [] : [sample])),
        ),
      ),
  );
  const snapshot = await new ApiAdapter().load();
  expect(snapshot.backendHealth).toBe("DOWN");
  expect(snapshot.stations).toEqual([]);
  expect(snapshot.events).toHaveLength(1);
});
it("does not retry access errors and does not silently replace invalid JSON with demo data", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response("", { status: 403 }));
  vi.stubGlobal("fetch", fetchMock);
  const api = new ApiAdapter();
  await expect(api.request("/api/v1/inspections/failures")).rejects.toThrow(
    "API 403",
  );
  expect(fetchMock).toHaveBeenCalledOnce();
  fetchMock.mockImplementation((url: string) =>
    Promise.resolve(
      new Response(
        JSON.stringify(
          url.endsWith("/health") ? { status: "UP" } : url.endsWith("/summary") ? { legacyFailureRecords: 1, cameraDetectionRecords: 0 } : { events: [] },
        ),
      ),
    ),
  );
  await expect(api.load()).rejects.toThrow("expected data contract");
});
it("honors cancellation and rejects invalid operator IDs without any write", async () => {
  const fetchMock = vi
    .fn()
    .mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) =>
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          ),
        ),
    );
  vi.stubGlobal("fetch", fetchMock);
  const api = new ApiAdapter();
  const controller = new AbortController();
  const promise = api.load(controller.signal);
  controller.abort();
  await expect(promise).rejects.toBeDefined();
  expect(fetchMock).toHaveBeenCalledTimes(5);
  fetchMock.mockClear();
  await expect(
    api.review("invalid", {
      outcome: "confirmed",
      note: "",
      at: new Date().toISOString(),
    }),
  ).rejects.toThrow("Invalid inspection ID");
  expect(fetchMock).not.toHaveBeenCalled();
});

it("history accepts both results, rejects inconsistent rows and maps passes", async () => {
  const pass = { ...sample, id: 13, capOk: true, overallResult: "PASS" as const };
  expect(historySchema.safeParse([sample, pass]).success).toBe(true);
  expect(historySchema.safeParse([{...pass, capOk: false}]).success).toBe(false);
  expect(toInspectionEvent(pass)).toMatchObject({decision: "pass", category: "Pass", defects: []});
  vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => Promise.resolve(new Response(JSON.stringify((url.endsWith("/model-detections") || url.endsWith("/reviews")) ? [] : [sample, pass])))));
  expect((await new ApiAdapter().history()).map(row => row.decision)).toEqual(["reject", "pass"]);
});

it("includes camera detections in overview and history without fabricating checks", async () => {
  const detection = { id: 2, defects: "missing_cap,underfill", recordedAt: "2026-10-27T12:00:01Z" };
  expect(modelDetectionsSchema.safeParse([detection]).success).toBe(true);
  expect(modelDetectionsSchema.safeParse([{...detection, defects: "label_damage"}]).success).toBe(false);
  const event = toModelEvent(detection);
  expect(event).toMatchObject({id: "MD-2", category: "Multiple defects", defects: ["Missing cap", "Underfill"], decision: "reject", confidence: null});
  expect(event.checks).toBeUndefined();
  vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => Promise.resolve(new Response(JSON.stringify(url.endsWith("/health") ? {status: "UP"} : url.endsWith("/summary") ? {legacyFailureRecords:1,cameraDetectionRecords:1} : url.endsWith("/model-detections") ? [detection] : url.endsWith("/reviews") ? [] : [sample])))));
  const api = new ApiAdapter();
  expect((await api.load()).events.map(e => e.id)).toContain("MD-2");
  expect((await api.history()).map(e => e.id)).toContain("MD-2");
});

it("loads saved reviews and writes review updates through the API", async () => {
  const row = {id: 9, defects: "underfill", recordedAt: "2026-10-27T12:00:01Z"};
  const persisted = {recordId: "MD-9", outcome: "confirmed", note: "checked", updatedAt: "2026-10-27T12:01:00Z"};
  const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit = {}) => {
    if (init.method === "PUT") return Promise.resolve(new Response(JSON.stringify(persisted)));
    const value = url.endsWith("/health") ? {status:"UP"} : url.endsWith("/summary") ? {legacyFailureRecords:0,cameraDetectionRecords:1} : url.endsWith("/reviews") ? [persisted] : url.endsWith("/model-detections") ? [row] : [];
    return Promise.resolve(new Response(JSON.stringify(value)));
  });
  vi.stubGlobal("fetch", fetchMock);
  const api = new ApiAdapter();
  expect((await api.load()).events[0].review).toEqual({outcome:"confirmed",note:"checked",at:persisted.updatedAt});
  await api.review("MD-9", {outcome:"flagged",note:"check",at:new Date().toISOString()});
  expect(fetchMock).toHaveBeenCalledWith("/api/v1/reviews/MD-9", expect.objectContaining({method:"PUT",body:JSON.stringify({outcome:"flagged",note:"check"})}));
});
