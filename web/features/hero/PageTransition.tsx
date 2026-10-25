"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createDemoSession } from "@/lib/api";

export type CtaKind = "start" | "demo";

interface TransitionContextValue {
  /** True once a CTA has been pressed and the fade-out is running. */
  leaving: boolean;
  /** Error text if the demo session request failed. */
  error: string | null;
  /** Begin the fade-out and navigate. Ignored while a transition is running. */
  go: (kind: CtaKind) => void;
  /** True while a transition is in progress (used to disable CTAs). */
  busy: boolean;
}

const TransitionContext = createContext<TransitionContextValue | null>(null);

const FADE_MS = 320;

/**
 * Page-transition provider. Clicking a landing CTA fades a canvas-coloured
 * overlay to opaque, then routes. "Try a demo" starts createDemoSession() at
 * click time so its latency overlaps the fade.
 */
export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  const go = useCallback(
    (kind: CtaKind) => {
      if (running.current) return;
      running.current = true;
      setError(null);

      if (kind === "start") {
        setLeaving(true);
        window.setTimeout(() => {
          // Show the recording instructions first (landing → how-to-record →
          // upload), per the product flow.
          router.push("/how-to-record");
          // Release the guard so returning here (Back/bfcache) isn't stuck.
          running.current = false;
        }, FADE_MS);
        return;
      }

      // demo: fire the request now, fade, then route when both are ready.
      const demo = createDemoSession();
      setLeaving(true);
      const faded = new Promise<void>((resolve) =>
        window.setTimeout(resolve, FADE_MS),
      );
      Promise.all([demo, faded])
        .then(([{ session_id }]) => {
          router.push(`/results/${session_id}`);
          running.current = false;
        })
        .catch((err: unknown) => {
          running.current = false;
          setLeaving(false);
          setError(
            err instanceof Error
              ? err.message
              : "Couldn't start the demo session.",
          );
        });
    },
    [router],
  );

  // Clear the fade whenever the landing is (re)shown — including a Back/forward
  // bfcache restore, where React state can come back with `leaving` still true
  // and leave the opaque overlay covering the page (white screen that hangs).
  useEffect(() => {
    const reset = () => {
      running.current = false;
      setLeaving(false);
      setError(null);
    };
    reset();
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) reset();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const value = useMemo<TransitionContextValue>(
    () => ({ leaving, error, go, busy: leaving }),
    [leaving, error, go],
  );

  return (
    <TransitionContext.Provider value={value}>
      {children}
    </TransitionContext.Provider>
  );
}

export function usePageTransition(): TransitionContextValue {
  const ctx = useContext(TransitionContext);
  if (!ctx) {
    throw new Error("usePageTransition must be used within a TransitionProvider");
  }
  return ctx;
}

export { FADE_MS };
