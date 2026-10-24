import json
from pathlib import Path

import pytest

from ingredient_detection.models.frames import Frame, FrameWindow
from ingredient_detection.models.ingredient_event import IngredientObservation
from ingredient_detection.models.video import VideoMetadata
from ingredient_detection.pipeline.cooking_pipeline import CookingPipeline
from ingredient_detection.services.event_tracker import IngredientEventTracker


class StubVideoProcessor:
    def validate_and_describe(self, video_path: str) -> VideoMetadata:
        return VideoMetadata(path=video_path, duration_seconds=4, fps=30, width=640, height=480)


class StubExtractor:
    def iter_extract(self, metadata: VideoMetadata):
        yield FrameWindow(
            window_id=0,
            timestamp_start=10,
            timestamp_end=14,
            frames=[Frame(timestamp=12.5, jpeg_bytes=b"jpeg evidence")],
        )


class StubDetector:
    def detect_one(self, window: FrameWindow) -> IngredientObservation:
        return IngredientObservation(
            timestamp_start=window.timestamp_start,
            timestamp_end=window.timestamp_end,
            timestamp=12.5,
            ingredient="salt",
            quantity=0.5,
            unit="teaspoon",
            addition_confirmed=True,
            evidence_timestamp=12.5,
            evidence_jpeg=window.frames[0].jpeg_bytes,
        )


def make_pipeline(storage_root: Path) -> CookingPipeline:
    return CookingPipeline(
        StubVideoProcessor(),  # type: ignore[arg-type]
        StubExtractor(),  # type: ignore[arg-type]
        StubDetector(),  # type: ignore[arg-type]
        IngredientEventTracker(),
        storage_root=storage_root,
    )


def test_exports_session_json_and_named_evidence(tmp_path):
    result = make_pipeline(tmp_path).process("recording.mp4", session_id="cooking_001")

    session_dir = tmp_path / "sessions" / "cooking_001"
    payload = json.loads((session_dir / "events.json").read_text(encoding="utf-8"))
    event = payload["events"][0]

    assert result.session_id == "cooking_001"
    assert payload["session_id"] == "cooking_001"
    assert event["timestamp"] == 12.5
    assert event["evidence_frame"] == "evidence/event_001.jpg"
    assert "evidence_jpeg" not in event
    assert "evidence_timestamp" not in event
    assert (session_dir / event["evidence_frame"]).read_bytes() == b"jpeg evidence"


def test_never_overwrites_existing_session(tmp_path):
    pipeline = make_pipeline(tmp_path)
    pipeline.process("recording.mp4", session_id="cooking_001")

    with pytest.raises(FileExistsError):
        pipeline.process("recording.mp4", session_id="cooking_001")


@pytest.mark.parametrize("session_id", ["../escape", "has spaces", "a/b"])
def test_rejects_unsafe_session_ids(tmp_path, session_id):
    with pytest.raises(ValueError):
        make_pipeline(tmp_path).process("recording.mp4", session_id=session_id)
