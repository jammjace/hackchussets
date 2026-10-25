"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useVideoFile } from "@/components/upload/video-file-context";
import { createSession } from "@/lib/api";

const STEPS = [
  "Extracting frames",
  "Detecting seasonings",
  "Matching your pantry",
  "Calculating sodium",
] as const;

const MIN_STEP_MS = 800;
const PUBLIC_DEMO =
  process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === "public_demo";

type Phase =
  | { state: "working" }
  | { state: "error"; message: string };

export default function ProcessingPage() {
  const router = useRouter();
  const { file, clearFile } = useVideoFile();

  const [activeStep, setActiveStep] = useState(0);
  const [phase, setPhase] = useState<Phase>({ state: "working" });
  // Bumped to force a fresh run when the user retries.
  const [attempt, setAttempt] = useState(0);
  const startedRef = useRef(false);

  // No file held: go back to upload. (Guard the effect so it only fires once.)
  useEffect(() => {
    if (!file && !startedRef.current) {
      router.replace("/upload");
    }
  }, [file, router]);

  useEffect(() => {
    if (!file) return;
    startedRef.current = true;

    let cancelled = false;
    setPhase({ state: "working" });
    setActiveStep(0);

    // Visual step ticker: each step is on screen for at least MIN_STEP_MS.
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < STEPS.length; i++) {
      timers.push(
        setTimeout(() => {
          if (!cancelled) setActiveStep(i);
        }, MIN_STEP_MS * i),
      );
    }

    // Minimum time all four steps are visible before we may navigate.
    const minVisible = new Promise<void>((resolve) =>
      setTimeout(resolve, MIN_STEP_MS * STEPS.length),
    );

    (async () => {
      try {
        const [{ session_id }] = await Promise.all([
          createSession(file),
          minVisible,
        ]);
        if (cancelled) return;
        clearFile();
        router.replace(`/results/${session_id}`);
      } catch (err: unknown) {
        if (cancelled) return;
        setPhase({
          state: "error",
          message:
            err instanceof Error
              ? err.message
              : "Something went wrong while analysing your video.",
        });
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // Re-run when the user retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, attempt]);

  // While redirecting away because there's no file, show a neutral message
  // rather than a blank screen.
  if (!file) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">Taking you back to upload…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center p-4 sm:p-6">
      <Card className="w-full">
        <CardContent className="space-y-6">
          {phase.state === "working" ? (
            <>
              <div className="space-y-1 text-center">
                <h1 className="font-heading text-2xl font-normal">
                  Analysing your video
                </h1>
                <p className="text-sm text-muted-foreground">
                  {PUBLIC_DEMO
                    ? "Loading reviewed prerecorded AI results. This video is not being analysed."
                    : "This can take a minute or two for a longer clip."}
                </p>
              </div>

              <ol className="space-y-3">
                {STEPS.map((label, i) => {
                  const done = i < activeStep;
                  const current = i === activeStep;
                  return (
                    <li key={label} className="flex items-center gap-3">
                      <span
                        className={[
                          "flex size-6 shrink-0 items-center justify-center rounded-full",
                          done
                            ? "bg-forest text-canvas"
                            : current
                              ? "border-2 border-ink text-ink"
                              : "bg-stone text-ink-soft",
                        ].join(" ")}
                      >
                        {done ? (
                          <Check className="size-4" aria-hidden />
                        ) : current ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <span className="text-xs">{i + 1}</span>
                        )}
                      </span>
                      <span
                        className={
                          done || current
                            ? "font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : (
            <div className="space-y-4 text-center">
              <div className="space-y-1">
                <h1 className="font-heading text-2xl font-normal">
                  We couldn&apos;t analyse that video
                </h1>
                <p className="text-sm text-muted-foreground">{phase.message}</p>
              </div>
              <div className="flex justify-center gap-3">
                <Button onClick={() => setAttempt((n) => n + 1)}>
                  Try again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.replace("/upload")}
                >
                  Back to upload
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
