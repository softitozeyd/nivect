import { z } from "zod";
import type {
  Snapshot,
  InspectionEvent,
  DefectCategory,
  OperatorReview,
} from "../domain";
import type { InspectionAdapter } from "./adapter";

// Confirmed against softitozeyd/nivect @ 31c9ce15d179b1f6664b5e4b61de45da4ebd5f00.
export const FAILURE_PATH = "/api/v1/inspections/failures";
export const HISTORY_PATH = "/api/v1/inspections";
export const MODEL_DETECTIONS_PATH = "/api/v1/model-detections";
export const REVIEWS_PATH = "/api/v1/reviews";
export const SUMMARY_PATH = "/api/v1/summary";
export const HEALTH_PATH = "/actuator/health";
export const petProduct = "Ron 88 · PET water bottle";
export const backendOffset =
  import.meta.env.VITE_BACKEND_UTC_OFFSET || "Z";
const localTimestamp = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?$/,
  )
  .refine(
    (value) => z.iso.date().safeParse(value.slice(0, 10)).success,
    "Invalid local date",
  );
export const failureSchema = z
  .object({
    id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    lineCode: z.string().trim().min(1).max(50),
    capOk: z.boolean(),
    labelOk: z.boolean(),
    liquidLevelOk: z.boolean(),
    overallResult: z.literal("FAIL"),
    imagePath: z.string().nullish(),
    inspectedAt: localTimestamp,
  })
  .refine(
    (row) => !row.capOk || !row.labelOk || !row.liquidLevelOk,
    "A FAIL record must include at least one failed check",
  );
export const failuresSchema = z
  .array(failureSchema)
  .max(20)
  .refine(
    (rows) => new Set(rows.map((row) => row.id)).size === rows.length,
    "Duplicate inspection ID",
  );
export type NivectFailure = z.infer<typeof failureSchema>;
export const inspectionSchema = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  lineCode: z.string().trim().min(1).max(50),
  capOk: z.boolean(), labelOk: z.boolean(), liquidLevelOk: z.boolean(),
  overallResult: z.enum(["PASS", "FAIL"]), imagePath: z.string().nullish(),
  inspectedAt: localTimestamp,
}).refine(row => (row.capOk && row.labelOk && row.liquidLevelOk) === (row.overallResult === "PASS"), "Inconsistent inspection result");
export const historySchema = z.array(inspectionSchema).max(100)
  .refine(rows => new Set(rows.map(row => row.id)).size === rows.length, "Duplicate inspection ID");
export type NivectInspection = z.infer<typeof inspectionSchema>;
const modelDetectionSchema = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  defects: z.string().min(1).refine(value => value.split(",").every(name => ["underfill", "missing_cap", "loose_cap", "uncertain"].includes(name))),
  recordedAt: z.string().datetime({offset: true}),
  sessionId: z.number().int().positive().nullish(), productNumber: z.number().int().positive().nullish(),
  modelDecision: z.enum(["FAIL", "REVIEW"]).nullish(),
});
export const modelDetectionsSchema = z.array(modelDetectionSchema).max(100)
  .refine(rows => new Set(rows.map(row => row.id)).size === rows.length, "Duplicate detection ID");
export function toModelEvent(row: z.infer<typeof modelDetectionSchema>): InspectionEvent {
  const names: Record<string, DefectCategory> = { underfill: "Underfill", missing_cap: "Missing cap", loose_cap: "Loose cap", uncertain: "Uncertain" };
  const defects = row.defects.split(",").map(name => names[name]);
  return {
    id: `MD-${row.id}`, timestamp: row.recordedAt, sessionId: row.sessionId ?? undefined, productNumber: row.productNumber ?? undefined, lineId: "Local camera", stationId: "Local camera",
    product: "PET bottle", category: defects.length > 1 ? "Multiple defects" : defects[0], defects,
    decision: "reject", confidence: null, modelVersion: "Unavailable", imageUrl: null, imagePath: null,
  };
}
const reviewsSchema = z.array(z.object({
  recordId: z.string().regex(/^(?:NIV|MD)-[1-9][0-9]*$/),
  outcome: z.enum(["confirmed", "false-positive", "flagged"]),
  note: z.string().max(500), updatedAt: z.string().datetime({offset: true}),
})).max(500);
function addReviews(events: InspectionEvent[], value: unknown): InspectionEvent[] {
  const result = reviewsSchema.safeParse(value);
  if (!result.success) throw new Error("Operator reviews do not match the expected data contract.");
  const reviews = new Map(result.data.map(r => [r.recordId, {outcome: r.outcome, note: r.note, at: r.updatedAt}]));
  return events.map(event => ({...event, review: reviews.get(event.id)}));
}
function mergeEvents(...groups: InspectionEvent[][]): InspectionEvent[] {
  return groups.flat().sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 100);
}


