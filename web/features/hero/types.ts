// Shared types for the Na(h) landing hero (HERO_HANDOFF §8.1).

export type EventKey = "cube" | "packet" | "soy";

export interface HeroEvent {
  key: EventKey;
  name: string;
  amount: string;
  sodiumMg: number;
  /** Media time (seconds) at which this item's tag + running total step in. */
  stepAt: number;
}

/** Per-frame item boxes for the glasses POV panel (hero-pov-sequence-tracks.json). */
export interface Tracks {
  fps: number;
  clips: Record<EventKey, { start_frame: number; frames: number }>;
  boxes_px: Record<EventKey, [number, number, number, number][]>;
}

/** Per-frame glasses camera point for the sightline / zoom origin (hero-side-overlay.json). */
export interface SideOverlay {
  per_frame: { f: number; camera: { x: number; y: number } }[];
  camera_avg_pct: { x: number; y: number };
}

/** Result of resolving the active tracked item at a given media time. */
export interface ActiveItem {
  event: HeroEvent;
  /** Box in % of the panel (left, top, width, height), already 8px-padded. */
  box: { left: number; top: number; width: number; height: number };
  /** Whether this item's tag should be showing (t >= stepAt). */
  tagOn: boolean;
}
