// Na(h) landing hero: timeline data and pure functions (HERO_HANDOFF §8.1).
// All sodium strings on the page are computed from EVENTS; nothing is
// hard-coded in the components.

import type { ActiveItem, EventKey, HeroEvent, Tracks } from "./types";

// Keep EVENTS strongly typed without a circular reference: the array literal is
// `as const` (so keys/strings stay literal) and checked against HeroEvent[].

export const DAILY_LIMIT_MG = 2300;
export const BAR_MAX_MG = 4400; // limit tick sits at 2300/4400 = 52.27%
export const FPS = 24;
export const CARD_AT = 12.275; // s; final card shows from here until the loop

export const EVENTS = [
  { key: "cube", name: "Bouillon cube", amount: "1 cube", sodiumMg: 2080, stepAt: 1.0 },
  { key: "packet", name: "Sazón packet", amount: "1 packet", sodiumMg: 850, stepAt: 5.64 },
  { key: "soy", name: "Soy sauce", amount: "1 Tbsp", sodiumMg: 960, stepAt: 9.48 },
] as const satisfies readonly HeroEvent[];

/** Format a milligram number with thousands separators, e.g. 2080 -> "2,080". */
export const fmt = (n: number): string => Math.round(n).toLocaleString("en-US");

/** Running sodium total at media time t (sum of every event already stepped in). */
export const totalAt = (t: number): number =>
  EVENTS.reduce((sum, e) => (t >= e.stepAt ? sum + e.sodiumMg : sum), 0);

/** Whole-dish total once every addition has stepped in. */
export const DISH_TOTAL: number = EVENTS.reduce((sum, e) => sum + e.sodiumMg, 0); // 3890

/** Dish total as a whole-number percentage of the daily limit. */
export const DISH_PCT: number = Math.round((DISH_TOTAL / DAILY_LIMIT_MG) * 100); // 169

/** The single biggest contributing addition. */
export const BIGGEST: HeroEvent = EVENTS.reduce((a, e) =>
  e.sodiumMg > a.sodiumMg ? e : a,
);

/**
 * The active tracked item at media time t: its box as a percentage of the
 * panel, and whether its tag is showing. Returns null when no item is active
 * (outside every clip, or inside the lead-in / lead-out margins).
 */
export function activeAt(t: number, tr: Tracks): ActiveItem | null {
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
      // 8px padding on each side, expressed in % of a 1280x720 panel.
      box: {
        left: (x - 8) / 12.8,
        top: (y - 8) / 7.2,
        width: (w + 16) / 12.8,
        height: (h + 16) / 7.2,
      },
      tagOn: t >= e.stepAt,
    };
  }
  return null;
}

/** Screen-reader summary that replaces the looping overlay (honesty rule). */
export const SUMMARY: string =
  `Example: ${EVENTS.map(
    (e) => `${e.name.toLowerCase()} ${e.amount}, ${fmt(e.sodiumMg)} mg`,
  ).join("; ")}. ` +
  `Dish total ${fmt(DISH_TOTAL)} mg, ${DISH_PCT}% of the 2,300 mg daily limit. ` +
  `Estimates, not medical advice.`;

export type { ActiveItem, EventKey, HeroEvent, Tracks };
