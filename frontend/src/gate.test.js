import { test } from "node:test";
import assert from "node:assert/strict";
import { BottleGate } from "./gate.js";
const bottle = {
  bottleFound: true,
  bottleCount: 1,
  defects: [],
  confidence: 0.9,
  modelVersion: "test",
};
test("one event per bottle, re-arm after empty zone", () => {
  const g = new BottleGate(3, 2);
  let n = 0;
  for (let i = 0; i < 30; i++) if (g.observe(bottle)) n++;
  assert.equal(n, 1);
  g.observe({ bottleFound: false });
  g.observe(bottle);
  assert.equal(g.observe(bottle), null);
  g.observe({ bottleFound: false });
  g.observe({ bottleFound: false });
  for (let i = 0; i < 3; i++) if (g.observe(bottle)) n++;
  assert.equal(n, 2);
});
test("ambiguous scenes never pass and defects persist", () => {
  const g = new BottleGate(2, 2);
  for (let i = 0; i < 10; i++)
    assert.equal(g.observe({ ...bottle, bottleCount: 2 }), null);
  assert.equal(g.observe(bottle), null);
  g.observe({ bottleFound: false });
  g.observe({ bottleFound: false });
  g.observe({ ...bottle, defects: ["missing_cap"] });
  assert.deepEqual(g.observe(bottle).defects, ["missing_cap"]);
});
