"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { TimestampPill } from "@/components/ui/timestamp-pill";
import { apiUrl } from "@/lib/api";
import { formatMg, formatTime } from "@/lib/format";
import type { TimelineRow } from "@/lib/types";

import { isFlagged, statusBadge } from "./status";

type CookingJourneyProps = {
  timeline: TimelineRow[];
  /** Full track length in seconds (video duration, or last ts + tail). */
  duration: number;
  /**
   * Live playhead position (0 → 1), updated every frame without a re-render.
   * The moving parts (playhead, filled spine, elapsed time, auto-scroll) are
   * animated directly from this ref for a smooth 60fps glide.
   */
  progressRef: React.RefObject<number>;
  /** Coarse playhead position (≈1% steps) used to gate card pops. */
  progress: number;
  /** True once the journey has finished travelling. */
  complete: boolean;
  /** Skip travel/auto-scroll and lay the spine out statically. */
  reduced: boolean;
  selectedEventId: string | null;
  onSelect: (row: TimelineRow) => void;
};

/** Vertical gap allotted to each addition along the spine. */
const ROW_H = 180;
/** Padding above the first node and below the last. */
const PAD_TOP = 48;
const PAD_BOTTOM = 72;
/** Panel viewport height. */
const PANEL_H = 540;

/**
 * The cooking journey (Stage 1): a central vertical spine with a playhead that
 * travels down as the cook plays. Each seasoning addition sits at a point on
 * the spine; as the playhead passes it, a card pops out — alternating left and
 * right — showing the evidence photo, the item, the amount and the sodium.
 *
 * The playhead is driven by the parent (video-synced or self-driving for demo
 * sessions). Clicking a card seeks the video to that moment. Flagged additions
 * are shown as "not counted" (saffron), never hidden, never 0 mg.
 *
 * Reduced motion: the whole spine is laid out statically with every card
 * visible and no auto-scroll.
 */
