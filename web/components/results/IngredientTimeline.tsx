"use client";

import Image from "next/image";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { TimestampPill } from "@/components/ui/timestamp-pill";
import { apiUrl } from "@/lib/api";
import { formatMg, formatTime } from "@/lib/format";
import type { TimelineRow } from "@/lib/types";
import { formatQuantity } from "@/lib/timeline";

import { isFlagged, statusBadge } from "./status";

type IngredientTimelineProps = {
  timeline: TimelineRow[];
  /** Full track length in seconds: video duration, or last timestamp + 10. */
  duration: number;
  selectedEventId: string | null;
  onSelect: (row: TimelineRow) => void;
  /**
   * How many rows (in time order) are revealed during the intro animation.
   * Defaults to all rows. Markers and cards past this index fade/rise in.
   */
  revealCount?: number;
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
  revealCount,
}: IngredientTimelineProps) {
  // Default to revealing everything (static view / reduced motion).
  const shown = revealCount ?? timeline.length;
  // Largest counted sodium value, used to scale marker size.
  const maxSodium = useMemo(() => {
    const values = timeline
      .map((r) => r.sodium_mg)
      .filter((v): v is number => v !== null && Number.isFinite(v));
    return values.length ? Math.max(...values) : 0;
  }, [timeline]);

  if (timeline.length === 0) {
    return (
      <div className="rounded-card border-2 border-dashed border-ink p-8 text-center text-ink-soft">
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
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-pill bg-stone" />
          {timeline.map((row, index) => {
            const leftPct = Math.max(
              0,
              Math.min(100, (row.timestamp / safeDuration) * 100),
            );
            const flagged = isFlagged(row.status);
            const selected = row.event_id === selectedEventId;
            const revealed = index < shown;

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
                aria-hidden={!revealed}
                tabIndex={revealed ? 0 : -1}
                aria-label={`${row.ingredient} at ${formatTime(
                  row.timestamp,
                )}, ${formatMg(row.sodium_mg)}`}
                title={`${formatTime(row.timestamp)} · ${row.ingredient} · ${formatMg(
                  row.sodium_mg,
                )}`}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none transition-all ease-[var(--ease-out)] [transition-duration:var(--duration-reveal)] hover:scale-125 focus-visible:ring-2 focus-visible:ring-ink"
                style={{ left: `${leftPct}%`, opacity: revealed ? 1 : 0 }}
              >
                <span
                  className={[
                    // Seasoning added = lavender; not counted = saffron hollow.
                    "block rounded-full border-2 transition-colors",
                    flagged
                      ? "border-saffron bg-transparent"
                      : "border-ink bg-lavender",
                    selected
                      ? "ring-2 ring-ink ring-offset-1 ring-offset-canvas"
                      : "",
                  ].join(" ")}
                  style={{ width: sizePx, height: sizePx }}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between font-timestamp text-xs text-ink-soft">
          <span>0:00</span>
          <span>{formatTime(safeDuration)}</span>
        </div>
      </div>

      {/* Event cards in time order, revealed one at a time during the intro */}
      <ul className="space-y-3">
        {timeline.map((row, index) => {
          const revealed = index < shown;
          return (
            <li
              key={row.event_id}
              aria-hidden={!revealed}
              className={[
                "transition-all ease-[var(--ease-out)] [transition-duration:var(--duration-reveal)] motion-reduce:transition-opacity",
                revealed
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-[var(--reveal-y)] opacity-0",
              ].join(" ")}
            >
              <EventCard
                row={row}
                selected={row.event_id === selectedEventId}
                onSelect={onSelect}
                tabbable={revealed}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EventCard({
  row,
  selected,
  onSelect,
  tabbable = true,
}: {
  row: TimelineRow;
  selected: boolean;
  onSelect: (row: TimelineRow) => void;
  /** Keep hidden (not-yet-revealed) cards out of the tab order. */
  tabbable?: boolean;
}) {
  const badgeText = statusBadge(row.status);
  const evidence = apiUrl(row.evidence_url);
  const title = row.product_name ?? row.ingredient;

  // Unrecognised ingredients are "Not counted" (saffron); other flags are
  // neutral. A single addition is never coloured chilli — that is reserved for
  // a dish total at or above the daily limit.
  const badgeVariant =
    row.status === "unrecognised_ingredient" ? "notCounted" : "estimate";

  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      aria-pressed={selected}
      tabIndex={tabbable ? 0 : -1}
      className={[
        "flex w-full items-center gap-4 rounded-card bg-card p-4 text-left ring-1 transition-colors outline-none [transition-duration:var(--duration-hover)]",
        "hover:bg-canvas focus-visible:ring-2 focus-visible:ring-ink",
        selected ? "ring-2 ring-ink" : "ring-stone",
      ].join(" ")}
    >
      {/* Time */}
      <TimestampPill className="shrink-0">
        {formatTime(row.timestamp)}
      </TimestampPill>

      {/* Evidence image or placeholder */}
      <span className="relative block size-16 shrink-0 overflow-hidden rounded-xl bg-stone">
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
          <span className="flex size-full items-center justify-center p-1 text-center text-[10px] leading-tight text-ink-soft">
            {row.ingredient}
          </span>
        )}
      </span>

      {/* Details */}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-ui font-semibold capitalize">{title}</span>
          {badgeText && <Badge variant={badgeVariant}>{badgeText}</Badge>}
        </span>
        <span className="mt-0.5 block font-ui text-sm text-ink-soft">
          {formatQuantity(
            row.quantity,
            row.unit,
            row.known_estimated_subtotal_tbsp,
          )}
          {row.product_name && row.product_name !== row.ingredient && (
            <span className="capitalize"> · {row.ingredient}</span>
          )}
        </span>
      </span>

      {/* Sodium — single additions stay ink; never "0 mg" for null */}
      <span
        className={[
          "shrink-0 text-right font-ui font-semibold tabular-nums",
          row.sodium_mg === null ? "text-sm text-ink-soft" : "text-ink",
        ].join(" ")}
      >
        {formatMg(row.sodium_mg)}
      </span>
    </button>
  );
}
