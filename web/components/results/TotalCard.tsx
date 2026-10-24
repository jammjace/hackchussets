"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatMg, formatNumber, formatPercent } from "@/lib/format";

type TotalCardProps = {
  totalSodiumMg: number;
  dailyLimitMg: number;
  percentOfDailyLimit: number;
};

/**
 * Section 9.7 item 1. Big total "N mg in this dish", the percent of the daily
 * limit, and a progress bar coloured green/amber/red. The bar is capped at
 * 100% width; the real percentage is always shown in text.
 */
export function TotalCard({
  totalSodiumMg,
  dailyLimitMg,
  percentOfDailyLimit,
}: TotalCardProps) {
  const pct = Number.isFinite(percentOfDailyLimit) ? percentOfDailyLimit : 0;
  const barWidth = Math.max(0, Math.min(100, pct));

  // green under 50%, amber 50-99%, red 100% and over
  const barColour =
    pct >= 100
      ? "bg-red-500"
      : pct >= 50
        ? "bg-amber-500"
        : "bg-green-500";

  const textColour =
    pct >= 100
      ? "text-red-600"
      : pct >= 50
        ? "text-amber-600"
        : "text-green-600";

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {formatMg(totalSodiumMg)}
            <span className="ml-2 text-base font-normal text-muted-foreground">
              in this dish
            </span>
          </p>
          <p className={`mt-1 text-lg font-medium ${textColour}`}>
            {formatPercent(pct)} of the {formatNumber(dailyLimitMg)} mg daily
            limit
          </p>
        </div>

        <div
          className="h-3 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(barWidth)}
          aria-label={`${formatPercent(pct)} of the daily sodium limit`}
        >
          <div
            className={`h-full rounded-full transition-all ${barColour}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
