import { test } from "node:test";
import assert from "node:assert/strict";
import { BottleGate } from "./gate.js";
const bottle={bottleFound:true,bottleCount:1,defects:[],confidence:0.9,modelVersion:"test"};
const empty={bottleFound:false};
test("count once only when a bottle leaves",()=>{const g=new BottleGate(3,2);for(let i=0;i<6;i++)assert.equal(g.observe(bottle),null);assert.equal(g.observe(empty),null);assert.equal(g.observe(empty).uncertain,false);assert.equal(g.observe(empty),null)});
test("one fleeting defect is uncertain and three consecutive confirm it",()=>{let g=new BottleGate(3,2);g.observe({...bottle,defects:["missing_cap"]});g.observe(bottle);g.observe(bottle);g.observe(empty);assert.deepEqual(g.observe(empty).defects,[]);g=new BottleGate(3,2);for(let i=0;i<3;i++)g.observe({...bottle,defects:["underfill"]});g.observe(empty);assert.deepEqual(g.observe(empty).defects,["underfill"])});
test("multiple or short observations are not counted",()=>{const g=new BottleGate(3,2);g.observe({...bottle,bottleCount:2});g.observe(bottle);g.observe(empty);assert.equal(g.observe(empty),null);g.observe(bottle);g.observe(empty);assert.equal(g.observe(empty),null)});
test("recovers after overlapping bottles leave",()=>{const g=new BottleGate(3,2);g.observe({...bottle,bottleCount:2});g.observe(empty);assert.equal(g.observe(empty),null);for(let i=0;i<3;i++)g.observe(bottle);g.observe(empty);assert.equal(g.observe(empty).uncertain,false)});
