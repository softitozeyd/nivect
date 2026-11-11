import { ApiAdapter, petProduct } from "./nivect";
export { ApiAdapter } from "./nivect";
import {
  type Snapshot,
  type OperatorReview,
  type InspectionEvent,
} from "../domain";
export interface InspectionAdapter {
  load(signal?: AbortSignal): Promise<Snapshot>;
  review(id: string, review: OperatorReview): Promise<void>;
}
export const mode = import.meta.env.VITE_DATA_MODE === "api" ? "api" : "demo";
export function seedEvents(now = Date.now()): InspectionEvent[] {
  return Array.from({ length: 240 }, (_, i) => {
    const fault = i % 13 === 0 || i % 29 === 0;
    const category = fault
      ? (["Missing cap", "Underfill", "Loose cap", "Underfill"] as const)[i % 4]
      : "Pass";
    return {
      id: `VQC-${String(10240 - i).padStart(6, "0")}`,
      timestamp: new Date(
        now - i * 35000 - Math.floor(i / 40) * 180000,
      ).toISOString(),
      lineId: "line-1",
      stationId: i % 2 ? "CAM-02" : "CAM-01",
      product: petProduct,
      category,
      decision: fault ? "reject" : "pass",
      confidence: 0.94 + (i % 59) / 1000,
      modelVersion: "ron88-demo-v1",
      imageUrl: null,
    };
  });
}
export class DemoAdapter implements InspectionAdapter {
  private snapshot: Snapshot;
  private sequence = 10240;
  constructor(now = Date.now()) {
    this.snapshot = {
      events: seedEvents(now),
      updatedAt: new Date(now).toISOString(),
      stations: ["CAM-01", "CAM-02"].map((id, i) => ({
        id,
        name: i ? "Fill level check" : "Cap check",
        camera: "active",
        inference: "active",
        heartbeat: new Date(now).toISOString(),
        fps: i ? 29 : 30,
        modelVersion: "ron88-demo-v1",
        error: null,
      })),
    };
  }
  async load() {
    const now = new Date().toISOString();
    this.snapshot.updatedAt = now;
    this.snapshot.stations.forEach((s) => (s.heartbeat = now));
    return structuredClone(this.snapshot);
  }
  tick() {
    this.sequence++;
    const event = seedEvents()[0];
    const fault = this.sequence % 11 === 0;
    const next: InspectionEvent = {
      ...event,
      id: `VQC-${String(this.sequence).padStart(6, "0")}`,
      timestamp: new Date().toISOString(),
      stationId: this.sequence % 2 ? "CAM-01" : "CAM-02",
      category: fault
        ? this.sequence % 2
          ? "Missing cap"
          : "Underfill"
        : "Pass",
      decision: fault ? "reject" : "pass",
    };
    this.snapshot.events = [next, ...this.snapshot.events].slice(0, 500);
  }
  async review(id: string, review: OperatorReview) {
    const event = this.snapshot.events.find((e) => e.id === id);
    if (!event) throw new Error("This record is no longer available.");
    event.review = review;
  }
}
export const adapter: InspectionAdapter =
  mode === "demo" ? new DemoAdapter() : new ApiAdapter();
