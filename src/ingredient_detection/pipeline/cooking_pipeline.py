import json
import re
import uuid
from pathlib import Path

from ..models.ingredient_event import EventExport
from ..services.event_tracker import IngredientEventTracker
from ..services.frame_extractor import SlidingWindowFrameExtractor
from ..services.ingredient_detector import IngredientDetector
from ..services.video_processor import VideoProcessor


class CookingPipeline:
    """Orchestrates: video -> frames -> VLM detection -> events (JSON)."""

    def __init__(
        self,
        video_processor: VideoProcessor,
        frame_extractor: SlidingWindowFrameExtractor,
        detector: IngredientDetector,
        tracker: IngredientEventTracker,
        storage_root: str | Path = "storage",
    ) -> None:
        self._video_processor = video_processor
        self._frame_extractor = frame_extractor
        self._detector = detector
        self._tracker = tracker
        self._storage_root = Path(storage_root)

    def process(self, video_path: str, session_id: str | None = None) -> EventExport:
        session_id = session_id or f"cooking_{uuid.uuid4().hex[:12]}"
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,63}", session_id):
            raise ValueError("session_id must contain only letters, numbers, underscores, and hyphens")
        session_dir = self._storage_root / "sessions" / session_id
        if session_dir.exists():
            raise FileExistsError(f"Session already exists: {session_id}")

        metadata = self._video_processor.validate_and_describe(video_path)
        # Exclusive creation prevents accidental replacement of prior results.
        session_dir.mkdir(parents=True, exist_ok=False)
        evidence_dir = session_dir / "evidence"
        evidence_dir.mkdir()

        observations = []
        for window in self._frame_extractor.iter_extract(metadata):
            observation = self._detector.detect_one(window)
            if not observation.is_valid():
                observation.evidence_jpeg = None
            observations.append(observation)
        export = self._tracker.build_export(observations, session_id=session_id)
        for event in export.events:
            if event.evidence_jpeg:
                filename = f"{event.event_id}.jpg"
                (evidence_dir / filename).write_bytes(event.evidence_jpeg)
                event.evidence_frame = f"evidence/{filename}"

        payload = export.model_dump(mode="json")
        (session_dir / "events.json").write_text(
            json.dumps(payload, indent=2) + "\n", encoding="utf-8"
        )
        return export
