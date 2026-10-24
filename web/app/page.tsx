"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { HeroArt } from "@/components/landing/HeroArt";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { NavPill } from "@/components/landing/NavPill";
import { WhoItsFor } from "@/components/landing/WhoItsFor";
import { Button } from "@/components/ui/button";
import { createDemoSession, getHealth } from "@/lib/api";

type Status =
  | { state: "loading" }
  | { state: "connected" }
  | { state: "error"; message: string };

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ state: "loading" });
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getHealth()
      .then(() => {
        if (active) setStatus({ state: "connected" });
      })
      .catch((err: unknown) => {
        if (active)
          setStatus({
            state: "error",
            message:
              err instanceof Error
                ? err.message
                : "Unknown error contacting the backend.",
          });
      });
    return () => {
      active = false;
    };
  }, []);

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
    <div className="flex-1 px-4 sm:px-6">
      <NavPill />

      <main className="mx-auto w-full max-w-5xl space-y-20 py-12 sm:py-16">
        {/* Hero */}
        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <h1 className="font-display text-6xl leading-[0.95] font-normal tracking-tight sm:text-7xl">
              Cook like you always do.{" "}
              <em className="italic">We&apos;ll count the salt.</em>
            </h1>
            <p className="max-w-xl font-ui text-lg text-ink-soft">
              Say nah to hidden sodium. Wear the glasses, cook, then upload the
              video — Na(h) finds every seasoning and adds up the sodium against
              the 2,300 mg daily limit.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button render={<Link href="/how-to-record" />}>
                Start cooking
              </Button>
              <Button variant="outline" render={<Link href="/pantry" />}>
                Set up your pantry
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="link" onClick={startDemo} disabled={demoBusy}>
                {demoBusy ? "Starting demo…" : "Try a demo"}
              </Button>
              {demoError && <span className="text-sm text-chilli">{demoError}</span>}
            </div>
          </div>

          <HeroArt />
        </section>

        <HowItWorks />
        <WhoItsFor />
        <LandingFooter />

        {/* Backend status — quiet line so you can see the API is reachable */}
        <p className="font-ui text-sm text-ink-soft">
          {status.state === "loading" && "Checking the backend…"}
          {status.state === "connected" && (
            <span className="text-forest">Backend connected</span>
          )}
          {status.state === "error" && (
            <span className="text-chilli">
              Backend not reachable — {status.message}
            </span>
          )}
        </p>
      </main>
    </div>
  );
}
