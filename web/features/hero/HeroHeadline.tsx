import { NahTileInline } from "@/components/brand/NahTileInline";

/**
 * The hero headline (HERO_HANDOFF §5): "Say [Na tile](h) to [hidden sodium.]",
 * centred, with the inline element tile and a dashed detection box around
 * "hidden sodium." Uses flex-wrap with nowrap chunks so "hidden sodium." never
 * splits inside its box and nothing overlaps the stage below. The chilli on
 * "(h)" is the wordmark's decorative chilli (the only chilli in the headline).
 */
export function HeroHeadline() {
  return (
    <div className="flex justify-center text-center">
      <h1
        aria-label="Say Na(h) to hidden sodium."
        className="m-0 flex max-w-[1100px] flex-wrap items-center justify-center gap-x-[.25em] gap-y-[.1em] font-display text-[clamp(40px,min(6.4vw,9.5vh),96px)] font-normal leading-[1.02] tracking-[-.03em]"
      >
        <span>Say</span>
        <span className="inline-flex items-center whitespace-nowrap">
          <NahTileInline />
          <em className="relative -top-[.18em] ml-[.04em] italic text-chilli">
            (h)
          </em>
        </span>
        <span>to</span>
        <span
          className="inline-block whitespace-nowrap rounded-[.18em] border-dashed border-[rgba(30,28,25,.7)] px-[.12em] pb-[.04em] italic"
          style={{ borderWidth: "max(2px,.022em)" }}
        >
          hidden sodium.
        </span>
      </h1>
    </div>
  );
}
