"""Backend for Modules B and C: sessions, sodium results, evidence images, video.

Run from the backend/ folder:
    uvicorn app:app --reload --port 8000

Storage layout follows the team README (section 5):
    storage/recordings/<session_id>.<ext>
    storage/sessions/<session_id>/events.json
    storage/sessions/<session_id>/evidence/<event_id>.jpg
"""

from __future__ import annotations

import json
import os
import re
import shutil
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from module_a_bridge import run_module_a
from sodium_engine import calculate, load_default_pantry

STORAGE = Path(os.environ.get("STORAGE_DIR", Path(__file__).parent / "storage")).resolve()
RECORDINGS = STORAGE / "recordings"
SESSIONS = STORAGE / "sessions"
PANTRY_FILE = STORAGE / "pantry.json"

SESSION_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
EVIDENCE_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}\.jpg$")
VIDEO_EXTS = {".mp4", ".mov", ".webm", ".m4v"}
DAILY_LIMIT_MG = 2300

app = FastAPI(title="Sodium tracker backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- helpers ----------

def _inside_storage(path: Path) -> Path:
    """Refuse any path that resolves outside the storage folder."""
    resolved = path.resolve()
    if not resolved.is_relative_to(STORAGE):
        raise HTTPException(status_code=400, detail="Invalid path")
    return resolved


def _session_dir(session_id: str) -> Path:
    if not SESSION_RE.fullmatch(session_id):
        raise HTTPException(status_code=400, detail="Invalid session_id")
    return _inside_storage(SESSIONS / session_id)


def _next_session_id() -> str:
    SESSIONS.mkdir(parents=True, exist_ok=True)
    taken = {p.name for p in SESSIONS.iterdir() if p.is_dir()}
    n = 1
    while f"cooking_{n:03d}" in taken:
        n += 1
    return f"cooking_{n:03d}"


def _find_recording(session_id: str) -> Path | None:
    for ext in VIDEO_EXTS:
        candidate = RECORDINGS / f"{session_id}{ext}"
        if candidate.exists():
            return candidate
    return None


def _load_pantry() -> dict[str, Any]:
    if PANTRY_FILE.exists():
        return json.loads(PANTRY_FILE.read_text(encoding="utf-8"))
    return load_default_pantry()


# ---------- routes ----------

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/pantry")
def get_pantry() -> dict[str, Any]:
    return _load_pantry()


@app.put("/api/pantry")
def put_pantry(pantry: dict[str, Any]) -> dict[str, Any]:
    """Save the user's edited pantry (add or edit products, change defaults)."""
    for key in ("categories", "products"):
        if not isinstance(pantry.get(key), list):
            raise HTTPException(status_code=422, detail=f"pantry.{key} must be a list")
    STORAGE.mkdir(parents=True, exist_ok=True)
    PANTRY_FILE.write_text(json.dumps(pantry, indent=2), encoding="utf-8")
    return pantry


@app.post("/api/pantry/reset")
def reset_pantry() -> dict[str, Any]:
    PANTRY_FILE.unlink(missing_ok=True)
    return load_default_pantry()


@app.post("/api/sessions")
def create_session(video: UploadFile = File(...)) -> dict[str, str]:
    """Save the uploaded video, create a session, run Module A (mock or real)."""
    ext = Path(video.filename or "").suffix.lower() or ".mp4"
    if ext not in VIDEO_EXTS:
        raise HTTPException(status_code=415, detail=f"Unsupported video type {ext}")

    session_id = _next_session_id()
    session_dir = SESSIONS / session_id
    session_dir.mkdir(parents=True)  # never overwrite another session
    RECORDINGS.mkdir(parents=True, exist_ok=True)
    video_path = RECORDINGS / f"{session_id}{ext}"
    with video_path.open("wb") as out:
        shutil.copyfileobj(video.file, out)

    run_module_a(video_path, session_id, session_dir)
    return {"session_id": session_id}


@app.post("/api/sessions/demo")
def create_demo_session() -> dict[str, str]:
    """A session with mock events and no video: build the results screen with this."""
    session_id = _next_session_id()
    session_dir = SESSIONS / session_id
    session_dir.mkdir(parents=True)
    run_module_a(None, session_id, session_dir)
    return {"session_id": session_id}


@app.get("/api/sessions/{session_id}/results")
def get_results(session_id: str) -> dict[str, Any]:
    """Join Module A events and Module B sodium by event_id into one timeline."""
    events_file = _session_dir(session_id) / "events.json"
    if not events_file.exists():
        raise HTTPException(status_code=404, detail="No events for this session yet")

    events_doc = json.loads(events_file.read_text(encoding="utf-8"))
    sodium = calculate(events_doc, _load_pantry())
    by_id = {r["event_id"]: r for r in sodium["results"]}

    timeline = []
    for event in sorted(events_doc.get("events", []), key=lambda e: e.get("timestamp", e["timestamp_start"])):
        result = by_id.get(event["event_id"], {})
        frame = event.get("evidence_frame")
        timeline.append({
            "event_id": event["event_id"],
            "timestamp": event.get("timestamp", event["timestamp_start"]),
            "timestamp_start": event["timestamp_start"],
            "timestamp_end": event["timestamp_end"],
            "ingredient": event["ingredient"],
            "quantity": event["quantity"],
            "unit": event["unit"],
            "estimate_complete": event.get("estimate_complete", True),
            "known_estimated_subtotal_tbsp": event.get(
                "known_estimated_subtotal_tbsp"
            ),
            "evidence_url": (
                f"/api/sessions/{session_id}/evidence/{Path(frame).name}" if frame else None
            ),
            "sodium_mg": result.get("sodium_mg"),
            "status": result.get("status"),
            "product_name": result.get("product_name"),
        })

    running = 0.0
    for row in timeline:
        running += row["sodium_mg"] or 0
        row["cumulative_mg"] = round(running, 1)

    total = sodium["total_sodium_mg"]
    return {
        "session_id": session_id,
        "video_url": f"/api/sessions/{session_id}/video" if _find_recording(session_id) else None,
        "timeline": timeline,
        "total_sodium_mg": total,
        "daily_limit_mg": DAILY_LIMIT_MG,
        "percent_of_daily_limit": round(total / DAILY_LIMIT_MG * 100, 1),
        "is_incomplete": sodium["is_incomplete"],
        "warnings": sodium["warnings"],
    }


@app.get("/api/sessions/{session_id}/evidence/{filename}")
def get_evidence(session_id: str, filename: str) -> FileResponse:
    if not EVIDENCE_RE.fullmatch(filename):
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = _inside_storage(_session_dir(session_id) / "evidence" / filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="No evidence image")
    return FileResponse(path, media_type="image/jpeg")


@app.get("/api/sessions/{session_id}/video")
def get_video(session_id: str) -> FileResponse:
    """Supports HTTP range requests, so the browser can seek to a timestamp."""
    _session_dir(session_id)
    path = _find_recording(session_id)
    if path is None:
        raise HTTPException(status_code=404, detail="No recording for this session")
    return FileResponse(_inside_storage(path))
