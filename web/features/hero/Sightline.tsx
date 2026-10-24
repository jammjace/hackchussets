"use client";

import { forwardRef } from "react";

export interface SightlineRefs {
  border: SVGRectElement | null;
  line: SVGLineElement | null;
}

/**
 * The dashed panel border (drawn as an SVG rect, not a CSS border, so it
 * shares a coordinate space with the sightline) and the dashed sightline from
 * the glasses camera point to the panel edge (HERO_HANDOFF §6.5, §6.6).
 * Geometry is set per frame by HeroStage; the scan state recolours the stroke.
 */
export const Sightline = forwardRef<SightlineRefs>(function Sightline(_, ref) {
  const assign = (svg: SVGSVGElement | null) => {
    const refs: SightlineRefs = {
      border: svg?.querySelector<SVGRectElement>("[data-sight='border']") ?? null,
      line: svg?.querySelector<SVGLineElement>("[data-sight='line']") ?? null,
    };
    if (typeof ref === "function") ref(refs);
    else if (ref) ref.current = refs;
  };

  return (
    <svg
      ref={assign}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[3] size-full overflow-visible"
    >
      <rect
        data-sight="border"
        x={0}
        y={0}
        width={0}
        height={0}
        rx={26}
        fill="none"
        stroke="rgba(30,28,25,.65)"
        strokeWidth={2}
        strokeDasharray="6 5"
        vectorEffect="non-scaling-stroke"
      />
      <line
        data-sight="line"
        x1={0}
        y1={0}
        x2={0}
        y2={0}
        stroke="rgba(30,28,25,.65)"
        strokeWidth={1.5}
        strokeDasharray="6 5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
});
