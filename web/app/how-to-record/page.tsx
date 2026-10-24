"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { NahWordmark } from "@/components/brand/NahWordmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createDemoSession } from "@/lib/api";
import {
  Camera,
  Check,
  Ruler,
  Upload,
  Utensils,
  X,
} from "lucide-react";

// Section 9.2. The recording steps, rendered with the Na(h) Step List style
// (done = forest circle + check; current = 2px ink circle with number;
// upcoming = stone circle). These are instructions, so none are "done" yet —
// step 1 is the current step and the rest are upcoming.
const STEPS: { title: string; detail: string; icon: React.ReactNode }[] = [
  {
    title: "Mount the camera on your head or overhead",
    detail: "Point it at the pot so the cooking surface stays in frame.",
    icon: <Camera className="size-5" aria-hidden />,
  },
  {
    title: "Keep your seasonings and measuring spoons in view",
    detail: "We can only count what the camera can see.",
    icon: <Utensils className="size-5" aria-hidden />,
  },
  {
    title: "Measure with spoons, or add whole cubes and packets",
    detail: "Unmeasured pours aren't counted, so measure what you can.",
    icon: <Ruler className="size-5" aria-hidden />,
  },
  {
    title: "Stop recording and move the video to this laptop",
    detail: "Then upload it here — nothing is processed live.",
    icon: <Upload className="size-5" aria-hidden />,
  },
];

const COUNTED = [
  "Spoon measures (teaspoon, tablespoon)",
  "Whole bouillon cubes",
  "Whole seasoning packets",
];

const NOT_COUNTED = [
  "Splashes straight from the bottle",
  "Free pours and glugs",
  "Pinches by hand",
];

export default function HowToRecord() {
  const router = useRouter();
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  async function startDemo() {
    setDemoBusy(true);
    setDemoError(null);
    try {
      const { session_id } = await createDemoSession();
      router.push(`/results/${session_id}`);
    } catch (err: unknown) {
      setDemoBusy(false);
      setDemoError(
        err instanceof Error ? err.message : "Couldn't start the demo session.",
      );
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 p-4 sm:p-6">
      <div className="space-y-4">
        <NahWordmark size={48} />
        <h1 className="font-display text-5xl leading-none font-normal tracking-tight sm:text-6xl">
          Record your <em className="italic">cook.</em>
        </h1>
        <p className="max-w-xl font-ui text-lg text-ink-soft">
          Wear the glasses, cook the way you always do, then upload the clip.
          Here&apos;s how to get a count we can trust.
        </p>
      </div>

      {/* Step List (Na(h) style guide §09) */}
      <Card>
        <CardContent>
          <ol className="flex flex-col">
            {STEPS.map((step, i) => {
              const isLast = i === STEPS.length - 1;
              const current = i === 0;
              return (
                <li key={step.title} className="flex gap-4">
                  {/* Rail: numbered circle + connector line */}
                  <div className="flex flex-col items-center self-stretch">
                    <span
                      className={[
                        "flex size-9 shrink-0 items-center justify-center rounded-full font-ui text-sm font-semibold",
                        current
                          ? "border-2 border-ink bg-paper text-ink"
                          : "border-2 border-stone bg-paper text-ink-soft",
                      ].join(" ")}
                    >
                      {i + 1}
                    </span>
                    {!isLast && (
                      <span className="w-0.5 flex-1 bg-stone" aria-hidden />
                    )}
                  </div>

                  {/* Step body */}
                  <div className={isLast ? "pt-1" : "pt-1 pb-6"}>
                    <div className="flex items-center gap-2">
                      <span className="text-ink">{step.icon}</span>
                      <span className="font-ui text-base font-semibold text-ink">
                        {step.title}
                      </span>
                    </div>
                    <p className="mt-1 font-ui text-sm text-ink-soft">
                      {step.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {/* What counts */}
      <Card>
        <CardContent className="space-y-4">
          <h2 className="font-display text-2xl font-normal tracking-tight">
            What counts
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="flex items-center gap-2 font-ui text-sm font-semibold tracking-[0.08em] text-forest uppercase">
                <Check className="size-4" aria-hidden />
                Counted
              </p>
              <ul className="space-y-2">
                {COUNTED.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 font-ui text-ink"
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-forest"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <p className="flex items-center gap-2 font-ui text-sm font-semibold tracking-[0.08em] text-ink-soft uppercase">
                <X className="size-4" aria-hidden />
                Not counted
              </p>
              <ul className="space-y-2">
                {NOT_COUNTED.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 font-ui text-ink-soft"
                  >
                    <X className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button render={<Link href="/upload" />}>
            <Upload aria-hidden />
            I&apos;ve recorded, upload my video
          </Button>
          <Button variant="outline" render={<Link href="/pantry" />}>
            Check my pantry first
          </Button>
        </div>
        <div>
          <Button variant="link" onClick={startDemo} disabled={demoBusy}>
            {demoBusy ? "Starting demo…" : "No video? Try the demo"}
          </Button>
          {demoError && <p className="mt-1 text-sm text-chilli">{demoError}</p>}
        </div>
      </div>
    </main>
  );
}
