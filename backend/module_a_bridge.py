"""The stable seam between the backend and Module A.

MODULE_A_MODE=mock (default) uses recorded Qwen fixtures for the two sample
videos without importing or loading Qwen. Other uploads and demo sessions use
the original UI fixture. MODULE_A_MODE=real uses the same pipeline/export seam
with one lazily cached Qwen model instance.

Either way the output is the same folder layout, so nothing downstream changes:
    storage/sessions/<session_id>/events.json
    storage/sessions/<session_id>/evidence/<event_id>.jpg
"""

from __future__ import annotations

import json
import hashlib
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

FIXTURE = Path(__file__).parent / "fixtures" / "mock_events.json"
PROJECT_ROOT = Path(__file__).resolve().parents[1]
SAMPLE_FIXTURES = {
    "1f5f7afc4f92c639c5dcf2ad552dd2d01847223900209a90f47a60cc06060512": "P12_101",
    "63e3848ec7ff92c85b46e09149836fbf651f6a5e88ee8032e067e379ae6c7c7a": "P22_113",
}


def run_module_a(video_path: Path | None, session_id: str, session_dir: Path) -> None:
    mode = os.environ.get("MODULE_A_MODE", "mock")
    if video_path is None:
        run_fixture(session_id, session_dir)
        return
    if mode == "real":
        run_real(video_path, session_id, session_dir)
    elif mode == "mock":
        run_mock(video_path, session_id, session_dir)
    else:
        raise ValueError(f"Unsupported MODULE_A_MODE={mode!r}")


def run_mock(video_path: Path, session_id: str, session_dir: Path) -> None:
    video_id = SAMPLE_FIXTURES.get(_sha256(video_path))
    if video_id is None:
        run_fixture(session_id, session_dir)
        return

    from ingredient_detection.adapters.qwen_mock import (
        RECORDED_DISCOVERIES,
        MockIngredientDiscovery,
        MockQwenVisionModel,
    )

    _run_pipeline(
        video_path,
        session_id,
        session_dir,
        MockIngredientDiscovery(RECORDED_DISCOVERIES[video_id]),
        MockQwenVisionModel(video_id),
    )


def run_fixture(session_id: str, session_dir: Path) -> None:
    """Preserve the teammate's original six-event demo fixture."""
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
    if video_path is None:
        raise ValueError("real Module A requires a video")
    model = _real_model()
    _run_pipeline(video_path, session_id, session_dir, model, model)


@lru_cache(maxsize=1)
def _real_model():
    """Import and load Qwen only in real mode, once per backend process."""
    from ingredient_detection.adapters.qwen_vision import QwenVisionModel

    return QwenVisionModel()


def _run_pipeline(
    video_path: Path,
    session_id: str,
    session_dir: Path,
    discovery: Any,
    quantity_inference: Any,
) -> None:
    from ingredient_detection.pipeline.automatic_ingredient_pipeline import (
        AutomaticIngredientPipeline,
    )
    from ingredient_detection.services.quantity_aggregator import (
        IngredientQuantityAggregator,
    )

    result = AutomaticIngredientPipeline(discovery, quantity_inference).process(
        str(video_path)
    )
    aggregator = IngredientQuantityAggregator()
    export = aggregator.aggregate(result, session_id=session_id)
    aggregator.write_json(export, session_dir / "ingredients.json")
    events_doc = ingredients_export_to_events(export.model_dump(mode="json"))
    (session_dir / "events.json").write_text(
        json.dumps(events_doc, indent=2) + "\n", encoding="utf-8"
    )


def ingredients_export_to_events(export: dict[str, Any]) -> dict[str, Any]:
    """Adapt Module A's rich final artifact to the stable backend contract."""
    events = []
    for item in export.get("ingredients", []):
        event = {
            "event_id": item["event_id"],
            "timestamp_start": item["timestamp_start"],
            "timestamp_end": item["timestamp_end"],
            "timestamp": item["timestamp_start"],
            "ingredient": item["ingredient"],
            "quantity": item["quantity"],
            "unit": item["unit"],
            "addition_confirmed": item["addition_confirmed"],
            "evidence_frame": None,
            "quantity_source": item["quantity_source"],
            "estimate_complete": item["estimate_complete"],
        }
        if item.get("known_estimated_subtotal_tbsp") is not None:
            event["known_estimated_subtotal_tbsp"] = item[
                "known_estimated_subtotal_tbsp"
            ]
        events.append(event)
    return {"session_id": export["session_id"], "events": events}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


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
