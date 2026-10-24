/**
 * NahTileInline — the em-scaled element tile for the hero headline
 * (HERO_HANDOFF §5). Everything is sized in `em` so the tile scales with the
 * surrounding h1. It is decorative: the h1 carries an `aria-label`, and this
 * element is `aria-hidden` so screen readers don't read "11 Na 22.99".
 */
export function NahTileInline() {
  return (
    <span
      aria-hidden
      className="relative inline-flex size-[1.08em] items-center justify-center rounded-[.2em] bg-paper tracking-[-.02em]"
      style={{ border: "max(2px,.028em) solid #1E1C19", boxShadow: "0 .06em 0 #1E1C19" }}
    >
      <span
        className="absolute left-[.12em] top-[.1em] font-ui font-semibold tracking-[.04em]"
        style={{ fontSize: ".12em" }}
      >
        11
      </span>
      <span className="mt-[.06em] leading-none" style={{ fontSize: ".62em" }}>
        Na
      </span>
      <span
        className="absolute inset-x-0 bottom-[.09em] text-center font-ui font-semibold tracking-[.04em]"
        style={{ fontSize: ".1em" }}
      >
        22.99
      </span>
    </span>
  );
}
