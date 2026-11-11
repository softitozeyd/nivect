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
  private streaks = new Map<string, number>();
  observe(result: ObservedPrediction): CompletedProduct | null {
    const bottles = result.detections.filter(d => d.name === "bottle").length;
    if (bottles) {
      this.missing = 0;
      this.samples++;
      if (bottles !== 1) this.ambiguous = true;
      if (result.decision === "REVIEW") this.uncertain = true;
      const observed = result.decision === "FAIL" ? result.defects : [];
      if (observed.length) this.uncertain = true;
      for (const name of this.streaks.keys()) if (!observed.includes(name)) this.streaks.delete(name);
      for (const name of observed) {
        const streak = (this.streaks.get(name) || 0) + 1;
        this.streaks.set(name, streak);
        if (streak >= 3) this.defects.add(name);
      }
      return null;
    }
    this.streaks.clear();
    if (!this.samples || ++this.missing < 3) return null;
    // Incomplete or multi-bottle observations cannot be counted as one physical item.
    const complete = !this.ambiguous && this.samples >= 3;
    const completed: CompletedProduct = this.defects.size ? {decision: "FAIL", defects: [...this.defects].sort()} : this.uncertain ? {decision: "REVIEW", defects: []} : {decision: "PASS", defects: []};
    this.reset();
    return complete ? completed : null;
  }
  reset() { this.missing = 0; this.samples = 0; this.uncertain = false; this.ambiguous = false; this.defects.clear(); this.streaks.clear(); }
}
