"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

import { CharacterView } from "./CharacterView";
import { GlassesViewPanel } from "./GlassesViewPanel";
import { Sightline, type SightlineRefs } from "./Sightline";
import sideOverlay from "@/public/hero/hero-side-overlay.json";
import { SUMMARY } from "./sodiumTimeline";
import type { SideOverlay } from "./types";
import { usePageTransition } from "./PageTransition";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const SIDE = sideOverlay as SideOverlay;

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/**
 * The hero stage (HERO_HANDOFF §6): the glasses panel and centred copy on the
 * left, the cook character on the right, joined by a dashed sightline. Layout
 * is pure CSS (flex-wrap); the sightline geometry and camera point are updated
 * every animation frame (§8.3). Both sightline modes (side-by-side and
 * stacked) are handled by reading the live rects.
 */
export function HeroStage() {
  const transition = usePageTransition();
  const reduced = usePrefersReducedMotion();

  const stageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLVideoElement>(null); // the POV video element
  const characterRef = useRef<HTMLDivElement>(null);
  const sideVideoRef = useRef<HTMLVideoElement>(null);
  const sightRef = useRef<SightlineRefs>(null);

  // Start the side (character) video unless reduced motion is on.
  useEffect(() => {
    const v = sideVideoRef.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    if (!reduced) v.play().catch(() => {});
  }, [reduced]);

  // Sightline geometry + camera point, every frame (§8.3). This handles
  // resize, scroll, font load and wrap changes with no observers.
  useEffect(() => {
    let raf = 0;
    const run = () => {
      raf = requestAnimationFrame(run);
      const stage = stageRef.current;
      const panelVideo = panelRef.current;
      const character = characterRef.current;
      const sight = sightRef.current;
      if (!stage || !panelVideo || !character || !sight?.border || !sight.line) {
        return;
      }
      // The panel is the video's parent (the rounded 16:9 box).
      const panelEl = panelVideo.parentElement;
      if (!panelEl) return;

      const S = stage.getBoundingClientRect();
      const P = panelEl.getBoundingClientRect();
      const B = character.getBoundingClientRect();

      const bx = P.left - S.left - 8;
      const by = P.top - S.top - 8;
      const bw = P.width + 16;
      const bh = P.height + 16;
      const border = sight.border;
      border.setAttribute("x", String(bx));
      border.setAttribute("y", String(by));
      border.setAttribute("width", String(bw));
      border.setAttribute("height", String(bh));

      const pf = SIDE.per_frame;
      const sv = sideVideoRef.current;
      const cam =
        pf && sv
          ? pf[Math.round(sv.currentTime * 24) % pf.length].camera
          : { x: 72.61, y: 26.16 };

      // Map the camera %-point through object-fit:cover + object-position 88% 100%.
      const s = Math.max(B.width / 1280, B.height / 720);
      const vw = 1280 * s;
      const vh = 720 * s;
      const camX = B.left - S.left + (B.width - vw) * 0.88 + ((cam.x + 1.25) / 100) * vw;
      const camY = B.top - S.top + (B.height - vh) * 1.0 + (cam.y / 100) * vh;

      const stacked = B.top >= P.bottom - 4;
      const line = sight.line;
      let x1: number, y1: number, x2: number, y2: number;
      if (stacked) {
        x1 = camX;
        y1 = camY - 6;
        x2 = clamp(camX, bx + 30, bx + bw - 30);
        y2 = by + bh;
      } else {
        x1 = camX - 6;
        y1 = camY;
        x2 = bx + bw;
        y2 = clamp(camY, by + 30, by + bh - 30);
      }
      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(x2));
      line.setAttribute("y2", String(y2));
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={stageRef} className="relative flex flex-wrap items-stretch p-2">
      <Sightline ref={sightRef} />

      <div className="flex min-w-[min(100%,440px)] flex-[1_1_54%] flex-col justify-center gap-[clamp(22px,2.6vw,32px)]">
        <GlassesViewPanel povRef={panelRef} />

        {/* Centred copy + CTAs (§6.2). Copy is exact; no em dashes. */}
        <div className="flex flex-col items-center gap-2.5 px-1 text-center">
          <p className="m-0 font-display text-[clamp(26px,2.8vw,38px)] leading-[1.08] tracking-[-.01em] text-ink [text-wrap:balance]">
            Cook like you always do.{" "}
            <em className="italic">We&apos;ll count the salt.</em>
          </p>
          <p className="m-0 max-w-[600px] font-ui text-[clamp(15px,1.3vw,17px)] leading-[1.45] text-ink-soft [text-wrap:pretty]">
            Wear the glasses and cook. Afterwards, upload the video. Na(h) finds
            every seasoning and adds up the sodium against the 2,300 mg daily
            limit.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
            <Button
              size="sm"
              onClick={() => transition.go("start")}
              disabled={transition.busy}
            >
              Start cooking
            </Button>
            <Button size="sm" variant="outline" render={<Link href="/pantry" />}>
              Set up your pantry
            </Button>
            <Button
              size="sm"
              variant="link"
              onClick={() => transition.go("demo")}
              disabled={transition.busy}
            >
              Try a demo
            </Button>
          </div>
        </div>
      </div>

      <CharacterView ref={characterRef} videoRef={sideVideoRef} />

      <p className="sr-only">{SUMMARY}</p>
    </div>
  );
}
