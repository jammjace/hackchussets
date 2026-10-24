"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type VideoFileContextValue = {
  /** The video the user selected on /upload, held in memory for /processing. */
  file: File | null;
  setFile: (file: File | null) => void;
  clearFile: () => void;
};

const VideoFileContext = createContext<VideoFileContextValue | null>(null);

export function VideoFileProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<File | null>(null);

  const clearFile = useCallback(() => setFile(null), []);

  const value = useMemo<VideoFileContextValue>(
    () => ({ file, setFile, clearFile }),
    [file, clearFile],
  );

  return (
    <VideoFileContext.Provider value={value}>
      {children}
    </VideoFileContext.Provider>
  );
}

export function useVideoFile(): VideoFileContextValue {
  const ctx = useContext(VideoFileContext);
  if (!ctx) {
    throw new Error("useVideoFile must be used within a VideoFileProvider");
  }
  return ctx;
}
