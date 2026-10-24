"use client";

import Image from "next/image";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api";
import { formatMg, formatTime } from "@/lib/format";
import type { TimelineRow } from "@/lib/types";

import { isFlagged, statusBadge } from "./status";

type IngredientTimelineProps = {
  timeline: TimelineRow[];
  /** Full track length in seconds: video duration, or last timestamp + 10. */
  duration: number;
  selectedEventId: string | null;
  onSelect: (row: TimelineRow) => void;
};

/**
 * Section 9.7 item 4. A horizontal track (0 → duration) with a marker per event
 * at its `timestamp`, and a list of event cards in time order. Markers and cards
 * are buttons: clicking selects, highlights and seeks the video. Flagged
 * (non-ok) events use a hollow marker. Never renders null sodium as 0.
 */
export function IngredientTimeline({
  timeline,
  duration,
  selectedEventId,
  onSelect,
}: IngredientTimelineProps) {
  // Largest counted sodium value, used to scale marker size.
  const maxSodium = useMemo(() => {
    const values = timeline
      .map((r) => r.sodium_mg)
      .filter((v): v is number => v !== null && Number.isFinite(v));
    return values.length ? Math.max(...values) : 0;
  }, [timeline]);

  if (timeline.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        No measurable additions detected.
      </div>
    );
  }

  const safeDuration = duration > 0 ? duration : 1;

  return (
    <div className="space-y-6">
      {/* Horizontal track */}
      <div className="px-2 pt-6 pb-2">
        <div className="relative h-10">
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-muted" />
          {timeline.map((row) => {
            const leftPct = Math.max(
              0,
              Math.min(100, (row.timestamp / safeDuration) * 100),
            );
            const flagged = isFlagged(row.status);
            const selected = row.event_id === selectedEventId;

            // Scale marker 10px → 22px by sodium contribution.
            const counted = row.sodium_mg ?? 0;
            const scale = maxSodium > 0 ? counted / maxSodium : 0;
            const sizePx = flagged ? 14 : 10 + Math.round(scale * 12);

            return (
              <button
                key={row.event_id}
                type="button"
                onClick={() => onSelect(row)}
                aria-pressed={selected}
                aria-label={`${row.ingredient} at ${formatTime(
                  row.timestamp,
                )}, ${formatMg(row.sodium_mg)}`}
                title={`${formatTime(row.timestamp)} · ${row.ingredient} · ${formatMg(
                  row.sodium_mg,
                )}`}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none transition-transform hover:scale-125 focus-visible:ring-3 focus-visible:ring-ring/50"
                style={{ left: `${leftPct}%` }}
              >
                <span
                  className={[
                    "block rounded-full border-2 transition-colors",
                    flagged
                      ? "border-amber-500 bg-transparent"
                      : "border-primary bg-primary",
                    selected
                      ? "ring-3 ring-ring/60 ring-offset-1 ring-offset-background"
                      : "",
                  ].join(" ")}
                  style={{ width: sizePx, height: sizePx }}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>0:00</span>
          <span>{formatTime(safeDuration)}</span>
        </div>
      </div>

      {/* Event cards in time order */}
      <ul className="space-y-3">
        {timeline.map((row) => (
          <li key={row.event_id}>
            <EventCard
              row={row}
              selected={row.event_id === selectedEventId}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EventCard({
  row,
  selected,
  onSelect,
}: {
  row: TimelineRow;
  selected: boolean;
  onSelect: (row: TimelineRow) => void;
}) {
  const badgeText = statusBadge(row.status);
  const evidence = apiUrl(row.evidence_url);
  const title = row.product_name ?? row.ingredient;

  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      aria-pressed={selected}
      className={[
        "flex w-full items-center gap-4 rounded-xl bg-card p-3 text-left ring-1 transition-colors outline-none",
        "hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50",
        selected ? "ring-2 ring-primary" : "ring-foreground/10",
      ].join(" ")}
    >
      {/* Time */}
      <span className="w-12 shrink-0 text-center font-mono text-sm tabular-nums text-muted-foreground">
        {formatTime(row.timestamp)}
      </span>

      {/* Evidence image or placeholder */}
      <span className="relative block size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        {evidence ? (
          <Image
            src={evidence}
            alt={`Evidence for ${row.ingredient}`}
            fill
            sizes="64px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="flex size-full items-center justify-center p-1 text-center text-[10px] leading-tight text-muted-foreground">
            {row.ingredient}
          </span>
        )}
      </span>

      {/* Details */}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium capitalize">{title}</span>
          {badgeText && (
            <Badge variant={row.status === "not_confirmed" ? "secondary" : "outline"}>
              {badgeText}
            </Badge>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {row.quantity} {row.unit}
          {row.product_name && row.product_name !== row.ingredient && (
            <span className="capitalize"> · {row.ingredient}</span>
          )}
        </span>
      </span>

      {/* Sodium — never "0 mg" for null */}
      <span
        className={[
          "shrink-0 text-right font-medium tabular-nums",
          row.sodium_mg === null ? "text-sm text-muted-foreground" : "",
        ].join(" ")}
      >
        {formatMg(row.sodium_mg)}
      </span>
    </button>
  );
}