export function normalizeInspectedAt(
  value: string,
  offset = backendOffset,
): string {
  localTimestamp.parse(value);
  if (
    !/^(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(offset) ||
    /^[+-]14:(?!00)/.test(offset)
  )
    throw new Error("Invalid backend UTC offset. Example: +03:00 or Z.");
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  const milliseconds = withSeconds.replace(/\.(\d{3})\d+$/, ".$1");
  return new Date(`${milliseconds}${offset}`).toISOString();
}
export function toInspectionEvent(
  row: NivectInspection,
  offset = backendOffset,
): InspectionEvent {
  const defects: DefectCategory[] = [];
  if (!row.capOk) defects.push("Cap defect");
  if (!row.labelOk) defects.push("Label defect");
  if (!row.liquidLevelOk) defects.push("Fill level defect");
  return {
    id: `NIV-${row.id}`,
    timestamp: normalizeInspectedAt(row.inspectedAt, offset),
    sourceInspectedAt: row.inspectedAt,
    timestampOffset: offset,
    lineId: row.lineCode,
    stationId: "Unavailable",
    product: petProduct,
    category: defects.length > 1 ? "Multiple defects" : defects[0] || "Pass",
    defects,
    checks: {
      capOk: row.capOk,
      labelOk: row.labelOk,
      liquidLevelOk: row.liquidLevelOk,
    },
    decision: row.overallResult === "PASS" ? "pass" : "reject",
    confidence: null,
    modelVersion: "Unavailable",
    imageUrl: null,
    imagePath: row.imagePath ?? null,
  };
}
class HttpError extends Error {
  constructor(readonly status: number) {
    super(`API ${status}`);
  }
}
export class ApiAdapter implements InspectionAdapter {
  constructor(
    private baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(
      /\/$/,
      "",
    ),
    private offset = backendOffset,
  ) {}
  async request(
    path: string,
    init: RequestInit = {},
    signal?: AbortSignal,
  ): Promise<unknown> {
    const isRead = !init.method || init.method === "GET";
    for (let attempt = 0; attempt < (isRead ? 2 : 1); attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...init,
          headers: { Accept: "application/json", ...init.headers },
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
            : AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new HttpError(response.status);
        return response.status === 204 ? null : await response.json();
      } catch (error) {
        if (
          signal?.aborted ||
          !isRead ||
          attempt === 1 ||
          (error instanceof HttpError &&
            error.status < 500 &&
            error.status !== 429)
        )
          throw error;
      }
    }
    throw new Error("The API request could not be completed.");
  }
  async load(signal?: AbortSignal): Promise<Snapshot> {
    const [failures, health, modelDetections, reviews, summary] = await Promise.allSettled([
      this.request(FAILURE_PATH, {}, signal),
      this.request(HEALTH_PATH, {}, signal),
      this.request(MODEL_DETECTIONS_PATH, {}, signal),
      this.request(REVIEWS_PATH, {}, signal),
      this.request(SUMMARY_PATH, {}, signal),
    ]);
    if (signal?.aborted) throw signal.reason;
    if (failures.status === "rejected") throw failures.reason;
    const parsed = failuresSchema.safeParse(failures.value);
    if (!parsed.success)
      throw new Error(
        "Nivect failure records do not match the expected data contract.",
      );
    if (modelDetections.status === "rejected") throw modelDetections.reason;
    if (reviews.status === "rejected") throw reviews.reason;
    const modelParsed = modelDetectionsSchema.safeParse(modelDetections.value);
    if (!modelParsed.success) throw new Error("Model detections do not match the expected data contract.");
    if (summary.status === "rejected") throw summary.reason;
    const summaryParsed = z.object({ legacyFailureRecords: z.number().int().nonnegative(), cameraDetectionRecords: z.number().int().nonnegative() }).safeParse(summary.value);
    if (!summaryParsed.success) throw new Error("Summary does not match the expected data contract.");
    const healthResult =
      health.status === "fulfilled"
        ? z.object({ status: z.string() }).safeParse(health.value)
        : null;
    const backendHealth = healthResult?.success
      ? healthResult.data.status === "UP"
        ? "UP"
        : ["DOWN", "OUT_OF_SERVICE"].includes(healthResult.data.status)
          ? "DOWN"
          : "UNKNOWN"
      : health.status === "rejected" &&
          health.reason instanceof HttpError &&
          health.reason.status === 503
        ? "DOWN"
        : "UNKNOWN";
    return {
      events: addReviews(mergeEvents(parsed.data.map((row) => toInspectionEvent(row, this.offset)), modelParsed.data.map(toModelEvent)), reviews.value),
      stations: [],
      updatedAt: new Date().toISOString(),
      coverage: "failures-only",
      backendHealth,
      summary: summaryParsed.data,
    };
  }
  async history(signal?: AbortSignal): Promise<InspectionEvent[]> {
    const [history, detections, reviews] = await Promise.all([this.request(HISTORY_PATH, {}, signal), this.request(MODEL_DETECTIONS_PATH, {}, signal), this.request(REVIEWS_PATH, {}, signal)]);
    const parsed = historySchema.safeParse(history);
    if (!parsed.success) throw new Error("Inspection history does not match the expected data contract.");
    const modelParsed = modelDetectionsSchema.safeParse(detections);
    if (!modelParsed.success) throw new Error("Model detections do not match the expected data contract.");
    return addReviews(mergeEvents(parsed.data.map(row => toInspectionEvent(row, this.offset)), modelParsed.data.map(toModelEvent)), reviews);
  }
  async review(id: string, review: OperatorReview): Promise<void> {
    if (!/^(?:NIV|MD)-[1-9][0-9]*$/.test(id)) throw new Error("Invalid inspection ID");
    await this.request(`${REVIEWS_PATH}/${id}`, {method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify({outcome: review.outcome, note: review.note})});
  }
}
