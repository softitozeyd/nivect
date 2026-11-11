// One visible bottle; count only once it leaves. Incomplete or overlapping bottles are not counted.
export class BottleGate {
  constructor(stable = 5, empty = 5) { this.stable = stable; this.empty = empty; this.reset(); }
  reset() { this.seen = 0; this.absent = 0; this.blocked = false; this.confirmed = new Set(); this.streaks = new Map(); this.uncertain = false; this.confidence = 1; this.modelVersion = null; }
  observe(o) {
    if (!o.bottleFound) {
      this.streaks.clear();
      if ((!this.seen && !this.blocked) || ++this.absent < this.empty) return null;
      const valid = !this.blocked && this.seen >= this.stable;
      const result = {bottleFound: true, defects:[...this.confirmed].sort(), confidence:this.confidence, modelVersion:this.modelVersion, uncertain: !this.confirmed.size && this.uncertain};
      this.reset(); return valid ? result : null;
    }
    this.absent = 0;
    if (o.bottleCount !== 1) {this.blocked = true; return null;}
    if (this.blocked) return null;
    this.seen++; this.confidence = Math.min(this.confidence, o.confidence); this.modelVersion = o.modelVersion;
    const defects = o.defects || [];
    if (defects.length) this.uncertain = true;
    for (const name of this.streaks.keys()) if (!defects.includes(name)) this.streaks.delete(name);
    for (const name of defects) {const n=(this.streaks.get(name)||0)+1;this.streaks.set(name,n);if(n>=3)this.confirmed.add(name);}
    return null;
  }
}
