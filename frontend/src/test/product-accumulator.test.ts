import { describe, expect, it } from "vitest";
import { ProductAccumulator } from "../services/product-accumulator";
const empty = {decision: "REVIEW" as const, defects: [], detections: []};
const seen = (decision: "PASS" | "REVIEW" | "FAIL", defects: string[] = []) => ({decision, defects, detections: [{name:"bottle"}]});
function finish(a: ProductAccumulator) { a.observe(empty); a.observe(empty); return a.observe(empty); }
describe("local product tracking", () => {
  it("counts one pass only after the bottle leaves", () => { const a = new ProductAccumulator(); for(let i=0;i<6;i++) expect(a.observe(seen("PASS"))).toBeNull(); expect(finish(a)).toEqual({decision:"PASS",defects:[]}); expect(finish(a)).toBeNull(); });
  it("preserves uncertain and prioritizes any defect", () => {const a = new ProductAccumulator(); a.observe(seen("PASS")); a.observe(seen("REVIEW")); a.observe(seen("PASS")); expect(finish(a)?.decision).toBe("REVIEW"); a.observe(seen("FAIL",["underfill"])); a.observe(seen("PASS")); a.observe(seen("REVIEW")); expect(finish(a)).toEqual({decision:"FAIL",defects:["underfill"]});});
  it("does not count absent, too-short, or multiple bottle observations", () => {const a = new ProductAccumulator(); expect(finish(a)).toBeNull(); a.observe(seen("PASS")); expect(finish(a)).toBeNull(); for(let i=0;i<3;i++) a.observe({decision:"REVIEW",defects:[],detections:[{name:"bottle"},{name:"bottle"}]}); expect(finish(a)).toBeNull();});
});
