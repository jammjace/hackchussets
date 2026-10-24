"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CumulativeChart } from "@/components/results/CumulativeChart";
import { IncompleteNotice } from "@/components/results/IncompleteNotice";
import { IngredientTimeline } from "@/components/results/IngredientTimeline";
import { SessionVideo } from "@/components/results/SessionVideo";
import { TotalCard } from "@/components/results/TotalCard";
import { ApiError, apiUrl, getResults } from "@/lib/api";
import type { Results, TimelineRow } from "@/lib/types";

type LoadState =
  | { state: "loading" }
  | { state: "ok"; results: Results }
  | { state: "not_found" }
  | { state: "error"; message: string };

export function ResultsView({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [load, setLoad] = useState<LoadState>({ state: "loading" });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchResults = useCallback(() => {
    setLoad({ state: "loading" });
    getResults(sessionId)
      .then((results) => setLoad({ state: "ok", results }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          setLoad({ state: "not_found" });
        } else {
          setLoad({
            state: "error",
            message:
              err instanceof Error
                ? err.message
                : "Something went wrong loading this session.",
          });
        }
      });
  }, [sessionId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const results = load.state === "ok" ? load.results : null;

  // Track length: video duration when known, else last timestamp + 10s.
  const trackDuration = useMemo(() => {
    if (videoDuration && videoDuration > 0) return videoDuration;
    if (!results || results.timeline.length === 0) return 1;
    const last = results.timeline[results.timeline.length - 1];
    return last.timestamp + 10;
  }, [videoDuration, results]);

  const handleSelect = useCallback((row: TimelineRow) => {
    setSelectedEventId(row.event_id);
    const video = videoRef.current;
    if (video) {
      video.currentTime = row.timestamp;
      void video.play().catch(() => {
        // Autoplay may be blocked; seeking still succeeded.
      });
      video.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-4 sm:p-6">
      {load.state === "loading" && <ResultsSkeleton />}

      {load.state === "not_found" && (
        <ErrorState
          title="We couldn't find that session"
          description="It may not have finished processing, or the link is wrong."
          action={
            <Button variant="outline" render={<Link href="/upload" />}>
              Back to upload
            </Button>
          }
        />
      )}

      {load.state === "error" && (
        <ErrorState
          title="Couldn't load this session"
          description={load.message}
          action={<Button onClick={fetchResults}>Try again</Button>}
        />
      )}

      {load.state === "ok" && results && (
        <>
          {/* 1. Total card */}
          <TotalCard
            totalSodiumMg={results.total_sodium_mg}
            dailyLimitMg={results.daily_limit_mg}
            percentOfDailyLimit={results.percent_of_daily_limit}
          />

          {/* 2. Incomplete notice */}
          {results.is_incomplete && (
            <IncompleteNotice warnings={results.warnings} />
          )}

          {/* 3. Video player (or placeholder when no video) */}
          {results.video_url ? (
            <SessionVideo
              ref={videoRef}
              src={apiUrl(results.video_url)}
              onDuration={setVideoDuration}
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
              No video for this session — timeline seeking is disabled.
            </div>
          )}

          {/* 4. Ingredient timeline */}
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-medium">
              Cooking timeline
            </h2>
            <IngredientTimeline
              timeline={results.timeline}
              duration={trackDuration}
              selectedEventId={selectedEventId}
              onSelect={handleSelect}
            />
          </section>

          {/* 5. Cumulative sodium chart */}
          {results.timeline.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-heading text-lg font-medium">
                Sodium over time
              </h2>
              <Card>
                <CardContent>
                  <CumulativeChart
                    timeline={results.timeline}
                    dailyLimitMg={results.daily_limit_mg}
                  />
                </CardContent>
              </Card>
            </section>
          )}

          {/* 7. Navigation */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button render={<Link href="/upload" />}>Cook something else</Button>
            <Button variant="outline" render={<Link href="/pantry" />}>
              Edit pantry
            </Button>
          </div>
        </>
      )}
    </main>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="aspect-video w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}

function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 text-center">
          <div className="space-y-1">
            <p className="text-lg font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex justify-center">{action}</div>
        </CardContent>
      </Card>
    </div>
  );
}
