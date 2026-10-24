"use client";

import { forwardRef } from "react";

type SessionVideoProps = {
  /** Absolute video URL (API base already applied). */
  src: string;
  /** Called with the video duration (seconds) once metadata loads. */
  onDuration?: (duration: number) => void;
};

/**
 * Section 9.7 item 3. The video player, forwarding its ref to the underlying
 * <video> element so the parent can seek (`currentTime`) and `play()` when a
 * timeline marker or card is clicked. Supports range requests via the backend.
 */
export const SessionVideo = forwardRef<HTMLVideoElement, SessionVideoProps>(
  function SessionVideo({ src, onDuration }, ref) {
    return (
      <video
        ref={ref}
        controls
        preload="metadata"
        playsInline
        src={src}
        onLoadedMetadata={(e) => {
          const duration = e.currentTarget.duration;
          if (Number.isFinite(duration)) {
            onDuration?.(duration);
          }
        }}
        className="w-full rounded-video bg-ink p-2 ring-1 ring-stone [&::-webkit-media-controls-panel]:rounded-b-[24px]"
      />
    );
  },
);
