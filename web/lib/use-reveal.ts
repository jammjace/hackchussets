"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Track the user's prefers-reduced-motion setting. When true, the results
 * reveal should skip the staged animation and show everything at once with
 * final values (Na(h) motion rules).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

export type RevealPhase = "idle" | "timeline" | "total" | "done";

type RevealState = {
  /** How many timeline rows are currently visible. */
  revealCount: number;
  /** Current stage of the reveal. */
  phase: RevealPhase;
};

type RevealOptions = {
  /** Total number of timeline rows to reveal. */
  rowCount: number;
  /** Whether the reveal should run at all (results are ready). */
  active: boolean;
  /** Skip the animation and show the final state immediately. */
  reduced: boolean;
  /** Milliseconds between each revealed row. */
  rowInterval?: number;
  /** Milliseconds the total count-up runs before the rest fades in. */
  totalDuration?: number;
};

/**
 * Drive the staged results reveal: reveal timeline rows one at a time, then
 * run the total count-up, then show the rest of the analysis. With reduced
 * motion (or no rows) it jumps straight to the finished state.
 */
export function useRevealSequence({
  rowCount,
  active,
  reduced,
  rowInterval = 650,
  totalDuration = 900,
}: RevealOptions): RevealState {
  const [state, setState] = useState<RevealState>({
    revealCount: 0,
    phase: "idle",
  });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Clear any timers from a previous run.
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];

    if (!active) {
      setState({ revealCount: 0, phase: "idle" });
      return;
    }

    // Reduced motion, or nothing to stagger: show the finished state at once.
    if (reduced || rowCount === 0) {
      setState({ revealCount: rowCount, phase: "done" });
      return;
    }

    setState({ revealCount: 0, phase: "timeline" });

    // Reveal each row on its own tick.
    for (let i = 1; i <= rowCount; i++) {
      timers.current.push(
        setTimeout(() => {
          setState((prev) => ({ ...prev, revealCount: i }));
        }, i * rowInterval),
      );
    }

    // After the last row, switch to the total count-up.
    const afterRows = rowCount * rowInterval + 200;
    timers.current.push(
      setTimeout(() => {
        setState((prev) => ({ ...prev, phase: "total" }));
      }, afterRows),
    );

    // After the count-up, reveal the rest of the analysis.
    timers.current.push(
      setTimeout(() => {
        setState((prev) => ({ ...prev, phase: "done" }));
      }, afterRows + totalDuration),
    );

    return () => {
      for (const t of timers.current) clearTimeout(t);
      timers.current = [];
    };
  }, [rowCount, active, reduced, rowInterval, totalDuration]);

  return state;
}

type JourneyOptions = {
  /** Whether the journey should run (results are ready). */
  active: boolean;
  /** Skip the travel and jump to the end (reduced motion). */
  reduced: boolean;
  /** Event timestamps in seconds, sorted ascending. */
  timestamps: number[];
  /** Full track length in seconds (video duration or last ts + tail). */
  duration: number;
  /** When set, the playhead follows this video element's currentTime. */
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  /** True when a real video backs the session. */
  hasVideo: boolean;
  /** Self-drive pacing: ms spent travelling between consecutive events. */
  segmentMs?: number;
};

type JourneyState = {
  /** Playhead position along the track, 0 → 1. */
  progress: number;
  /** True once the journey has reached the end. */
  complete: boolean;
};

/**
 * Drive the cooking-journey playhead (0 → 1 along the track).
 *
 * - Reduced motion: jump to 1 immediately (static spine, all cards shown).
 * - With a video: follow `video.currentTime / duration` each frame, so the
 *   playhead tracks play, pause and scrubbing. Marked complete when it reaches
 *   the last event's timestamp (or the video ends).
 * - Without a video (demo): self-drive, travelling event-to-event at a fixed
 *   pace so pops are evenly spaced regardless of the real time gaps.
 */
export function useJourneyProgress({
  active,
  reduced,
  timestamps,
  duration,
  videoRef,
  hasVideo,
  segmentMs = 1400,
}: JourneyOptions): JourneyState {
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const frame = useRef<number | null>(null);

  const safeDuration = duration > 0 ? duration : 1;
  const lastTs = timestamps.length ? timestamps[timestamps.length - 1] : 0;
  // Stable key so the effect only restarts when the shape really changes.
  const tsKey = timestamps.join(",");

  useEffect(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }

    if (!active) {
      setProgress(0);
      setComplete(false);
      return;
    }

    if (reduced || timestamps.length === 0) {
      setProgress(1);
      setComplete(true);
      return;
    }

    setProgress(0);
    setComplete(false);

    // Complete a touch past the last event so its card has popped in.
    const completeAt = Math.min(1, (lastTs + 0.3) / safeDuration);

    if (hasVideo && videoRef) {
      // Video-synced: read currentTime every frame.
      const tick = () => {
        const video = videoRef.current;
        if (video && Number.isFinite(video.currentTime)) {
          const p = Math.max(0, Math.min(1, video.currentTime / safeDuration));
          setProgress(p);
          if (p >= completeAt) setComplete(true);
        }
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
      return () => {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
      };
    }

    // Self-driving demo clock: walk event to event at a fixed pace.
    const start = performance.now();
    const totalMs = timestamps.length * segmentMs;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / totalMs);
      // Map linear t across segments onto the real timestamps so the playhead
      // stops at each event evenly spaced in time.
      const scaled = t * timestamps.length; // 0 → n
      const idx = Math.min(timestamps.length - 1, Math.floor(scaled));
      const frac = scaled - idx;
      const from = idx === 0 ? 0 : timestamps[idx - 1];
      const to = timestamps[idx];
      const seconds = from + (to - from) * frac;
      const p = Math.max(0, Math.min(1, seconds / safeDuration));
      setProgress(p);
      if (t >= 1) {
        setProgress(completeAt);
        setComplete(true);
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduced, tsKey, safeDuration, hasVideo, segmentMs]);

  return { progress, complete };
}

/**
 * Animate a number from 0 to `target` over `duration` ms when `run` is true.
 * When `run` is false the hook returns the target immediately (no animation),
 * which also covers reduced motion. Uses requestAnimationFrame with an
 * ease-out curve to match the Na(h) count-up feel.
 */
export function useCountUp(
  target: number,
  run: boolean,
  duration = 900,
): number {
  const [value, setValue] = useState(run ? 0 : target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!run) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, run, duration]);

  return value;
}
