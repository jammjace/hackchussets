"use client";

import { forwardRef } from "react";

export interface ItemTagRefs {
  root: HTMLDivElement | null;
  name: HTMLSpanElement | null;
  amount: HTMLSpanElement | null;
  mg: HTMLSpanElement | null;
}

/**
 * The floating ingredient tag: "Name · amount · +mg mg" (HERO_HANDOFF §6.3).
 * Its left/top (in px), opacity, transform, text content and the +mg colour
 * are all set per frame by the panel's frame loop. Sizes use container query
 * units (cqw) so the tag scales with the panel width.
 *
 * Exposes the four DOM nodes the frame loop writes to via an imperative ref.
 */
export const ItemTag = forwardRef<ItemTagRefs>(function ItemTag(_, ref) {
  const assign = (node: HTMLDivElement | null) => {
    const refs: ItemTagRefs = {
      root: node,
      name: node?.querySelector<HTMLSpanElement>("[data-tag='name']") ?? null,
      amount: node?.querySelector<HTMLSpanElement>("[data-tag='amount']") ?? null,
      mg: node?.querySelector<HTMLSpanElement>("[data-tag='mg']") ?? null,
    };
    if (typeof ref === "function") ref(refs);
    else if (ref) ref.current = refs;
  };

  return (
    <div
      ref={assign}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 flex items-baseline gap-[clamp(6px,1.1cqw,10px)] whitespace-nowrap rounded-[14px] bg-paper px-[clamp(10px,1.9cqw,16px)] py-[clamp(6px,1.1cqw,10px)] opacity-0 shadow-[0_2px_10px_rgba(30,28,25,.16)] transition-[opacity,transform] duration-[250ms] [transform:translateY(6px)_scale(.92)]"
    >
      <span
        data-tag="name"
        className="font-ui font-semibold text-ink"
        style={{ fontSize: "clamp(14px,2.8cqw,21px)" }}
      >
        Bouillon cube
      </span>
      <span className="text-[#6B665C]" style={{ fontSize: "clamp(13px,2.4cqw,18px)" }}>
        ·
      </span>
      <span
        data-tag="amount"
        className="text-[#5B564D]"
        style={{ fontSize: "clamp(13px,2.4cqw,18px)" }}
      >
        1 cube
      </span>
      <span className="text-[#6B665C]" style={{ fontSize: "clamp(13px,2.4cqw,18px)" }}>
        ·
      </span>
      <span
        data-tag="mg"
        className="font-ui font-bold text-forest tabular-nums"
        style={{ fontSize: "clamp(14px,3cqw,22px)" }}
      >
        +2,080 mg
      </span>
    </div>
  );
});
