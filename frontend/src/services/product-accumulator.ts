export type Decision = "PASS" | "FAIL" | "REVIEW";
export type ObservedPrediction = { decision: Decision; defects: string[]; detections: {name: string}[] };
export type CompletedProduct = {decision: Decision; defects: string[]};

// Local-camera approximation only. A sensor or tracker is required for real production.
export class ProductAccumulator {
  private missing = 0;
  private samples = 0;
  private uncertain = false;
  private ambiguous = false;
  private defects = new Set<string>();
  observe(result: ObservedPrediction): CompletedProduct | null {
    const bottles = result.detections.filter(d => d.name === "bottle").length;
    if (bottles) {
      this.missing = 0;
      this.samples++;
      if (bottles !== 1) this.ambiguous = true;
      if (result.decision === "REVIEW") this.uncertain = true;
      if (result.decision === "FAIL") result.defects.forEach(d => this.defects.add(d));
      return null;
    }
    if (!this.samples || ++this.missing < 3) return null;
    // Incomplete or multi-bottle observations cannot be counted as one physical item.
    const complete = !this.ambiguous && this.samples >= 3;
    const completed: CompletedProduct = this.defects.size ? {decision: "FAIL", defects: [...this.defects].sort()} : this.uncertain ? {decision: "REVIEW", defects: []} : {decision: "PASS", defects: []};
    this.reset();
    return complete ? completed : null;
  }
  reset() { this.missing = 0; this.samples = 0; this.uncertain = false; this.ambiguous = false; this.defects.clear(); }
}
