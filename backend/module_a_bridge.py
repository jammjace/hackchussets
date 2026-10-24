"""The seam between your backend and Jace's Module A.

MODULE_A_MODE=mock (default): writes the fixture events.json and placeholder
evidence JPEGs into the session folder, exactly where Module A will write them.
MODULE_A_MODE=real: calls Jace's pipeline. Fill in run_real() once his session
export (README sections 5 to 7) exists.

Either way the output is the same folder layout, so nothing downstream changes:
    storage/sessions/<session_id>/events.json
    storage/sessions/<session_id>/evidence/<event_id>.jpg
"""

from __future__ import annotations

import json
import os
from pathlib import Path

FIXTURE = Path(__file__).parent / "fixtures" / "mock_events.json"


def run_module_a(video_path: Path | None, session_id: str, session_dir: Path) -> None:
    mode = os.environ.get("MODULE_A_MODE", "mock")
    if mode == "real":
        run_real(video_path, session_id, session_dir)
    else:
        run_mock(session_id, session_dir)


def run_mock(session_id: str, session_dir: Path) -> None:
    doc = json.loads(FIXTURE.read_text(encoding="utf-8"))
    doc["session_id"] = session_id
    evidence_dir = session_dir / "evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    for event in doc["events"]:
        if event["evidence_frame"]:
            _placeholder_jpeg(
                session_dir / event["evidence_frame"],
                f"{event['ingredient']}",
                f"{event['quantity']:g} {event['unit']}  @ {event['timestamp']:.1f}s",
            )
    (session_dir / "events.json").write_text(json.dumps(doc, indent=2), encoding="utf-8")


def run_real(video_path: Path | None, session_id: str, session_dir: Path) -> None:
    """Jace's CookingPipeline with the OpenAI vision adapter. Needs OPENAI_API_KEY
    (env or repo-root .env). Install once: pip install -e .. from backend/."""
    if video_path is None:
        raise ValueError("MODULE_A_MODE=real needs an uploaded video")

    from dotenv import load_dotenv
    from ingredient_detection.adapters.openai_vision import OpenAIVisionModel
    from ingredient_detection.pipeline.cooking_pipeline import CookingPipeline
    from ingredient_detection.services.event_tracker import IngredientEventTracker
    from ingredient_detection.services.frame_extractor import SlidingWindowFrameExtractor
    from ingredient_detection.services.ingredient_detector import IngredientDetector
    from ingredient_detection.services.video_processor import VideoProcessor

    load_dotenv(Path(__file__).parent.parent / ".env")
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set (env or repo-root .env)")

    model = OpenAIVisionModel(api_key, model=os.environ.get("VLM_MODEL", "gpt-4.1-mini"))
    pipeline = CookingPipeline(
        VideoProcessor(),
        SlidingWindowFrameExtractor(),
        IngredientDetector(model),
        IngredientEventTracker(),
        storage_root=session_dir.parent.parent,
    )
    # The pipeline refuses to reuse a session folder; app.py made an empty one.
    session_dir.rmdir()
    pipeline.process(str(video_path), session_id=session_id)


def _placeholder_jpeg(path: Path, title: str, subtitle: str) -> None:
    from PIL import Image, ImageDraw, ImageFont

    def font(size: int):
        try:
            return ImageFont.load_default(size=size)
        except TypeError:  # Pillow older than 10.1
            return ImageFont.load_default()

    path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (640, 360), (235, 228, 214))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 300, 640, 360], fill=(60, 60, 60))
    draw.text((32, 110), title.upper(), fill=(40, 40, 40), font=font(44))
    draw.text((32, 175), subtitle, fill=(90, 90, 90), font=font(28))
    draw.text((32, 316), "MOCK EVIDENCE FRAME", fill=(240, 240, 240), font=font(22))
    img.save(path, "JPEG", quality=80)
