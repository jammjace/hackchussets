"use client";

import { forwardRef } from "react";

import { BIGGEST, DISH_PCT, DISH_TOTAL, fmt } from "./sodiumTimeline";

/**
 * The final dish-total card that replaces the chip at the end of the loop
 * (HERO_HANDOFF §6.3). Opacity and transform are animated per frame by the
 * panel's frame loop; all strings are computed from EVENTS, never hard-coded.
 * The "Estimates, not medical advice." line is required (honesty rule).
 */
export const FinalTotalCard = forwardRef<HTMLDivElement>(function FinalTotalCard(_, ref) {
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 flex flex-col rounded-[20px] bg-paper opacity-0 shadow-[0_6px_28px_rgba(30,28,25,.18)] transition-[opacity,transform] duration-[450ms]"
      style={{
        minWidth: "min(460px,86cqw)",
        padding: "clamp(14px,3.2cqw,28px) clamp(16px,3.8cqw,32px)",
        gap: "clamp(2px,.6cqw,6px)",
        transform: "translate(-50%,-44%)",
      }}
    >
      <span
        className="font-ui font-semibold tracking-[.08em] text-[#5B564D]"
        style={{ fontSize: "clamp(10px,1.6cqw,12px)" }}
      >
        DISH TOTAL
      </span>
      <span
        className="font-display leading-none text-chilli"
        style={{ fontSize: "clamp(36px,8.6cqw,64px)" }}
      >
        {fmt(DISH_TOTAL)} mg
      </span>
      <span
        className="font-ui font-semibold text-chilli"
        style={{ fontSize: "clamp(13px,2.4cqw,18px)" }}
      >
        {DISH_PCT}% of the 2,300 mg daily limit
      </span>
      <span className="text-ink" style={{ fontSize: "clamp(12px,2cqw,15px)" }}>
        Biggest contributor: {BIGGEST.name.toLowerCase()}, {fmt(BIGGEST.sodiumMg)} mg
      </span>
      <span
        className="mt-1 text-[#5B564D]"
        style={{ fontSize: "clamp(11px,1.7cqw,12.5px)" }}
      >
        Estimates, not medical advice.
      </span>
    </div>
  );
});
