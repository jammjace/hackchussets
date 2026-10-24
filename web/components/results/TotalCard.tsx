"use client";

import { Check, Info, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/format";
import { useCountUp } from "@/lib/use-reveal";

type TotalCardProps = {
  totalSodiumMg: number;
  dailyLimitMg: number;
  percentOfDailyLimit: number;
  /** When true, the big number counts up from 0 to the total. */
  animate?: boolean;
};

/**
 * Section 9.7 item 1 / Na(h) Sodium Meter (§09). The dish total as a serif hero
 * number, the percent of the daily limit, and a 12px meter track.
 *
 * Na(h) colour rule: chilli is for a dish total AT OR ABOVE the 2,300 mg limit
 * only — never for a single addition. Under the limit the bar is forest.
 * When over, the track rescales so the bar is the dish total and the marker
 * slides to the 2,300 mg point, with the over-limit segment hatched in chilli.
 */
export function TotalCard({
  totalSodiumMg,
  dailyLimitMg,
  percentOfDailyLimit,
  animate = false,
}: TotalCardProps) {
  const pct = Number.isFinite(percentOfDailyLimit) ? percentOfDailyLimit : 0;
  const total = Number.isFinite(totalSodiumMg) ? totalSodiumMg : 0;
  const limit = dailyLimitMg > 0 ? dailyLimitMg : 2300;

  // Count the hero number up from 0 when the reveal reaches the total stage.
  const displayedTotal = useCountUp(total, animate);

  // At or above the limit → over. Chilli applies here only.
  const overLimit = total >= limit;

  // Under limit: the bar fills to pct of the limit (forest).
  // Over limit: the track is rescaled to the dish total; the forest bar fills
  // the first `limit` worth, the chilli hatched segment is the excess, and the
  // 2,300 mg marker sits where the limit falls within the total.
  const underFillPct = Math.max(0, Math.min(100, pct));
  const markerPct = overLimit ? Math.min(100, (limit / total) * 100) : 100;
  const overFillPct = overLimit ? 100 - markerPct : 0;

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-6xl leading-none tracking-tight tabular-nums">
              {formatNumber(displayedTotal)}
              <span className="ml-1.5 text-2xl">mg</span>
            </p>
            <p className="mt-2 font-ui text-base text-ink-soft">in this dish</p>
          </div>
          {overLimit ? (
            <Badge variant="overLimit">
              <TriangleAlert aria-hidden />
              {formatPercent(pct)} · over limit
            </Badge>
          ) : (
            <Badge variant="detected">
              <Check aria-hidden />
              {formatPercent(pct)} · under limit
            </Badge>
          )}
        </div>

        {/* Sodium Meter: 12px track, marker at 2,300 mg */}
        <div className="pr-14">
          <div
            className="relative h-3 rounded-pill bg-stone"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(underFillPct)}
            aria-label={`${formatPercent(pct)} of the daily sodium limit`}
          >
            {/* Forest fill (under-limit portion) */}
            <div
              className="absolute inset-y-0 left-0 rounded-pill bg-forest transition-all [transition-duration:var(--duration-ui)]"
              style={{
                width: `${overLimit ? markerPct : underFillPct}%`,
                borderRadius: overLimit ? "999px 0 0 999px" : undefined,
              }}
            />
            {/* Chilli hatched over-limit segment */}
            {overLimit && (
              <div
                className="absolute inset-y-0 rounded-r-pill bg-chilli"
                style={{
                  left: `${markerPct}%`,
                  width: `${overFillPct}%`,
                  backgroundImage:
                    "repeating-linear-gradient(135deg, rgba(250,247,238,0.35) 0 3px, transparent 3px 7px)",
                }}
              />
            )}
            {/* 2,300 mg marker */}
            <div
              className="absolute -top-1.5 h-6 w-0.5 -translate-x-1/2 bg-chilli"
              style={{ left: `${markerPct}%` }}
            />
            <div
              className="absolute top-7 -translate-x-1/2 font-ui text-[11px] font-semibold tracking-[0.06em] whitespace-nowrap text-chilli uppercase"
              style={{ left: `${markerPct}%` }}
            >
              {formatNumber(limit)} mg
            </div>
          </div>
        </div>

        {/* Disclaimer line (§09) — appears under every total */}
        <p className="flex items-center gap-2 border-t border-stone pt-4 font-ui text-sm text-ink-soft">
          <Info className="size-4 shrink-0" aria-hidden />
          Estimates from your pantry labels. Not medical advice.
        </p>
      </CardContent>
    </Card>
  );
}
