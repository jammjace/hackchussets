"use client";

import { forwardRef } from "react";

/**
 * Dashed detection box drawn over the active item in the glasses POV panel
 * (HERO_HANDOFF §6.3). Position (left/top/width/height) and opacity are set
 * per frame on the DOM node by the panel's frame loop — this component only
 * declares the static style.
 */
export const TrackedBox = forwardRef<HTMLDivElement>(function TrackedBox(_, ref) {
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 rounded-[14px] border-2 border-dashed border-[rgba(30,28,25,.7)] opacity-0 transition-opacity duration-[250ms]"
    />
  );
});
