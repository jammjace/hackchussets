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
