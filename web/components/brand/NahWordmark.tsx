import * as React from "react"
import { cn } from "cn"

/**
 * NahWordmark — the Na(h) logo lockup (style guide §01).
 *
 * An element tile ("Na" in Instrument Serif) carrying the atomic number 11 and
 * the atomic weight 22.99, with an italic "(h)" sitting outside in chilli,
 * slightly higher. On hover the "(h)" tilts 8° and settles (reduced motion is
 * honoured through the token-driven transition). At the small (32px) size the
 * tile keeps only "Na" and the numbers drop, per the guide.
 *
 * `tone="forest"` renders the one-colour version for forest backgrounds
 * (canvas strokes, no chilli), also per the guide.
 */
type NahWordmarkProps = {
  /** Tile edge length in pixels. Numbers hide below 40px. Default 64. */
  size?: number
  /** Colour treatment. Default is the full lockup; "forest" is one-colour. */
  tone?: "default" | "forest"
  className?: string
  /** Accessible label; defaults to "Na(h)". */
  label?: string
}

export function NahWordmark({
  size = 64,
  tone = "default",
  className,
  label = "Na(h)",
}: NahWordmarkProps) {
  const showNumbers = size >= 40
  const onForest = tone === "forest"

  const border = onForest ? "#FAF7EE" : "#1E1C19"
  const tileBg = onForest ? "transparent" : "#FFFDF7"
  const naColour = onForest ? "#FAF7EE" : "#1E1C19"
  const hColour = onForest ? "#FAF7EE" : "#B4432F"
  const numColour = onForest ? "#FAF7EE" : "#1E1C19"

  const naFontSize = Math.round(size * 0.53)
  const hFontSize = Math.round(size * 0.63)
  const hTop = -Math.round(size * 0.125)
  const tileRadius = size >= 40 ? 14 : 8
  const borderWidth = size >= 24 ? 2 : 1.5

  return (
    <span
      role="img"
      aria-label={label}
      className={cn("group/wordmark inline-flex items-start gap-1.5", className)}
    >
      <span
        aria-hidden
        className="relative box-border inline-flex items-center justify-center bg-paper"
        style={{
          width: size,
          height: size,
          border: `${borderWidth}px solid ${border}`,
          borderRadius: tileRadius,
          background: tileBg,
        }}
      >
        {showNumbers && (
          <span
            className="absolute font-ui font-semibold leading-none tracking-[0.04em]"
            style={{
              top: Math.round(size * 0.08),
              left: Math.round(size * 0.125),
              fontSize: Math.max(8, Math.round(size * 0.14)),
              color: numColour,
            }}
          >
            11
          </span>
        )}
        <span
          className="font-display leading-none"
          style={{ fontSize: naFontSize, marginTop: 2, color: naColour }}
        >
          Na
        </span>
        {showNumbers && (
          <span
            className="absolute right-0 left-0 text-center font-ui font-semibold leading-none tracking-[0.04em]"
            style={{
              bottom: Math.round(size * 0.08),
              fontSize: Math.max(7, Math.round(size * 0.125)),
              color: numColour,
            }}
          >
            22.99
          </span>
        )}
      </span>
      <span
        aria-hidden
        className="inline-block font-display italic leading-none transition-transform [transition-duration:var(--duration-reveal)] [transition-timing-function:var(--ease-pop)] group-hover/wordmark:rotate-[8deg]"
        style={{
          fontSize: hFontSize,
          position: "relative",
          top: hTop,
          transformOrigin: "20% 90%",
          color: hColour,
        }}
      >
        (h)
      </span>
    </span>
  )
}
