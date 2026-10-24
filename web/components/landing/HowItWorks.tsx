import { Camera, ListChecks, Soup } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

// Section 9.1 "How it works" — three steps.
const STEPS = [
  {
    icon: ListChecks,
    title: "Set up your pantry",
    detail: "Tell us the seasonings you cook with and their sodium per serving.",
  },
  {
    icon: Camera,
    title: "Record while you cook",
    detail: "Wear the glasses and cook the way you always do. Upload after.",
  },
  {
    icon: Soup,
    title: "See where the salt came from",
    detail: "Every addition, its sodium, and the dish against 2,300 mg.",
  },
];

export function HowItWorks() {
  return (
    <section className="space-y-6">
      <h2 className="font-display text-4xl font-normal tracking-tight">
        How it works
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <Card key={step.title}>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-pill border-2 border-ink bg-lavender">
                    <Icon className="size-5 text-ink" aria-hidden />
                  </span>
                  <span className="font-ui text-sm font-semibold tracking-[0.08em] text-ink-soft uppercase">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="font-display text-2xl font-normal tracking-tight">
                  {step.title}
                </h3>
                <p className="font-ui text-ink-soft">{step.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
