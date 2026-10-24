"use client";

import * as React from "react";
import { cn } from "cn";

/**
 * Fade + rise entrance (Na(h) motion: reveals fade in and rise ~14px, ease-out).
 * When `show` is false the content is hidden; when it becomes true it animates
 * in. Honours reduced motion through the token-driven duration/translate in
 * globals.css (which collapse the rise and shorten the fade).
 */
export function Reveal({
  show,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { show: boolean }) {
  return (
    <div
      data-revealed={show}
      className={cn(
        "transition-all ease-[var(--ease-out)] [transition-duration:var(--duration-reveal)] motion-reduce:transition-opacity",
        show
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-[var(--reveal-y)] opacity-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
