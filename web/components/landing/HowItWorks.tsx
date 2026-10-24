import Image from "next/image";

// HERO_HANDOFF §7.1: three steps, each with a 4:3 illustration at the top.
const STEPS = [
  {
    title: "Set up your pantry",
    detail: "Tell us the seasonings you cook with and their sodium per serving.",
    img: "/hero/empty-pantry.webp",
    pos: "50% 45%",
  },
  {
    title: "Record while you cook",
    detail: "Wear the glasses and cook the way you always do. Upload after.",
    img: "/hero/hero-side.webp",
    pos: "78% 40%",
  },
  {
    title: "See where the salt came from",
    detail: "Every addition, its sodium, and the dish against 2,300 mg.",
    img: "/hero/empty-cooks.webp",
    pos: "50% 45%",
  },
];

export function HowItWorks() {
  return (
    <section className="flex flex-col gap-6 pt-[clamp(64px,8vw,96px)]">
      <h2 className="font-display text-[clamp(36px,4vw,44px)] font-normal tracking-[-.02em]">
        How it works
      </h2>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className="flex flex-col overflow-hidden rounded-card bg-paper ring-1 ring-stone"
          >
            {/* Decorative art; the step text carries the meaning, so alt="". */}
            <div className="aspect-[4/3] overflow-hidden bg-[#F4EEE2]">
              <Image
                src={s.img}
                alt=""
                width={800}
                height={600}
                className="size-full object-cover"
                style={{ objectPosition: s.pos }}
              />
            </div>
            <div className="flex flex-col gap-2.5 p-6">
              <span className="font-ui text-[13px] font-semibold tracking-[.08em] text-ink-soft">
                STEP {i + 1}
              </span>
              <h3 className="font-display text-[28px] leading-[1.05] tracking-[-.02em]">
                {s.title}
              </h3>
              <p className="font-ui text-base leading-[1.45] text-ink-soft">
                {s.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
