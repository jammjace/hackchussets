import io

import pytest
from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


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
