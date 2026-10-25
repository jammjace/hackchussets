"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FinalTotalCard } from "./FinalTotalCard";
import { ItemTag, type ItemTagRefs } from "./ItemTag";
import { RunningTotalChip, type RunningTotalChipRefs } from "./RunningTotalChip";
import { TrackedBox } from "./TrackedBox";
import {
  activeAt,
  BAR_MAX_MG,
  CARD_AT,
  DAILY_LIMIT_MG,
  fmt,
  totalAt,
} from "./sodiumTimeline";
import tracksJson from "@/public/hero/hero-pov-sequence-tracks.json";
import type { Tracks } from "./types";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { useVideoClock } from "./useVideoClock";

// The JSON's box arrays widen to number[][]; assert the 4-tuple shape.
const TRACKS = tracksJson as unknown as Tracks;

const INK = "#1E1C19";
const FOREST = "#1F4A43";
const CHILLI = "#B4432F";
const MUTED = "#5B564D";

interface GlassesViewPanelProps {
  /** Forwarded so HeroStage can read camera frames in sync (not required). */
  povRef?: React.RefObject<HTMLVideoElement | null>;
}

/**
 * The glasses POV panel: a looping cooking video with live HTML overlays
 * (tracked box, item tag, running-total chip, final card) driven from the
 * video's own clock (HERO_HANDOFF §6.3, §8.2). Per-frame work writes only to
 * refs; React re-renders only for the pause button.
 */
