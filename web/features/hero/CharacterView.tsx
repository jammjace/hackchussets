"use client";

import { forwardRef } from "react";

// Feather the video on all four sides so it never shows a hard rectangle
// against the canvas (HERO_HANDOFF §6.4): left 18%, top 14%, right 10%, bottom 8%.
const MASK =
  "linear-gradient(to right,transparent 0,#000 18%,#000 90%,transparent 100%)," +
  "linear-gradient(to bottom,transparent 0,#000 14%,#000 92%,transparent 100%)";

interface CharacterViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

/**
 * The cook character video on the right of the hero (HERO_HANDOFF §6.4).
 * `object-position: 88% 100%` is required by the sightline maths (§8.3).
 * A ground shadow sits under the feet, inside the masked box so it fades with
 * the edges.
 */
export const CharacterView = forwardRef<HTMLDivElement, CharacterViewProps>(
  function CharacterView({ videoRef }, ref) {
    return (
      <div
        ref={ref}
        aria-hidden
        className="relative ml-auto min-h-[340px] min-w-[280px] max-w-[620px] flex-[0_1_44%]"
        style={{
          WebkitMaskImage: MASK,
          maskImage: MASK,
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        }}
      >
        <video
          ref={videoRef}
          src="/hero/hero-side.mp4"
          poster="/hero/hero-side.webp"
          muted
          playsInline
          loop
          className="absolute inset-0 size-full object-cover [object-position:88%_100%]"
        />
        {/* Ground shadow under the feet (product owner requested). */}
        <div
          className="pointer-events-none absolute bottom-[6%] left-[30%] right-[6%] h-[12%] rounded-[50%] blur-[6px] mix-blend-multiply"
          style={{
            background:
              "radial-gradient(ellipse at 62% 50%,rgba(30,28,25,.26) 0,rgba(30,28,25,.12) 38%,transparent 70%)",
          }}
        />
      </div>
    );
  },
);
