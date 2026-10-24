"use client";

import Link from "next/link";

import { NahWordmark } from "@/components/brand/NahWordmark";
import { Button } from "@/components/ui/button";

/**
 * Nav Pill (style guide §09) — landing page only. The wordmark on the left and
 * a single CTA on the right. Floating paper pill, 2px ink, ~64px tall, pinned
 * near the top with the one float shadow.
 */
export function NavPill() {
  return (
    <nav className="sticky top-4 z-50 mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-6 rounded-pill border-2 border-ink bg-paper py-2 pr-2 pl-5 shadow-[var(--shadow-float)]">
      <Link href="/" aria-label="Na(h) home" className="shrink-0">
        <NahWordmark size={36} />
      </Link>
      <Button
        size="sm"
        className="h-11 rounded-pill px-5"
        render={<Link href="/how-to-record" />}
      >
        Open Na(h)
      </Button>
    </nav>
  );
}
