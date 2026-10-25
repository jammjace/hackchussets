import io
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import app

client = TestClient(app)
SAMPLES = Path(__file__).resolve().parents[2] / "samples"


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_upload_creates_session_and_results_join_by_event_id():
    fake_video = io.BytesIO(b"\x00" * 2048)
    res = client.post("/api/sessions", files={"video": ("clip.mp4", fake_video, "video/mp4")})
    assert res.status_code == 200
    sid = res.json()["session_id"]
    assert sid.startswith("cooking_")

    data = client.get(f"/api/sessions/{sid}/results").json()
    assert data["total_sodium_mg"] == pytest.approx(5163.3, abs=0.1)
    assert data["video_url"] == f"/api/sessions/{sid}/video"
    assert [row["timestamp"] for row in data["timeline"]] == sorted(r["timestamp"] for r in data["timeline"])
    assert data["timeline"][-1]["cumulative_mg"] == pytest.approx(5163.3, abs=0.1)

    first = data["timeline"][0]
    assert first["evidence_url"] == f"/api/sessions/{sid}/evidence/event_001.jpg"
    img = client.get(first["evidence_url"])
    assert img.status_code == 200 and img.headers["content-type"] == "image/jpeg"

    assert data["timeline"][-1]["evidence_url"] is None  # event_006 has no frame


def test_sessions_never_overwrite_each_other():
    a = client.post("/api/sessions/demo").json()["session_id"]
    b = client.post("/api/sessions/demo").json()["session_id"]
    assert a != b
    assert client.get(f"/api/sessions/{a}/results").json()["video_url"] is None


def test_video_supports_range_requests_for_seeking():
    payload = bytes(range(256)) * 8
    sid = client.post("/api/sessions", files={"video": ("c.mp4", io.BytesIO(payload), "video/mp4")}).json()["session_id"]
    res = client.get(f"/api/sessions/{sid}/video", headers={"Range": "bytes=0-99"})
    assert res.status_code == 206
    assert res.content == payload[:100]


@pytest.mark.parametrize("url", [
    "/api/sessions/..%2F..%2Fetc/results",
    "/api/sessions/cooking_001/evidence/..%2Fevents.json",
    "/api/sessions/cooking_001/evidence/event_001.png",
])
def test_path_traversal_and_bad_names_rejected(url):
    assert client.get(url).status_code in (400, 404)


def test_rejects_non_video_upload():
    res = client.post("/api/sessions", files={"video": ("notes.txt", io.BytesIO(b"hi"), "text/plain")})
    assert res.status_code == 415


def test_pantry_edit_changes_results_then_reset():
    sid = client.post("/api/sessions/demo").json()["session_id"]
    pantry = client.get("/api/pantry").json()
    soy = next(p for p in pantry["products"] if p["product_id"] == "kikkoman_soy")
    soy["sodium_mg_per_unit"] = {"tablespoon": 590}  # Kikkoman Less Sodium
    assert client.put("/api/pantry", json=pantry).status_code == 200

    data = client.get(f"/api/sessions/{sid}/results").json()
    # soy: 590 + 590/3 instead of 960 + 320
    assert data["total_sodium_mg"] == pytest.approx(5163.3 - 1280 + 590 + 196.7, abs=0.2)

    client.post("/api/pantry/reset")
    data = client.get(f"/api/sessions/{sid}/results").json()
    assert data["total_sodium_mg"] == pytest.approx(5163.3, abs=0.1)


