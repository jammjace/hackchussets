# Backend: Modules B and C

Sodium engine (Module B) plus the API the web app calls (Module C backend).
It follows the team README: `session_id` per recording, `event_id` as the join key,
evidence JPEGs served by URL, video seekable by `timestamp`.

## Run it locally (PowerShell)

From the repository root:

```powershell
python -m pip install -e ".[dev]"
python -m pip install -r backend\requirements.txt
$env:MODULE_A_MODE = "mock"
Set-Location backend
python -m uvicorn app:app --reload --port 8000
```

In a second PowerShell window:

```powershell
Set-Location web
npm ci
$env:NEXT_PUBLIC_API_BASE = "http://localhost:8000"
npm run dev
```

Open `http://localhost:3000` and upload `samples/test1.mp4` (salt) or
`samples/test2.mp4` (oil). In mock mode those exact videos run through the
real OpenCV and Module A pipeline using deterministic recorded Qwen responses;
Qwen is never imported or loaded. `POST /api/sessions/demo` and unrecognised
uploads continue to use the original six-event UI fixture.

| Env var | Default | Meaning |
|---|---|---|
| `MODULE_A_MODE` | `mock` | `mock` uses recorded sample predictions without Qwen/GPU; `real` lazily loads one shared Qwen model |
| `STORAGE_DIR` | `backend/storage` | Where recordings and sessions live |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated frontend origins |
| `CORS_ORIGIN_REGEX` | unset | Optional Python regular expression for allowed preview origins |
| `SERVERLESS_DEMO` | unset | `true` makes the reviewed demo stateless for Vercel |

For the hackathon prerecorded-inference demonstration, set
`MODULE_A_MODE=prerecorded_demo`. Every valid uploaded video remains available
for playback, while ingredient events come from
`backend/demo_fixtures/cooking_40s/events.json`. The results API identifies
this mode so the frontend can disclose that the AI results are prerecorded.

### Vercel public-demo mode

Deploy `backend/` as its own Vercel project and set `SERVERLESS_DEMO=true`.
The fixed `prerecorded-demo` session is rebuilt from the bundled reviewed
fixture on every results request, so it does not depend on Vercel's ephemeral
filesystem. Pantry writes are intentionally disabled. Small uploads can enter
the same prerecorded experience, but the uploaded video is not retained and
cannot be played back after the request; use the no-video demo for judging.

## Files

| File | What it does | Who changes it |
|---|---|---|
| `sodium_engine/engine.py` | Module B: events + pantry in, sodium per `event_id` out. Pure functions | You |
| `sodium_engine/pantry_default.json` | Hardcoded pantry: aliases, units, products, sodium per unit | You |
| `module_a_bridge.py` | Converts Module A `ingredients.json` output into the stable `events.json` contract | You + Jace |
| `fixtures/mock_events.json` | Fake Module A output in the README section 6 format | Nobody, it's the contract example |
| `app.py` | FastAPI routes below | You |

## API for the frontend

| Method and path | Does | Returns |
|---|---|---|
| `GET /api/health` | Check the server is up | `{"status":"ok"}` |
| `GET /api/pantry` | Current pantry | pantry JSON |
| `PUT /api/pantry` | Save edited or added pantry items | pantry JSON |
| `POST /api/pantry/reset` | Back to the default pantry | pantry JSON |
| `POST /api/sessions` | Upload video (form field `video`), create session, run Module A | `{"session_id":"cooking_001"}` |
| `POST /api/sessions/demo` | Session with mock events, no video | `{"session_id":"cooking_002"}` |
| `GET /api/sessions/{id}/results` | Events joined with sodium, sorted by time | see below |
| `GET /api/sessions/{id}/evidence/{event_id}.jpg` | Evidence image | JPEG |
| `GET /api/sessions/{id}/video` | Original recording, supports seeking | video |

### `GET /api/sessions/{id}/results`

```json
{
  "session_id": "cooking_001",
  "video_url": "/api/sessions/cooking_001/video",
  "timeline": [
    {
      "event_id": "event_001",
      "timestamp": 9.5,
      "timestamp_start": 8.0,
      "timestamp_end": 11.5,
      "ingredient": "chicken bouillon",
      "quantity": 1,
      "unit": "cube",
      "evidence_url": "/api/sessions/cooking_001/evidence/event_001.jpg",
      "sodium_mg": 2080.0,
      "status": "ok",
      "product_name": "Knorr Chicken Flavor Bouillon Cube (24 ct, US)",
      "cumulative_mg": 2080.0
    },
    {
      "event_id": "event_006",
      "timestamp": 105.0,
      "ingredient": "oyster sauce",
      "quantity": 1,
      "unit": "tablespoon",
      "evidence_url": null,
      "sodium_mg": null,
      "status": "unrecognised_ingredient",
      "product_name": null,
      "cumulative_mg": 5163.3
    }
  ],
  "total_sodium_mg": 5163.3,
  "daily_limit_mg": 2300,
  "percent_of_daily_limit": 224.5,
  "is_incomplete": true,
  "warnings": ["'oyster sauce' isn't in the pantry, so the real total is higher."]
}
```

(Second row trimmed; every row has all fields.)

Frontend rules:

- Seek the video with `video.currentTime = row.timestamp`.
- Image and video URLs are relative: prefix them with the backend address (`http://localhost:8000`).
- `video_url` and `evidence_url` can be `null`: show a placeholder.
- `sodium_mg: null` means "not counted", never show it as 0. Use `status` for the badge.
- `quantity` may be null when the model confirms an addition but cannot estimate its full amount.
- `status` is one of `ok`, `unrecognised_ingredient`, `unsupported_unit`, `not_confirmed`, `incomplete_quantity`.
- `incomplete_quantity` is never treated as zero. When a known subtotal exists, sodium and the dish total are lower bounds.
- The total is for the whole dish, not per person.

## Agree with Jace before integrating

1. **Ingredient names:** lowercase generic nouns ("soy sauce", not "Kikkoman"). Anything not in a pantry alias list is flagged.
2. **Units:** `teaspoon`, `tablespoon`, `cup`, `ml`, `g`, `cube`, `packet`, `piece`. Common spellings (`tbsp`, `tsp`, `cubes`) are already handled.
3. **Output location:** his pipeline writes `events.json` and `evidence/<event_id>.jpg` into the `session_dir` that `module_a_bridge.run_real()` passes him.
4. **Timing:** `POST /api/sessions` waits for Module A to finish. Fine for short clips; for long ones, show a processing screen.
