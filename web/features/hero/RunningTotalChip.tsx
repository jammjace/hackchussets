"use client";

import { forwardRef } from "react";

export interface RunningTotalChipRefs {
  root: HTMLDivElement | null;
  num: HTMLSpanElement | null;
  fill: HTMLDivElement | null;
  pct: HTMLSpanElement | null;
}

/**
 * The "Dish so far" chip: a live total, a bar with a limit tick, and a
 * percentage line (HERO_HANDOFF §6.3). The number, bar fill width/colour and
 * percentage text/colour are written per frame by the panel's frame loop.
 * Sizes use container query units so the chip scales with the panel.
 */
export const RunningTotalChip = forwardRef<RunningTotalChipRefs>(
  function RunningTotalChip(_, ref) {
    const assign = (node: HTMLDivElement | null) => {
      const refs: RunningTotalChipRefs = {
        root: node,
        num: node?.querySelector<HTMLSpanElement>("[data-chip='num']") ?? null,
        fill: node?.querySelector<HTMLDivElement>("[data-chip='fill']") ?? null,
        pct: node?.querySelector<HTMLSpanElement>("[data-chip='pct']") ?? null,
      };
      if (typeof ref === "function") ref(refs);
      else if (ref) ref.current = refs;
    };

    return (
      <div
        ref={assign}
        aria-hidden
        className="absolute flex flex-col gap-1.5 rounded-2xl bg-paper shadow-[0_2px_10px_rgba(30,28,25,.16)] transition-opacity duration-[300ms]"
        style={{
          left: "clamp(8px,1.9cqw,14px)",
          top: "clamp(8px,1.9cqw,14px)",
          width: "clamp(190px,36cqw,270px)",
          padding: "clamp(8px,1.6cqw,12px) clamp(10px,1.9cqw,14px)",
        }}
      >
        {/* Row 1: label + number */}
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="font-ui font-semibold text-[#5B564D]"
            style={{ fontSize: "clamp(11px,1.7cqw,13px)" }}
          >
            Dish so far
          </span>
          <span className="flex items-baseline gap-1">
            <span
              data-chip="num"
              className="font-display leading-none text-ink tabular-nums"
              style={{ fontSize: "clamp(24px,4.6cqw,34px)" }}
            >
              0
            </span>
            <span
              className="text-[#5B564D]"
              style={{ fontSize: "clamp(11px,1.7cqw,13px)" }}
            >
              mg
            </span>
          </span>
        </div>

        {/* Row 2: bar with the daily-limit tick */}
        <div className="relative h-2 rounded-full bg-stone">
          <div
            data-chip="fill"
            className="absolute inset-y-0 left-0 w-0 rounded-full bg-forest"
          />
          <div className="absolute left-[52.27%] -top-[3px] -bottom-[3px] w-0.5 rounded-[1px] bg-ink" />
        </div>

        {/* Row 3: percentage + limit label */}
        <div
          className="flex justify-between gap-2"
          style={{ fontSize: "clamp(10px,1.6cqw,12px)" }}
        >
          <span data-chip="pct" className="font-ui font-semibold text-[#5B564D]">
            0% of daily limit
          </span>
          <span className="text-[#6B665C]">2,300 mg limit</span>
        </div>
      </div>
    );
  },
);
