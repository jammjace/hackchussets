"use client";

import { ArrowRight, Flame, Lightbulb } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatMg, formatNumber, formatPercent } from "@/lib/format";
import type { TimelineRow } from "@/lib/types";

type SuggestionsProps = {
  timeline: TimelineRow[];
  totalSodiumMg: number;
  dailyLimitMg: number;
};

/** A counted sodium row: status ok with a numeric sodium value. */
type CountedRow = TimelineRow & { sodium_mg: number };

function isCounted(row: TimelineRow): row is CountedRow {
  return row.status === "ok" && typeof row.sodium_mg === "number";
}

/** Match an ingredient name loosely (case and whitespace tolerant). */
function matches(ingredient: string, needle: string): boolean {
  return ingredient.trim().toLowerCase().includes(needle);
}

type Contributor = {
  key: string;
  label: string;
  totalMg: number;
  count: number;
};

/**
 * Group the ok rows by ingredient and return the largest by total sodium.
 * Everything is computed from the timeline — nothing is hard-coded.
 */
function biggestContributor(counted: CountedRow[]): Contributor | null {
  const groups = new Map<string, Contributor>();
  for (const row of counted) {
    const key = row.ingredient.trim().toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.totalMg += row.sodium_mg;
      existing.count += 1;
    } else {
      groups.set(key, {
        key,
        // Prefer a product name for display; fall back to the ingredient.
        label: row.product_name ?? row.ingredient,
        totalMg: row.sodium_mg,
        count: 1,
      });
    }
  }
  let best: Contributor | null = null;
  for (const group of groups.values()) {
    if (!best || group.totalMg > best.totalMg) {
      best = group;
    }
  }
  return best;
}

type Swap = {
  title: string;
  detail: string;
  savedMg: number;
};

/**
 * Pick one swap from the counted rows (section 9.7 item 6):
 *  - chicken bouillon present → halve the cubes (saves half their sodium);
 *  - soy sauce present → Kikkoman Less Sodium (590 mg/Tbsp, 38% less).
 * Returns null when neither ingredient is in the counted rows.
 */
function easySwap(counted: CountedRow[]): Swap | null {
  const bouillon = counted.filter((r) => matches(r.ingredient, "bouillon"));
  if (bouillon.length > 0) {
    const current = bouillon.reduce((sum, r) => sum + r.sodium_mg, 0);
    const saved = current / 2; // half the cubes → half the sodium
    const cubeWord = bouillon.length === 1 ? "cube" : "cubes";
    return {
      title: "Use half the bouillon",
      detail: `Halving your chicken bouillon ${cubeWord} keeps most of the flavour from the broth.`,
      savedMg: saved,
    };
  }

  const soy = counted.filter((r) => matches(r.ingredient, "soy sauce"));
  if (soy.length > 0) {
    const current = soy.reduce((sum, r) => sum + r.sodium_mg, 0);
    const saved = current * 0.38; // Kikkoman Less Sodium is 38% less
    return {
      title: "Switch to Kikkoman Less Sodium",
      detail:
        "Kikkoman Less Sodium is 590 mg per tablespoon — about 38% less than regular soy sauce, for the same splash.",
      savedMg: saved,
    };
  }

  return null;
}

/**
 * Section 9.7 item 6. Biggest contributor and one easy swap, both derived from
 * the timeline's ok rows. The swap shows the mg saved and the new dish total as
 * a percentage of the daily limit.
 */
export function Suggestions({
  timeline,
  totalSodiumMg,
  dailyLimitMg,
}: SuggestionsProps) {
  const counted = timeline.filter(isCounted);
  if (counted.length === 0) {
    return null;
  }

  const top = biggestContributor(counted);
  const swap = easySwap(counted);

  if (!top && !swap) {
    return null;
  }

  const limit = dailyLimitMg > 0 ? dailyLimitMg : 2300;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {top && (
        <Card>
          <CardContent className="space-y-3">
            <p className="flex items-center gap-2 font-ui text-sm font-semibold tracking-[0.08em] text-ink-soft uppercase">
              <Flame className="size-4" aria-hidden />
              Biggest contributor
            </p>
            <p className="font-ui text-lg font-semibold capitalize text-ink">
              {top.label}
            </p>
            <p className="font-display text-4xl leading-none tracking-tight tabular-nums text-ink">
              {formatMg(top.totalMg)}
            </p>
            <p className="font-ui text-sm text-ink-soft">
              {top.count > 1
                ? `${top.count} additions, ${formatPercent(
                    (top.totalMg / limit) * 100,
                  )} of the daily limit on its own.`
                : `${formatPercent(
                    (top.totalMg / limit) * 100,
                  )} of the daily limit on its own.`}
            </p>
          </CardContent>
        </Card>
      )}

      {swap && (
        <Card>
          <CardContent className="space-y-3">
            <p className="flex items-center gap-2 font-ui text-sm font-semibold tracking-[0.08em] text-forest uppercase">
              <Lightbulb className="size-4" aria-hidden />
              One easy swap
            </p>
            <p className="font-ui text-lg font-semibold text-ink">
              {swap.title}
            </p>
            <p className="font-ui text-sm text-ink-soft">{swap.detail}</p>
            <div className="flex flex-wrap items-center gap-2 border-t border-stone pt-3 font-ui text-sm">
              <span className="font-semibold text-forest">
                Saves {formatMg(swap.savedMg)}
              </span>
              <ArrowRight className="size-4 text-ink-soft" aria-hidden />
              <span className="tabular-nums text-ink">
                new total {formatNumber(totalSodiumMg - swap.savedMg)} mg ·{" "}
                {formatPercent(
                  ((totalSodiumMg - swap.savedMg) / limit) * 100,
                )}{" "}
                of the daily limit
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
