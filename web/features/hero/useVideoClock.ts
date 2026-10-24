"use client";

import { useEffect, useRef } from "react";

type VideoWithRVFC = HTMLVideoElement & {
  requestVideoFrameCallback?: (
    cb: (now: number, metadata: { mediaTime: number }) => void,
  ) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

/**
 * Drive per-frame work from a video's own clock (HERO_HANDOFF §8.4).
 *
 * Prefers `requestVideoFrameCallback` so overlay timing tracks the decoded
 * media time (robust to stalls, buffering and tab throttling), and falls back
 * to a `requestAnimationFrame` loop reading `currentTime` where rVFC is
 * unavailable. The callback must only write to refs — never setState per frame.
 *
 * `onFrame` is read through a ref so the loop never needs re-subscribing.
 */
export function useVideoClock(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onFrame: (mediaTime: number) => void,
  enabled = true,
): void {
  const cbRef = useRef(onFrame);
  useEffect(() => {
    cbRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    if (!enabled) return;
    const video = videoRef.current as VideoWithRVFC | null;
    if (!video) return;

    let stopped = false;
    let rvfcHandle = 0;
    let rafHandle = 0;

    if (typeof video.requestVideoFrameCallback === "function") {
      const tick = (_now: number, md: { mediaTime: number }) => {
        if (stopped) return;
        cbRef.current(md.mediaTime);
        rvfcHandle = video.requestVideoFrameCallback!(tick);
      };
      rvfcHandle = video.requestVideoFrameCallback(tick);
      return () => {
        stopped = true;
        video.cancelVideoFrameCallback?.(rvfcHandle);
      };
    }

    // Fallback: rAF reading currentTime.
    const loop = () => {
      if (stopped) return;
      cbRef.current(video.currentTime);
      rafHandle = requestAnimationFrame(loop);
    };
    rafHandle = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(rafHandle);
    };
  }, [videoRef, enabled]);
}
