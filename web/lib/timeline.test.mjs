import assert from "node:assert/strict";
import test from "node:test";

import { clampSeekTime, formatQuantity } from "./timeline.ts";

test("seek timestamps are clamped to a shorter uploaded video", () => {
  assert.equal(clampSeekTime(22.5, 10), 10);
  assert.equal(clampSeekTime(4, 10), 4);
  assert.equal(clampSeekTime(-1, 10), 0);
});

test("unknown quantities with null units render clearly", () => {
  assert.equal(formatQuantity(null, null, null), "Unknown quantity");
  assert.equal(formatQuantity(null, "tablespoon", null), "Unknown tablespoon quantity");
  assert.equal(formatQuantity(2, "tablespoon", null), "2 tablespoon");
});
