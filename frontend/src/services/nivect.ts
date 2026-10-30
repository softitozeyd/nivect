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
  row: NivectFailure,
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
    category: defects.length > 1 ? "Multiple defects" : defects[0],
    defects,
    checks: {
      capOk: row.capOk,
      labelOk: row.labelOk,
      liquidLevelOk: row.liquidLevelOk,
    },
    decision: "reject",
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
    const [failures, health] = await Promise.allSettled([
      this.request(FAILURE_PATH, {}, signal),
      this.request(HEALTH_PATH, {}, signal),
    ]);
    if (signal?.aborted) throw signal.reason;
    if (failures.status === "rejected") throw failures.reason;
    const parsed = failuresSchema.safeParse(failures.value);
    if (!parsed.success)
      throw new Error(
        "Nivect failure records do not match the expected data contract.",
      );
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
      events: parsed.data
        .map((row) => toInspectionEvent(row, this.offset))
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
      stations: [],
      updatedAt: new Date().toISOString(),
      coverage: "failures-only",
      backendHealth,
    };
  }
  async review(_id: string, _review: OperatorReview): Promise<void> {
    void _id;
    void _review;
    throw new Error("The Nivect backend provides no API for operator reviews.");
  }
}
