import { TimestampPill } from "@/components/ui/timestamp-pill";

/**
 * Hero element for the landing page.
 *
 * The brand's hero is a chunky matte-clay 3D character (forest apron, camera
 * glasses with a lavender status light) — those renders are "to be supplied"
 * per the style guide, so this is an on-brand placeholder slot built from
 * CSS/SVG: the detection motif (camera glasses + status light, a dashed
 * sightline onto a pot, a travelling scan line) over the kitchen hatch. Swap
 * the inner art for an <Image> drop when the render lands; the framed slot and
 * its caption stay.
 *
 * All motion sits behind motion-safe:, so reduced motion shows a still frame.
 */
export function HeroArt() {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-video border-2 border-ink bg-forest">
      {/* Kitchen hatch */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(250,247,238,0.06) 0 2px, transparent 2px 14px)",
        }}
        aria-hidden
      />

      {/* Slot caption — marks this as a drop target for the real render */}
      <span className="absolute left-4 top-4 z-20 rounded-pill border border-stone bg-paper px-2.5 py-1 font-timestamp text-[11px] text-ink-soft">
        hero render · drop here
      </span>

      {/* Detection scene */}
      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        {/* Sightline cone from the glasses to the pot */}
        <g
          stroke="#FAF7EE"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="6 6"
          className="motion-safe:[stroke-dashoffset:0] motion-safe:animate-[nahSight_1800ms_linear_infinite]"
        >
          <line x1="120" y1="150" x2="250" y2="210" />
          <line x1="120" y1="168" x2="250" y2="300" />
        </g>

        {/* Camera glasses with lavender status light */}
        <g>
          <rect
            x="70"
            y="128"
            width="110"
            height="46"
            rx="16"
            fill="#FFFDF7"
            stroke="#1E1C19"
            strokeWidth="3"
          />
          <circle cx="100" cy="151" r="13" fill="#DCE5D9" stroke="#1E1C19" strokeWidth="3" />
          <circle cx="150" cy="151" r="13" fill="#DCE5D9" stroke="#1E1C19" strokeWidth="3" />
          <line x1="113" y1="151" x2="137" y2="151" stroke="#1E1C19" strokeWidth="3" />
          {/* lavender status light */}
          <circle
            cx="173"
            cy="134"
            r="6"
            fill="#E8DAF4"
            stroke="#1E1C19"
            strokeWidth="2"
            className="motion-safe:animate-pulse"
          />
        </g>

        {/* Pot being scanned */}
        <g>
          <rect
            x="248"
            y="206"
            width="96"
            height="98"
            rx="8"
            fill="none"
            stroke="#FAF7EE"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          {/* corner ticks */}
          <g stroke="#FAF7EE" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <path d="M248 222 V214 a8 8 0 0 1 8 -8 H264" />
            <path d="M328 206 H336 a8 8 0 0 1 8 8 V222" />
            <path d="M344 288 V296 a8 8 0 0 1 -8 8 H328" />
            <path d="M264 304 H256 a8 8 0 0 1 -8 -8 V288" />
          </g>
          {/* pot body */}
          <path
            d="M262 246 h68 l-6 54 a8 8 0 0 1 -8 7 h-40 a8 8 0 0 1 -8 -7 z"
            fill="#1E1C19"
            opacity="0.5"
          />
          {/* broth surface + steam */}
          <ellipse cx="296" cy="248" rx="34" ry="7" fill="#DCE5D9" opacity="0.5" />
        </g>
      </svg>

      {/* Travelling scan line over the pot */}
      <div
        className="absolute left-[62%] right-[12%] h-0.5 bg-lavender motion-safe:animate-[nahScan_2600ms_ease-in-out_infinite_alternate]"
        style={{ top: "54%" }}
        aria-hidden
      />

      {/* Floating detection readout */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-pill border border-stone bg-paper px-4 py-2 shadow-[var(--shadow-float)] motion-safe:animate-[nahReveal_600ms_var(--ease-out)_both]">
        <span className="font-ui text-sm font-semibold text-ink">Fish sauce</span>
        <span className="font-ui text-sm text-ink-soft">1 tbsp</span>
        <span className="font-ui text-sm font-semibold tabular-nums text-chilli">
          1,410 mg
        </span>
      </div>

      {/* Running time pill, lower left */}
      <TimestampPill className="absolute bottom-6 left-6 z-20 hidden sm:inline-flex">
        0:42
      </TimestampPill>
    </div>
  );
}