export function CookingJourney({
  timeline,
  duration,
  progressRef,
  progress,
  complete,
  reduced,
  selectedEventId,
  onSelect,
}: CookingJourneyProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);

  const safeDuration = duration > 0 ? duration : 1;
  const travel = timeline.length * ROW_H;
  const contentHeight = PAD_TOP + travel + PAD_BOTTOM;

  // Even vertical spacing per event (in order), independent of real time gaps,
  // so cards don't overlap when additions cluster together.
  const nodeY = (index: number) => PAD_TOP + (index + 0.5) * ROW_H;

  // Animate the continuously-moving parts directly against the DOM from the
  // live progress ref — one write per frame, no CSS transition, so the playhead
  // glides smoothly instead of fighting a per-frame transition. Card pops are
  // handled separately off the coarse `progress` prop.
  useEffect(() => {
    if (reduced) {
      // Static: fill the whole spine, no playhead, no auto-scroll.
      if (fillRef.current) fillRef.current.style.height = `${contentHeight}px`;
      return;
    }

    let raf = 0;
    let lastScroll = 0;
    const panel = panelRef.current;

    const render = () => {
      raf = requestAnimationFrame(render);
      const p = progressRef.current ?? 0;
      const y = PAD_TOP + p * travel;

      if (playheadRef.current) {
        playheadRef.current.style.transform = `translate(-50%, ${y}px)`;
      }
      if (fillRef.current) {
        fillRef.current.style.height = `${y}px`;
      }
      if (elapsedRef.current) {
        elapsedRef.current.textContent = formatTime(p * safeDuration);
      }
      // Keep the playhead roughly centred while travelling; throttle the
      // smooth scroll so we don't queue a new animation every frame.
      if (panel && !complete) {
        const now = performance.now();
        if (now - lastScroll > 180) {
          lastScroll = now;
          panel.scrollTo({ top: Math.max(0, y - PANEL_H / 2), behavior: "smooth" });
        }
      }
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [reduced, travel, contentHeight, safeDuration, complete, progressRef]);

  // Elapsed seconds for the discrete "has this card popped?" check.
  const elapsedSeconds = progress * safeDuration;

  if (timeline.length === 0) {
    return (
      <div className="rounded-card border-2 border-dashed border-ink p-8 text-center text-ink-soft">
        No measurable additions detected.
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="relative overflow-y-auto rounded-card bg-canvas ring-1 ring-stone"
      style={{ height: reduced ? "auto" : PANEL_H }}
    >
      <div className="relative mx-auto w-full max-w-2xl" style={{ height: contentHeight }}>
        {/* Spine */}
        <div
          className="absolute left-1/2 top-0 w-0.5 -translate-x-1/2 bg-stone"
          style={{ height: contentHeight }}
          aria-hidden
        />
        {/* Filled portion up to the playhead — height written per frame. */}
        <div
          ref={fillRef}
          className="absolute left-1/2 top-0 w-0.5 -translate-x-1/2 bg-forest"
          style={{ height: 0, willChange: "height" }}
          aria-hidden
        />

        {/* Travelling playhead — transform written per frame (no transition,
            so it glides at frame rate instead of chasing a lagging target). */}
        {!reduced && (
          <div
            ref={playheadRef}
            className="absolute left-1/2 top-0 z-10 flex items-center justify-center"
            style={{ transform: "translate(-50%, 0px)", willChange: "transform" }}
            aria-hidden
          >
            <span className="relative flex size-4 items-center justify-center">
              <span className="absolute inline-flex size-4 rounded-full bg-lavender opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex size-3 rounded-full border-2 border-ink bg-lavender" />
            </span>
            {/* Live elapsed time rides just beside the playhead */}
            <TimestampPill className="absolute left-5 whitespace-nowrap">
              <span ref={elapsedRef}>{formatTime(0)}</span>
            </TimestampPill>
          </div>
        )}

        {/* Event nodes + alternating cards */}
        {timeline.map((row, index) => {
          const top = nodeY(index);
          const side: "left" | "right" = index % 2 === 0 ? "left" : "right";
          const flagged = isFlagged(row.status);
          const selected = row.event_id === selectedEventId;
          // Pop the card once the playhead passes this event's timestamp.
          const popped = reduced || elapsedSeconds >= row.timestamp - 0.01;

          return (
            <div key={row.event_id}>
              {/* Node on the spine */}
              <span
                className={[
                  "absolute left-1/2 z-10 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all ease-[var(--ease-out)] [transition-duration:var(--duration-ui)]",
                  flagged ? "border-saffron bg-canvas" : "border-ink bg-lavender",
                  popped ? "scale-100 opacity-100" : "scale-0 opacity-0",
                ].join(" ")}
                style={{ top }}
                aria-hidden
              />

              {/* Connector from spine to card */}
              <span
                className={[
                  "absolute top-0 z-0 h-0.5 bg-stone transition-opacity [transition-duration:var(--duration-ui)]",
                  popped ? "opacity-100" : "opacity-0",
                ].join(" ")}
                style={{
                  top,
                  ...(side === "left"
                    ? { right: "50%", width: 40 }
                    : { left: "50%", width: 40 }),
                }}
                aria-hidden
              />

              {/* Card, offset to one side */}
              <div
                className={[
                  "absolute z-0 w-[min(44%,320px)] -translate-y-1/2",
                  side === "left" ? "right-[calc(50%+40px)]" : "left-[calc(50%+40px)]",
                  "transition-all ease-[var(--ease-pop)] [transition-duration:var(--duration-reveal)] motion-reduce:transition-opacity",
                  popped
                    ? "translate-x-0 opacity-100"
                    : side === "left"
                      ? "pointer-events-none translate-x-4 opacity-0"
                      : "pointer-events-none -translate-x-4 opacity-0",
                ].join(" ")}
                style={{ top }}
              >
                <JourneyCard
                  row={row}
                  side={side}
                  selected={selected}
                  onSelect={onSelect}
                  tabbable={popped}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JourneyCard({
  row,
  side,
  selected,
  onSelect,
  tabbable,
}: {
  row: TimelineRow;
  side: "left" | "right";
  selected: boolean;
  onSelect: (row: TimelineRow) => void;
  tabbable: boolean;
}) {
  const badgeText = statusBadge(row.status);
  const evidence = apiUrl(row.evidence_url);
  const title = row.product_name ?? row.ingredient;
  const badgeVariant =
    row.status === "unrecognised_ingredient" ? "notCounted" : "estimate";

  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      aria-pressed={selected}
      tabIndex={tabbable ? 0 : -1}
      className={[
        "flex w-full flex-col gap-3 rounded-card bg-paper p-4 text-left shadow-[var(--shadow-float)] ring-1 outline-none transition-all [transition-duration:var(--duration-hover)]",
        "hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ink",
        selected ? "ring-2 ring-ink" : "ring-stone",
        side === "left" ? "items-end text-right" : "items-start text-left",
      ].join(" ")}
    >
      <div
        className={[
          "flex w-full items-center gap-3",
          side === "left" ? "flex-row-reverse" : "flex-row",
        ].join(" ")}
      >
        <span className="relative block size-14 shrink-0 overflow-hidden rounded-xl bg-stone">
          {evidence ? (
            <Image
              src={evidence}
              alt={`Evidence for ${row.ingredient}`}
              fill
              sizes="56px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="flex size-full items-center justify-center p-1 text-center text-[10px] leading-tight text-ink-soft">
              {row.ingredient}
            </span>
          )}
        </span>
        <TimestampPill>{formatTime(row.timestamp)}</TimestampPill>
      </div>

      <div className="w-full">
        <div
          className={[
            "flex flex-wrap items-center gap-2",
            side === "left" ? "justify-end" : "justify-start",
          ].join(" ")}
        >
          <span className="font-ui font-semibold capitalize">{title}</span>
          {badgeText && <Badge variant={badgeVariant}>{badgeText}</Badge>}
        </div>
        <p className="mt-0.5 font-ui text-sm text-ink-soft">
          {row.quantity} {row.unit}
          {row.product_name && row.product_name !== row.ingredient && (
            <span className="capitalize"> · {row.ingredient}</span>
          )}
        </p>
      </div>

      {/* Sodium — single additions stay ink; never "0 mg" for null */}
      <span
        className={[
          "font-display text-2xl leading-none tabular-nums",
          row.sodium_mg === null ? "text-base text-ink-soft" : "text-ink",
        ].join(" ")}
      >
        {formatMg(row.sodium_mg)}
      </span>
    </button>
  );
}
