import json

import pytest

import module_a_bridge
from module_a_bridge import (
    PrerecordedDemoFixtureError,
    ingredients_export_to_events,
    run_prerecorded_demo,
)


def test_bridge_adapts_rich_export_and_preserves_nullable_quantity():
    source = {
        "session_id": "cooking_001",
        "ingredients": [{
            "event_id": "event_001",
            "ingredient": "salt",
            "quantity": None,
            "unit": "tablespoon",
            "quantity_source": "interval_visual_estimate",
            "timestamp_start": 1.0,
            "timestamp_end": 3.0,
            "addition_confirmed": True,
            "estimate_complete": False,
            "known_estimated_subtotal_tbsp": 0.5,
        }],
    }
    result = ingredients_export_to_events(source)
    event = result["events"][0]
    assert result["session_id"] == "cooking_001"
    assert event["timestamp"] == 1.0
    assert event["quantity"] is None
    assert event["known_estimated_subtotal_tbsp"] == 0.5
    assert event["evidence_frame"] is None


def test_prerecorded_demo_reassigns_session_without_changing_events(tmp_path):
    source = json.loads(
        module_a_bridge.PRERECORDED_DEMO_FIXTURE.read_text(encoding="utf-8")
    )
    run_prerecorded_demo("cooking_123", tmp_path)
    result = json.loads((tmp_path / "events.json").read_text(encoding="utf-8"))
    assert result["session_id"] == "cooking_123"
    assert result["inference_mode"] == "prerecorded_demo"
    assert result["events"] == source["events"]
    assert result["events"][1]["quantity"] is None
    assert result["events"][1]["unit"] is None


def test_prerecorded_demo_reports_missing_fixture(monkeypatch, tmp_path):
    monkeypatch.setattr(
        module_a_bridge, "PRERECORDED_DEMO_FIXTURE", tmp_path / "missing.json"
    )
    with pytest.raises(PrerecordedDemoFixtureError, match="not found"):
        run_prerecorded_demo("cooking_123", tmp_path / "session")


def test_prerecorded_demo_reports_malformed_fixture(monkeypatch, tmp_path):
    fixture = tmp_path / "events.json"
    fixture.write_text("{broken", encoding="utf-8")
    monkeypatch.setattr(module_a_bridge, "PRERECORDED_DEMO_FIXTURE", fixture)
    with pytest.raises(PrerecordedDemoFixtureError, match="not valid JSON"):
        run_prerecorded_demo("cooking_123", tmp_path / "session")
