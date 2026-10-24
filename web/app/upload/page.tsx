"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Film, Upload as UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useVideoFile } from "@/components/upload/video-file-context";
import { createDemoSession } from "@/lib/api";
import { formatNumber } from "@/lib/format";

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
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Upload your cooking video
        </h1>
        <p className="text-muted-foreground">
          Choose the clip from your head-mounted or overhead camera. We&apos;ll
          find every seasoning you added.
        </p>
      </div>

      {/* Drop zone / picker */}
      <Card>
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
              "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors outline-none",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50",
            ].join(" ")}
          >
            <UploadIcon className="size-8 text-muted-foreground" aria-hidden />
            <span className="font-medium">
              Drag a video here, or click to choose
            </span>
            <span className="text-sm text-muted-foreground">
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
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Selected file + preview */}
      {file && previewUrl && (
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
        <Button onClick={analyse} disabled={!file}>
          Analyse
        </Button>
        <button
          type="button"
          onClick={startDemo}
          disabled={demoBusy}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
        >
          {demoBusy ? "Starting demo…" : "No video? Try the demo"}
        </button>
      </div>
    </main>
  );
}
