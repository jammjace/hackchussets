"use client";

import Link from "next/link";

import { NahWordmark } from "@/components/brand/NahWordmark";
import { usePageTransition } from "@/features/hero/PageTransition";

/**
 * Landing nav (HERO_HANDOFF §4): no pill container. A sticky, transparent flex
 * row with the bare wordmark on the left and a lavender "Start cooking" pill on
 * the right. The empty middle lets clicks pass through to the page. The nav CTA
 * behaves identically to the hero's "Start cooking" (fades out, then routes).
 */
export function NavPill() {
  const transition = usePageTransition();

  return (
    <nav className="pointer-events-none sticky top-4 z-50 mx-auto flex w-full max-w-[1184px] items-center justify-between gap-4">
      <Link href="/" aria-label="Na(h) home" className="pointer-events-auto">
        <NahWordmark size={52} />
      </Link>
      <button
        type="button"
        onClick={() => transition.go("start")}
        disabled={transition.busy}
        className="pointer-events-auto h-14 rounded-pill border-2 border-ink bg-lavender px-6 font-ui text-[15px] font-semibold text-ink shadow-[var(--shadow-float)] transition-[transform,background] duration-[var(--duration-hover)] hover:-translate-y-0.5 hover:bg-lavender-hover focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-forest disabled:pointer-events-none disabled:opacity-70"
      >
        Start cooking
      </button>
    </nav>
  );
}
