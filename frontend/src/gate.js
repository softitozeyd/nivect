// One bottle in the inspection zone. Re-arm only after the zone is empty.
export class BottleGate {
  constructor(stable = 5, empty = 5) {
    this.stable = stable;
    this.empty = empty;
    this.reset();
  }
  reset() {
    this.seen = 0;
    this.absent = 0;
    this.sent = false;
    this.blocked = false;
    this.defects = new Set();
    this.confidence = 1;
  }
  observe(o) {
    if (!o.bottleFound) {
      if (++this.absent >= this.empty) this.reset();
      return null;
    }
    this.absent = 0;
    if (o.bottleCount !== 1) {
      this.blocked = true;
      return null;
    }
    if (this.blocked) return null;
    if (this.sent) return null;
    this.seen++;
    for (const d of o.defects) this.defects.add(d);
    this.confidence = Math.min(this.confidence, o.confidence);
    if (this.seen < this.stable) return null;
    this.sent = true;
    return {
      bottleFound: true,
      defects: [...this.defects].sort(),
      confidence: this.confidence,
      modelVersion: o.modelVersion,
    };
  }
}
