"use client";

import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { NavPill } from "@/components/landing/NavPill";
import { WhoItsFor } from "@/components/landing/WhoItsFor";
import { PageFadeOverlay } from "@/features/hero/PageFadeOverlay";
import { TransitionProvider } from "@/features/hero/PageTransition";
import { HeroHeadline } from "@/features/hero/HeroHeadline";
import { HeroStage } from "@/features/hero/HeroStage";

export default function Home() {
  return (
    <TransitionProvider>
      <div className="flex-1 px-4 pt-4 sm:px-6 lg:px-12">
        <NavPill />
        <main className="mx-auto w-full max-w-[1184px]">
          <section className="flex flex-col gap-[clamp(14px,3vh,36px)] pt-[clamp(8px,2.2vh,28px)]">
            <HeroHeadline />
            <HeroStage />
          </section>
          <HowItWorks />
          <WhoItsFor />
          <LandingFooter />
        </main>
      </div>
      <PageFadeOverlay />
    </TransitionProvider>
  );
}
