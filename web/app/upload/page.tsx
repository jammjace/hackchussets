"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Film, Upload as UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useVideoFile } from "@/components/upload/video-file-context";
import { createDemoSession } from "@/lib/api";
import { formatNumber } from "@/lib/format";

const PUBLIC_DEMO =
  process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === "public_demo";
const PUBLIC_UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${(Math.round(mb * 10) / 10).toLocaleString("en-GB")} MB`;
}

function isVideoFile(file: File): boolean {
  if (file.type) return file.type.startsWith("video/");
  // Some systems don't set a MIME type; fall back to the extension.
  return /\.(mp4|mov|webm|m4v)$/i.test(file.name);
}

export default function UploadPage() {
  const router = useRouter();
  const { file, setFile } = useVideoFile();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build (and revoke) an object URL for the preview whenever the file changes.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const acceptFile = useCallback(
    (candidate: File | null | undefined) => {
      if (!candidate) return;
      if (!isVideoFile(candidate)) {
        setError(
          "That doesn't look like a video. Please choose an .mp4, .mov, .webm or .m4v file.",
        );
        return;
      }
      if (PUBLIC_DEMO && candidate.size > PUBLIC_UPLOAD_LIMIT_BYTES) {
        setError(
          "Public demo uploads must be under 4 MB. Use the no-video demo for the full prerecorded experience.",
        );
        return;
      }
      setError(null);
      setFile(candidate);
    },
    [setFile],
  );

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    acceptFile(e.target.files?.[0]);
    // Allow re-selecting the same file later.
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    acceptFile(e.dataTransfer.files?.[0]);
  }

  function analyse() {
    if (!file) return;
    router.push("/processing");
  }

  async function startDemo() {
    setDemoBusy(true);
    setError(null);
    try {
      const { session_id } = await createDemoSession();
      router.push(`/results/${session_id}`);
    } catch (err: unknown) {
      setDemoBusy(false);
      setError(
        err instanceof Error ? err.message : "Couldn't start the demo session.",
      );
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-4 sm:p-6">
      <Button variant="outline" render={<Link href="/" />}>
        Back to home
      </Button>

      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-normal tracking-tight sm:text-4xl">
          {PUBLIC_DEMO ? "Try the Na(h) demo" : "Upload your cooking video"}
        </h1>
        <p className="text-muted-foreground">
          {PUBLIC_DEMO
            ? "See how Na(h) analyses a 40-second cooking video from upload to results."
            : "Choose the clip from your head-mounted or overhead camera. We’ll find every seasoning you added."}
        </p>
      </div>

      {/* Drop zone / picker */}
      {!PUBLIC_DEMO && <Card>
        <CardContent>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={[
              // Na(h) Drop Zone: 2px dashed ink, 28px radius, lavender on drag-over.
              "flex w-full flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-ink p-10 text-center outline-none transition-colors [transition-duration:var(--duration-ui)]",
              "focus-visible:ring-2 focus-visible:ring-ink",
              dragOver ? "bg-lavender" : "bg-paper hover:bg-canvas",
            ].join(" ")}
          >
            <UploadIcon className="size-8 text-ink" aria-hidden />
            <span className="font-ui font-semibold">
              Drag a video here, or click to choose
            </span>
            <span className="font-ui text-sm text-ink-soft">
              .mp4, .mov, .webm or .m4v
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="sr-only"
            onChange={onInputChange}
          />

          {error && (
            <p className="mt-3 text-sm text-chilli" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      </Card>}

      {PUBLIC_DEMO && error && (
        <p className="text-sm text-chilli" role="alert">
          {error}
        </p>
      )}

      {/* Selected file + preview */}
      {!PUBLIC_DEMO && file && previewUrl && (
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Film className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <video
              controls
              preload="metadata"
              playsInline
              src={previewUrl}
              className="w-full rounded-xl bg-black ring-1 ring-foreground/10"
            />
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {PUBLIC_DEMO ? (
          <Button onClick={startDemo} disabled={demoBusy}>
            {demoBusy ? "Starting demo…" : "View the 40-second demo"}
          </Button>
        ) : (
          <>
            <Button onClick={analyse} disabled={!file}>
              Analyse
            </Button>
            <button
              type="button"
              onClick={startDemo}
              disabled={demoBusy}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
            >
              {demoBusy ? "Starting demo…" : "I have no video, try demo"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
