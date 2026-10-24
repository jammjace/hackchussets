"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getSnapshot = (): boolean => window.matchMedia(QUERY).matches;

// Server render (and the first client paint) assume motion is allowed; the
// store syncs to the real setting immediately on hydration.
const getServerSnapshot = (): boolean => false;

/**
 * Tracks the user's `prefers-reduced-motion` setting (HERO_HANDOFF §10),
 * subscribing through useSyncExternalStore so there is no setState-in-effect.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
