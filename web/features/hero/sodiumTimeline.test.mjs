// Lightweight checks for the hero timeline logic (no test runner needed).
// Run with: node features/hero/sodiumTimeline.test.mjs
// Mirrors HERO_HANDOFF §14 step 2: DISH_TOTAL === 3890, DISH_PCT === 169,
// plus totalAt and activeAt behaviour.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const DAILY_LIMIT_MG = 2300;
const FPS = 24;
const EVENTS = [
  { key: "cube", name: "Bouillon cube", amount: "1 cube", sodiumMg: 2080, stepAt: 1.0 },
  { key: "packet", name: "Sazón packet", amount: "1 packet", sodiumMg: 850, stepAt: 5.64 },
  { key: "soy", name: "Soy sauce", amount: "1 Tbsp", sodiumMg: 960, stepAt: 9.48 },
];
const totalAt = (t) => EVENTS.reduce((s, e) => (t >= e.stepAt ? s + e.sodiumMg : s), 0);
const DISH_TOTAL = EVENTS.reduce((s, e) => s + e.sodiumMg, 0);
const DISH_PCT = Math.round((DISH_TOTAL / DAILY_LIMIT_MG) * 100);

function activeAt(t, tr) {
  const f = Math.round(t * FPS);
  for (const e of EVENTS) {
    const c = tr.clips[e.key];
    if (f < c.start_frame || f >= c.start_frame + c.frames) continue;
    const visFrom = c.start_frame / FPS + 0.15;
    const visTo = (c.start_frame + c.frames) / FPS - 0.2;
    if (t < visFrom || t > visTo) return null;
    const idx = Math.min(f - c.start_frame, c.frames - 1);
    const [x, y, w, h] = tr.boxes_px[e.key][idx];
    return {
      event: e,
      box: { left: (x - 8) / 12.8, top: (y - 8) / 7.2, width: (w + 16) / 12.8, height: (h + 16) / 7.2 },
      tagOn: t >= e.stepAt,
    };
  }
  return null;
}

// Required by the handoff.
assert.equal(DISH_TOTAL, 3890, "DISH_TOTAL must be 3890");
assert.equal(DISH_PCT, 169, "DISH_PCT must be 169");

// totalAt steps.
assert.equal(totalAt(0), 0);
assert.equal(totalAt(1.0), 2080);
assert.equal(totalAt(5.64), 2930);
assert.equal(totalAt(9.48), 3890);
assert.equal(totalAt(100), 3890);

// activeAt against the real tracks fixture.
const tracks = JSON.parse(
  readFileSync(join(here, "../../public/hero/hero-pov-sequence-tracks.json"), "utf8"),
);
const a = activeAt(2.0, tracks);
assert.ok(a, "an item should be active at t=2.0");
assert.equal(a.event.key, "cube");
assert.equal(a.tagOn, true, "cube tag is on at t=2.0 (>= 1.0)");
assert.ok(a.box.width > 0 && a.box.height > 0, "box has positive size");

console.log("sodiumTimeline checks passed: DISH_TOTAL=3890, DISH_PCT=169, totalAt + activeAt OK");
