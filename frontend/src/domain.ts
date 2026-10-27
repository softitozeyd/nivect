import { z } from "zod";
export const categories = [
  "Pass",
  "Missing cap",
  "Misaligned cap",
  "Missing label",
  "Misaligned label",
  "Loose cap",
  "Underfill",
  "Cap defect",
  "Label defect",
  "Fill level defect",
  "Multiple defects",
] as const;
export const reviewSchema = z.object({
  outcome: z.enum(["confirmed", "false-positive", "flagged"]),
  note: z.string().max(500),
  at: z.string().datetime(),
});
export const eventSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  stationId: z.string(),
  lineId: z.string(),
  product: z.string(),
  category: z.enum(categories),
  decision: z.enum(["pass", "reject"]),
  confidence: z.number().min(0).max(1).nullable(),
  modelVersion: z.string(),
  imageUrl: z.string().nullable(),
  imagePath: z.string().nullable().optional(),
  sourceInspectedAt: z.string().optional(),
  timestampOffset: z.string().optional(),
  defects: z.array(z.enum(categories)).optional(),
  checks: z
    .object({
      capOk: z.boolean(),
      labelOk: z.boolean(),
      liquidLevelOk: z.boolean(),
    })
    .optional(),
  review: reviewSchema.optional(),
});
export type InspectionEvent = z.infer<typeof eventSchema>;
export type OperatorReview = z.infer<typeof reviewSchema>;
export type DefectCategory = InspectionEvent["category"];
export type InspectionDecision = InspectionEvent["decision"];
export type MonitoringStatus =
  "active" | "idle" | "warning" | "disconnected" | "error" | "unknown";
export interface ModelMetadata {
  version: string;
  name: string;
}
export interface ProductionLine {
  id: string;
  name: string;
}
export const stationSchema = z.object({
  id: z.string(),
  name: z.string(),
  camera: z.enum([
    "active",
    "idle",
    "warning",
    "disconnected",
    "error",
    "unknown",
  ]),
  inference: z.enum([
    "active",
    "idle",
    "warning",
    "disconnected",
    "error",
    "unknown",
  ]),
  heartbeat: z.string().datetime(),
  fps: z.number().nonnegative(),
  modelVersion: z.string(),
  error: z.string().nullable(),
});
export type Station = z.infer<typeof stationSchema>;
export interface DashboardMetrics {
  total: number;
  defective: number;
  rate: number;
  fps: number;
}
export const snapshotSchema = z.object({
  events: z
    .array(eventSchema)
    .max(500)
    .refine(
      (events) =>
        new Set(events.map((event) => event.id)).size === events.length,
      "Duplicate inspection IDs",
    ),
  stations: z.array(stationSchema),
  updatedAt: z.string().datetime(),
  coverage: z.enum(["session", "failures-only"]).optional(),
  backendHealth: z.enum(["UP", "DOWN", "UNKNOWN"]).optional(),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export interface Filters {
  search: string;
  category: string;
  station: string;
  decision: string;
  from: string;
  to: string;
  sort: "newest" | "oldest";
}
export const emptyFilters: Filters = {
  search: "",
  category: "all",
  station: "all",
  decision: "all",
  from: "",
  to: "",
  sort: "newest",
};
export function metrics(events: InspectionEvent[], fps = 0): DashboardMetrics {
  const total = events.length;
  const defective = events.filter((e) => e.decision === "reject").length;
  return { total, defective, rate: total ? (defective / total) * 100 : 0, fps };
}
export function filterEvents(events: InspectionEvent[], f: Filters) {
  const from = f.from ? Date.parse(`${f.from}T00:00:00+03:00`) : -Infinity;
  const to = f.to ? Date.parse(`${f.to}T23:59:59.999+03:00`) : Infinity;
  if (Number.isNaN(from) || Number.isNaN(to) || from > to) return [];
  return events
    .filter(
      (e) =>
        (!f.search ||
          `${e.id} ${e.product} ${e.lineId} ${e.stationId} ${e.category} ${e.defects?.join(" ") || ""}`
            .toLocaleLowerCase("en")
            .includes(f.search.toLocaleLowerCase("en"))) &&
        (f.category === "all" ||
          e.category === f.category ||
          e.defects?.some((defect) => defect === f.category)) &&
        (f.station === "all" || e.stationId === f.station) &&
        (f.decision === "all" || e.decision === f.decision) &&
        Date.parse(e.timestamp) >= from &&
        Date.parse(e.timestamp) <= to,
    )
    .sort((a, b) =>
      f.sort === "newest"
        ? Date.parse(b.timestamp) - Date.parse(a.timestamp)
        : Date.parse(a.timestamp) - Date.parse(b.timestamp),
    );
}
export function formatDate(value: string, zone = "Europe/Istanbul") {
  const d = new Date(value);
  return Number.isNaN(d.valueOf())
    ? "Unknown"
    : new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        dateStyle: "short",
        timeStyle: "medium",
      }).format(d);
}
export function freshness(
  updatedAt: string,
  connected: boolean,
  now = Date.now(),
): MonitoringStatus {
  return !connected
    ? "disconnected"
    : !Number.isFinite(Date.parse(updatedAt))
      ? "unknown"
      : now - Date.parse(updatedAt) > 15000
        ? "warning"
        : "active";
}
export const statusLabels: Record<MonitoringStatus, string> = {
  active: "Active",
  idle: "Idle",
  warning: "Warning",
  disconnected: "Disconnected",
  error: "Error",
  unknown: "Unknown",
};
export function stationStatus(
  station: Station,
  connected: boolean,
  now = Date.now(),
): MonitoringStatus {
  const fresh = freshness(station.heartbeat, connected, now);
  if (fresh !== "active") return fresh;
  if (station.error) return "error";
  for (const state of [
    "error",
    "disconnected",
    "unknown",
    "warning",
    "idle",
  ] as const) {
    if (station.camera === state || station.inference === state) return state;
  }
  return "active";
}
export interface ActivityBin {
  start: number;
  total: number;
  bad: number;
}
export function activityBins(
  events: InspectionEvent[],
  start: number,
  end: number,
): ActivityBin[] {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return [];
  const bins = Array.from({ length: 12 }, (_, i) => ({
    start: start + ((end - start) * i) / 12,
    total: 0,
    bad: 0,
  }));
  for (const event of events) {
    const at = Date.parse(event.timestamp);
    if (!Number.isFinite(at) || at < start || at > end) continue;
    const index = Math.min(11, Math.floor(((at - start) / (end - start)) * 12));
    bins[index].total++;
    if (event.decision === "reject") bins[index].bad++;
  }
  return bins;
}
