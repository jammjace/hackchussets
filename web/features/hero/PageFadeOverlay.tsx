"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { FADE_MS, usePageTransition } from "./PageTransition";

/**
 * A canvas-coloured overlay that fades to opaque when a landing CTA is pressed,
 * then the router navigates (PageTransition). Portalled to the body so it
 * covers the whole viewport. Any demo-session error is surfaced on top.
 */
export function PageFadeOverlay() {
  const { leaving, error } = usePageTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-hidden={!leaving}
      className="pointer-events-none fixed inset-0 z-[100] flex items-end justify-center bg-canvas"
      style={{
        opacity: leaving ? 1 : 0,
        pointerEvents: leaving ? "auto" : "none",
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      {error && (
        <p
          className="pointer-events-auto mb-8 rounded-control bg-paper px-4 py-2 font-ui text-sm text-chilli shadow-[0_2px_10px_rgba(30,28,25,.16)]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>,
    document.body,
  );
}
