// Every backend call lives here (KIRO_HANDOFF.md section 5).
// The API base comes from NEXT_PUBLIC_API_BASE. All URLs the API returns are
// relative; prefix them with the base using `apiUrl`.

import type {
  HealthResponse,
  Pantry,
  Results,
  SessionResponse,
} from "./types";

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"
).replace(/\/+$/, "");

/**
 * Turn a relative API path (e.g. "/api/sessions/cooking_001/video") into an
 * absolute URL against the configured API base. Pass-through for absolute URLs.
 * Returns null when given null, so callers can guard on a missing resource.
 */
export function apiUrl(path: string): string;
export function apiUrl(path: null | undefined): null;
export function apiUrl(path: string | null | undefined): string | null;
export function apiUrl(path: string | null | undefined): string | null {
  if (path === null || path === undefined) {
    return null;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (cause) {
    throw new ApiError(
      "Couldn't reach the backend. Is it running on " + API_BASE + "?",
      0,
    );
  }
  if (!res.ok) {
    throw new ApiError(
      `Request to ${path} failed with status ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

/** GET /api/health -> {"status":"ok"} */
export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

/** GET /api/pantry -> current pantry */
export function getPantry(): Promise<Pantry> {
  return request<Pantry>("/api/pantry");
}

/** PUT /api/pantry -> save the whole edited pantry */
export function putPantry(pantry: Pantry): Promise<Pantry> {
  return request<Pantry>("/api/pantry", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pantry),
  });
}

/** POST /api/pantry/reset -> restore the default pantry */
export function resetPantry(): Promise<Pantry> {
  return request<Pantry>("/api/pantry/reset", { method: "POST" });
}

/**
 * POST /api/sessions -> upload a video, create a session, run Module A.
 * This is the only endpoint that ever receives video. The request waits until
 * Module A finishes, so callers should show a processing screen meanwhile.
 */
export function createSession(video: File): Promise<SessionResponse> {
  const form = new FormData();
  form.append("video", video);
  return request<SessionResponse>("/api/sessions", {
    method: "POST",
    body: form,
  });
}

/** POST /api/sessions/demo -> mock session with no video */
export function createDemoSession(): Promise<SessionResponse> {
  return request<SessionResponse>("/api/sessions/demo", { method: "POST" });
}

/** GET /api/sessions/{id}/results -> timeline joined with sodium (404 if not processed) */
export function getResults(sessionId: string): Promise<Results> {
  return request<Results>(
    `/api/sessions/${encodeURIComponent(sessionId)}/results`,
  );
}

/**
 * GET /api/sessions/{id}/evidence/{event_id}.jpg
 * Returns an absolute URL for use as an <img> src. Prefer the `evidence_url`
 * from the results payload when present; this builder is for fallback use.
 */
export function evidenceUrl(sessionId: string, eventId: string): string {
  return `${API_BASE}/api/sessions/${encodeURIComponent(
    sessionId,
  )}/evidence/${encodeURIComponent(eventId)}.jpg`;
}

/**
 * GET /api/sessions/{id}/video
 * Returns an absolute URL for use as a <video> src (supports range requests).
 * Prefer the `video_url` from the results payload when present.
 */
export function videoUrl(sessionId: string): string {
  return `${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}/video`;
}

export { ApiError };
