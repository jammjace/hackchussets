"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BackButtonProps {
  /**
   * Explicit destination for the back button. When set, the button is a link
   * to this route (predictable within the app flow). When omitted, it falls
   * back to the browser's history (`router.back()`).
   */
  href?: string;
  /** Visible + accessible label. Defaults to "Back". */
  label?: string;
  className?: string;
}

/**
 * A small, consistent "Back" control for every non-landing page. Prefer giving
 * an explicit `href` so the destination is predictable even when the page was
 * opened directly (empty history); without one it uses `router.back()`.
 */
export function BackButton({ href, label = "Back", className }: BackButtonProps) {
  const router = useRouter();

  if (href) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className={className}
        render={<Link href={href} />}
      >
        <ChevronLeft aria-hidden />
        {label}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className={className}
      onClick={() => router.back()}
    >
      <ChevronLeft aria-hidden />
      {label}
    </Button>
  );
}
