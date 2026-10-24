"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createDemoSession, getHealth } from "@/lib/api";

type Status =
  | { state: "loading" }
  | { state: "connected"; status: string }
  | { state: "error"; message: string };

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ state: "loading" });
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getHealth()
      .then((res) => {
        if (active) setStatus({ state: "connected", status: res.status });
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
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sodium Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.state === "loading" && (
            <p className="text-muted-foreground">Checking the backend…</p>
          )}
          {status.state === "connected" && (
            <p className="font-medium text-green-600">Backend connected</p>
          )}
          {status.state === "error" && (
            <div className="space-y-1">
              <p className="font-medium text-red-600">Backend not reachable</p>
              <p className="text-sm text-muted-foreground">{status.message}</p>
            </div>
          )}

          {/* Temporary: jump straight to a mock results session. */}
          <div className="space-y-2 border-t pt-4">
            <Button onClick={startDemo} disabled={demoBusy}>
              {demoBusy ? "Starting demo…" : "Try a demo"}
            </Button>
            {demoError && (
              <p className="text-sm text-red-600">{demoError}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