@pytest.mark.parametrize(
    ("filename", "ingredient", "quantity", "expected_total"),
    [
        ("test1.mp4", "salt", 2.0, 13950.0),
        ("test2.mp4", "oil", 2.0, 0.0),
    ],
)
def test_sample_upload_runs_recorded_module_a_pipeline(
    filename, ingredient, quantity, expected_total
):
    with (SAMPLES / filename).open("rb") as video:
        response = client.post(
            "/api/sessions", files={"video": (filename, video, "video/mp4")}
        )
    assert response.status_code == 200
    session_id = response.json()["session_id"]

    from app import SESSIONS

    events_doc = json.loads(
        (SESSIONS / session_id / "events.json").read_text(encoding="utf-8")
    )
    assert events_doc["session_id"] == session_id
    assert len(events_doc["events"]) == 1
    event = events_doc["events"][0]
    assert event["ingredient"] == ingredient
    assert event["quantity"] == quantity
    assert event["timestamp"] == event["timestamp_start"]

    results = client.get(f"/api/sessions/{session_id}/results").json()
    assert results["timeline"][0]["ingredient"] == ingredient
    assert results["timeline"][0]["quantity"] == quantity
    assert results["video_url"] == f"/api/sessions/{session_id}/video"
    assert results["total_sodium_mg"] == pytest.approx(expected_total)
    seek = client.get(
        results["video_url"], headers={"Range": "bytes=0-99"}
    )
    assert seek.status_code == 206
    assert len(seek.content) == 100


@pytest.mark.parametrize("payload", [b"first arbitrary video", b"completely different"])
def test_any_upload_uses_prerecorded_fixture_in_demo_mode(monkeypatch, payload):
    monkeypatch.setenv("MODULE_A_MODE", "prerecorded_demo")
    response = client.post(
        "/api/sessions",
        files={"video": ("anything.mp4", io.BytesIO(payload), "video/mp4")},
    )
    assert response.status_code == 200
    session_id = response.json()["session_id"]

    from app import SESSIONS

    events = json.loads(
        (SESSIONS / session_id / "events.json").read_text(encoding="utf-8")
    )
    assert events["session_id"] == session_id
    assert events["inference_mode"] == "prerecorded_demo"
    assert [event["ingredient"] for event in events["events"]] == [
        "olive oil",
        "salt",
    ]
    assert events["events"][1]["quantity"] is None

    results = client.get(f"/api/sessions/{session_id}/results").json()
    assert results["inference_mode"] == "prerecorded_demo"
    assert results["video_url"] == f"/api/sessions/{session_id}/video"
    assert results["timeline"][1]["quantity"] is None
    assert results["timeline"][1]["unit"] is None
    assert results["timeline"][1]["status"] == "incomplete_quantity"
    assert results["is_incomplete"] is True


def test_serverless_demo_is_stateless_and_uses_reviewed_fixture(monkeypatch):
    import app as app_module

    monkeypatch.setattr(app_module, "SERVERLESS_DEMO", True)
    response = client.post("/api/sessions/demo")
    assert response.status_code == 200
    assert response.json() == {"session_id": "prerecorded-demo"}
    assert not (app_module.SESSIONS / "prerecorded-demo").exists()

    results = client.get("/api/sessions/prerecorded-demo/results")
    assert results.status_code == 200
    data = results.json()
    assert data["session_id"] == "prerecorded-demo"
    assert data["inference_mode"] == "prerecorded_demo"
    assert data["video_url"] is None
    assert [row["ingredient"] for row in data["timeline"]] == [
        "olive oil",
        "salt",
    ]
    assert data["timeline"][1]["quantity"] is None
    assert data["is_incomplete"] is True


def test_serverless_upload_does_not_persist_video(monkeypatch):
    import app as app_module

    monkeypatch.setattr(app_module, "SERVERLESS_DEMO", True)
    response = client.post(
        "/api/sessions",
        files={"video": ("small.mp4", io.BytesIO(b"demo"), "video/mp4")},
    )
    assert response.status_code == 200
    assert response.json() == {"session_id": "prerecorded-demo"}
    assert app_module._find_recording("prerecorded-demo") is None


def test_serverless_pantry_is_read_only(monkeypatch):
    import app as app_module

    monkeypatch.setattr(app_module, "SERVERLESS_DEMO", True)
    pantry = client.get("/api/pantry").json()
    response = client.put("/api/pantry", json=pantry)
    assert response.status_code == 503
    assert "disabled" in response.json()["detail"]
    assert client.post("/api/pantry/reset").status_code == 200