export function GlassesViewPanel({ povRef }: GlassesViewPanelProps) {
  const reduced = usePrefersReducedMotion();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = povRef ?? localVideoRef;
  const panelRef = useRef<HTMLDivElement>(null);

  const boxRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<ItemTagRefs>(null);
  const chipRef = useRef<RunningTotalChipRefs>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Per-frame state kept in refs (never setState per frame).
  const shown = useRef(0);
  const lastT = useRef(0);
  const tagKey = useRef<string | null>(null);
  const tagOn = useRef(false);
  const cardOn = useRef(false);

  const [paused, setPaused] = useState(false);

  const update = useCallback(
    (t: number) => {
      const box = boxRef.current;
      const tag = tagRef.current;
      const chip = chipRef.current;
      const card = cardRef.current;
      const panel = panelRef.current;
      if (!box || !tag?.root || !chip?.root || !card || !panel) return;

      // Loop detected (backwards jump > 1s) -> reset the eased count.
      if (t < lastT.current - 1) shown.current = 0;
      lastT.current = t;

      const target = totalAt(t);
      shown.current = reduced
        ? target
        : shown.current + (target - shown.current) * 0.15;
      if (Math.abs(target - shown.current) < 1) shown.current = target;
      const over = shown.current > DAILY_LIMIT_MG;

      if (chip.num) {
        chip.num.textContent = fmt(shown.current);
        chip.num.style.color = over ? CHILLI : INK;
      }
      if (chip.fill) {
        chip.fill.style.width =
          Math.min(100, (shown.current / BAR_MAX_MG) * 100) + "%";
        chip.fill.style.background = over ? CHILLI : FOREST;
      }
      if (chip.pct) {
        chip.pct.textContent =
          Math.round((shown.current / DAILY_LIMIT_MG) * 100) + "% of daily limit";
        chip.pct.style.color = over ? CHILLI : MUTED;
      }

      const a = activeAt(t, TRACKS);
      box.style.opacity = a ? "1" : "0";
      if (a) {
        box.style.left = a.box.left + "%";
        box.style.top = a.box.top + "%";
        box.style.width = a.box.width + "%";
        box.style.height = a.box.height + "%";
      }

      const showTag = !!a?.tagOn;
      if (showTag && a) {
        if (tagKey.current !== a.event.key) {
          tagKey.current = a.event.key;
          if (tag.name) tag.name.textContent = a.event.name;
          if (tag.amount) tag.amount.textContent = a.event.amount;
          if (tag.mg) {
            tag.mg.textContent = `+${fmt(a.event.sodiumMg)} mg`;
            // Chilli once the running total including this item passes the limit.
            tag.mg.style.color = target > DAILY_LIMIT_MG ? CHILLI : FOREST;
          }
        }
        // Clamp the tag fully inside the panel; px for an exact clamp.
        const W = panel.clientWidth;
        const H = panel.clientHeight;
        const tw = tag.root.offsetWidth;
        const th = tag.root.offsetHeight;
        const m = 12;
        const cx = ((a.box.left + a.box.width / 2) / 100) * W;
        const left = Math.max(m, Math.min(W - m - tw, cx - tw / 2));
        let top = ((a.box.top + a.box.height) / 100) * H + 10;
        if (top + th > H - m) top = (a.box.top / 100) * H - 10 - th;
        top = Math.max(m, Math.min(H - m - th, top));
        tag.root.style.left = left + "px";
        tag.root.style.top = top + "px";
      }
      if (showTag !== tagOn.current) {
        tagOn.current = showTag;
        tag.root.style.opacity = showTag ? "1" : "0";
        tag.root.style.transform = showTag
          ? "none"
          : "translateY(6px) scale(.92)";
        if (!showTag) tagKey.current = null;
      }

      const showCard = t >= CARD_AT;
      if (showCard !== cardOn.current) {
        cardOn.current = showCard;
        card.style.opacity = showCard ? "1" : "0";
        card.style.transform = showCard
          ? "translate(-50%,-50%)"
          : "translate(-50%,-44%)";
        chip.root.style.opacity = showCard ? "0" : "1";
      }
    },
    [reduced],
  );

  // Autoplay must be started imperatively so reduced motion can opt out
  // (HERO_HANDOFF §6.3, §10). React's `muted` attribute is unreliable here.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    if (reduced) {
      const onMeta = () => {
        v.currentTime = 13.5; // show the final card frame
      };
      v.addEventListener("loadedmetadata", onMeta, { once: true });
      if (v.readyState >= 1) onMeta();
      setPaused(true);
      // Paint the final state once.
      requestAnimationFrame(() => update(13.5));
      return () => v.removeEventListener("loadedmetadata", onMeta);
    }
    v.play().catch(() => {});
  }, [reduced, videoRef, update]);

  // Drive overlays from the video clock (rVFC with rAF fallback). While
  // reduced motion is on and the video is paused, do a one-shot paint instead.
  useVideoClock(videoRef, update, !reduced || !paused);

  const togglePause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  };

  return (
    <div
      ref={panelRef}
      className="relative z-[2] mx-auto aspect-video w-full overflow-hidden rounded-[18px] bg-stone [container-type:inline-size]"
      // Keep the panel 16:9 and centred, but cap its height so the hero fits
      // the first screen on desktop. `min(100%, …)` means it never exceeds the
      // column, and `svh` + the 300px floor keep it from collapsing on mobile
      // (small-viewport height avoids the address-bar overshoot of `vh`).
      style={{
        maxWidth: "min(100%, max(300px, calc((100svh - 370px) * 1.778)))",
      }}
    >
      <video
        ref={videoRef}
        src="/hero/hero-pov-sequence.mp4"
        poster="/hero/hero-pov-sequence-poster.webp"
        muted
        playsInline
        loop
        preload="auto"
        aria-hidden
        className="absolute inset-0 size-full object-cover"
      />
      <TrackedBox ref={boxRef} />
      <ItemTag ref={tagRef} />
      <RunningTotalChip ref={chipRef} />
      <FinalTotalCard ref={cardRef} />

      <button
        type="button"
        onClick={togglePause}
        aria-label={paused ? "Play example video" : "Pause example video"}
        className="absolute flex h-9 items-center gap-1.5 rounded-pill bg-[rgba(255,253,247,.92)] px-3.5 font-ui text-[13px] font-semibold text-ink shadow-[0_2px_10px_rgba(30,28,25,.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        style={{
          right: "clamp(8px,1.6cqw,12px)",
          bottom: "clamp(8px,1.6cqw,12px)",
        }}
      >
        {paused ? "▶ Play" : "❚❚ Pause"}
      </button>
    </div>
  );
}
