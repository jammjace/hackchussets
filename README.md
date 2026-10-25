# Sodium Tracking AI — Cooking Video Analysis
## Try NaH — Interactive Demo

Experience how NaH uses AI to identify cooking ingredients and estimate sodium intake.

### How to Use the Demo

**Option 1: Upload a Video**

1. Open the NaH web application.
2. Click **Upload** and select a video from your device.
3. Follow the on-screen instructions to process the upload.
4. Explore the ingredient timeline, estimated quantities, and sodium dashboard.

**Option 2: Try the Demo Without a Video**

1. Open the NaH web application.
2. Click **"I have no video, try demo"**.
3. Explore a sample cooking session with prerecorded AI predictions.
4. Review the detected ingredients, sodium estimates, and timestamped cooking events.

### Important Demo Information

NaH currently uses prerecorded ingredient predictions generated using Qwen3-VL on Kaggle. Both options demonstrate the same prepared analysis rather than running live inference on uploaded videos.

Ingredient quantities are AI estimates and may be uncertain. The results are intended to demonstrate the application, not provide medical or dietary advice.

**Hackathon prototype | Computer vision + sodium estimation + interactive cooking timeline**

Sodium Tracking AI helps people understand the estimated sodium content of a home-cooked meal **without manually logging every ingredient**. A user records their cooking, uploads the video, and reviews a timeline of ingredients added, estimated quantities, and sodium contributions.

> **Prototype notice:** All quantities and sodium totals are estimates. This is not a medical-grade measurement tool or a substitute for nutritional or clinical guidance. The complete integrated application is being validated; real GPU inference has been verified separately on an 8-second salt clip.

## Contents

1. [Product overview](#product-overview)
2. [Architecture](#architecture)
3. [Modules and ownership](#modules-and-ownership)
4. [Repository structure](#repository-structure)
5. [Current implementation status](#current-implementation-status)
6. [Quick start: mock web app](#quick-start-mock-web-app)
7. [Run Module A locally](#run-module-a-locally)
8. [Run real Qwen inference on Kaggle](#run-real-qwen-inference-on-kaggle)
9. [Data contracts](#data-contracts)
10. [API and frontend](#api-and-frontend)
11. [Testing](#testing)
12. [Demo plan](#demo-plan)
13. [Limitations and roadmap](#limitations-and-roadmap)
14. [References and credits](#references-and-credits)

## Product overview

### The problem

Sodium consumed during home cooking can be hard to track. Most food-logging apps require manual ingredient entry, including quantities that the cook may not measure. This adds friction, especially when ingredients are sprinkled or poured directly into a dish.

### Our solution

1. **Record** a cooking session using a head-mounted camera or existing video.
2. **Detect** ingredients being added, using a vision-language model.
3. **Estimate** quantities from the visual addition sequence.
4. **Calculate** an estimated sodium contribution using a pantry/ingredient database.
5. **Explore** the cooking timeline: see each ingredient, its estimated quantity, its sodium contribution, and the relevant moment in the video.

The current MVP processes recordings **after cooking**, not as a live camera stream.

### What makes this different

- Hands-free ingredient logging during cooking.
- Ingredient *addition* detection rather than recognizing everything visible in a frame.
- Timestamped events linked to the source video.
- Clear handling of uncertain or missing measurements.
- An integrated path from computer vision to nutrition information.

## Architecture

```text
                   Cooking video (.mp4)
                            |
                            v
                    FastAPI upload API
                    Session + video storage
                            |
                            v
              MODULE A — COMPUTER VISION
             OpenCV video / frame extraction
                            |
                            v
                  Qwen3-VL-2B-Instruct
            1. Discover ingredients added
            2. Estimate amount per 1s interval
                            |
                            v
                   Quantity aggregation
                  ingredients.json (internal)
                            |
                            v
                   Module A / B bridge
                   events.json (shared)
                            |
                            v
                MODULE B — SODIUM ENGINE
             Pantry lookup + unit conversion
               Sodium per event and total
                            |
                            v
              MODULE C — WEB APPLICATION
           Next.js dashboard + FastAPI APIs
          Timeline / warnings / video seeking
```

**Two execution modes** are planned/used for integration:

- **Mock mode:** returns deterministic previously recorded sample predictions. Runs locally without GPU. Useful for developing the full web app.
- **Real mode:** runs Qwen3-VL-2B on a GPU to analyze the submitted video. Tested independently in Kaggle; connecting GPU execution to the full web app is an ongoing deployment task.

## Modules and ownership

### Module A — Ingredient detection and quantity estimation

**Stack:** Python, OpenCV, Pillow, PyTorch, Hugging Face Transformers, Pydantic, Qwen3-VL-2B-Instruct.

The currently validated Qwen-based path performs:

1. Validate the video and read FPS/duration.
2. Sample chronological frames at **1 FPS** for inference.
3. Resize frames to **768 pixels wide**, preserving aspect ratio, and convert to RGB.
4. Run a **whole-short-clip ingredient discovery pass** using chronological frames. Return generic ingredient names (`salt`, `soy sauce`, `cinnamon`, etc.), timestamps, and confidence. Brands are not required.
5. For each detected ingredient, examine **two frames bounding each one-second interval**. Qwen predicts whether an addition occurred, an estimated amount in tablespoons, and confidence.
6. Aggregate non-overlapping, active intervals into distinct addition events. Keep repeated additions of the same ingredient separate.
7. Write structured `ingredients.json` with event IDs and timestamps.

The latest inference prompt uses deterministic generation (`do_sample=False`) with `max_new_tokens=180` for the interval stage. The model is loaded once per process and reused for discovery and interval estimation.

**Unknown and incomplete estimates:** If an ingredient cannot be identified, use `unknown`; if an addition is detected but its amount is not measurable, preserve a `null` quantity and an incomplete-estimate flag. Never interpret an unknown amount as zero.

**Important:** Discovery of multiple ingredients and frame selection for longer videos require more validation. The separately retained older GPT-4.1-mini/OpenCV event-tracker code is *not* the primary Qwen interval workflow.

### Module B — Sodium calculation

**Stack:** Python sodium engine, ingredient/pantry JSON database, conversion and alias rules.

- Match generic detected ingredients to pantry entries.
- Translate supported quantities into pantry-compatible units.
- Calculate estimated sodium for each recognized event.
- Sum event-level sodium into a meal estimate.
- Flag unsupported ingredients, units, or incomplete quantities instead of silently counting them as zero.

Module B is independent of video inference. It consumes structured event data joined by `event_id`.

### Module C — Web application

**Stack:** FastAPI backend, Next.js/React frontend.

The teammate's application includes or is designed around:

- Video upload and session creation.
- Pantry management.
- Demo/mock sessions.
- Results timeline and cumulative sodium.
- Video playback with seek-to-event timestamps.
- Evidence images when available, and placeholders otherwise.
- Incomplete-result warnings.

The backend provides the API and persistence seam between Module A and the frontend.

## Repository structure

The active integrated branch should resemble the following structure. Exact contents may change as branches are merged:

```text
hackchussets/
├── README.md
├── pyproject.toml
├── src/ingredient_detection/
│   ├── adapters/
│   │   ├── qwen_vision.py            # Real Qwen model / discovery
│   │   └── qwen_mock.py              # Recorded sample predictions
│   ├── models/
│   │   └── ingredient_export.py      # Export schema
│   ├── pipeline/
│   │   ├── automatic_ingredient_pipeline.py
│   │   └── qwen_interval_pipeline.py
│   └── services/
│       ├── interval_extractor.py
│       └── quantity_aggregator.py
├── examples/
│   ├── run_automatic_discovery.py
│   └── run_qwen_intervals.py
├── tests/
├── samples/
│   ├── test1.mp4                   # Local sample; may be gitignored
│   ├── test2.mp4                   # Local sample; may be gitignored
│   ├── clip_metadata.json
│   └── benchmark_mapping.json
├── backend/
│   ├── app.py
│   ├── module_a_bridge.py
│   ├── sodium_engine/
│   ├── fixtures/mock_events.json
│   ├── requirements.txt
│   └── storage/                    # Runtime-generated
└── web/
    ├── package.json
    └── ...                         # Next.js frontend
```

**Sample mapping:** `test1.mp4` = EPIC-KITCHENS `P12_101` (salt); `test2.mp4` = `P22_113` (oil). The source clips are trimmed to about eight seconds. They may not be committed to Git due to size and redistribution considerations.

## Current implementation status

| Component | Status | Evidence / caveat |
|---|---|---|
| OpenCV extraction and timestamps | Implemented and tested | One-second RGB frame intervals |
| Qwen automatic ingredient discovery | Real GPU test passed for salt | Correctly discovered `salt` in `test1.mp4` |
| Qwen interval quantity estimates | Real GPU test passed for salt | 8/8 intervals processed |
| Quantity aggregation | Implemented; mock-tested | Example: four × 0.5 tbsp → 2.0 tbsp |
| `ingredients.json` export | Implemented; mock-tested | Latest Codex report: 53 tests passed for Module A |
| Sodium engine + backend | Teammate implementation present | Integrated behavior needs final verification |
| Next.js frontend | Teammate implementation present | Dependency/build verification may be ongoing |
| Module A → backend `events.json` bridge | Integration work | Verify mode and nullable-quantity handling on the merged branch |
| Full web app with mock inference | Integration target | Do not claim complete until upload/results/timeline are exercised |
| Live GPU inference from web upload | Not yet deployed | Kaggle used for standalone GPU experiments |
| Full 40-second video reliability | Not yet established | Requires performance and accuracy testing |

**Real sample result:** On `test1.mp4`, Qwen discovered salt from 0–4 seconds and predicted `0.5` tablespoon in each of four active one-second intervals. The aggregate estimate is **2.0 tablespoons**. This is a model estimate, **not a ground-truth measurement**.

## Quick start: mock web app

Mock mode is the recommended way to test the integration without running GPU inference. Run the backend and frontend in **separate terminals** from the repository root.

### Prerequisites

- Git
- Python and `pip` (use the versions supported by `pyproject.toml` and `backend/requirements.txt`)
- Node.js and npm compatible with the `web/package.json` Next.js version
- The branch containing both the Module A and teammate app files

### 1. Get the project

```bash
git clone https://github.com/jammjace/hackchussets.git
cd hackchussets
git switch integration   # or your actual integrated branch
```

If the integration branch has not been pushed, fetch it first or use the branch currently containing Modules A, B and C.

### 2. Start FastAPI (mock mode)

```bash
cd backend
python -m pip install -r requirements.txt
```

Set `MODULE_A_MODE=mock` in the backend environment (the teammate's original backend also defaults to mock):

```powershell
# PowerShell
$env:MODULE_A_MODE = "mock"
python -m uvicorn app:app --reload --port 8000
```

macOS/Linux equivalent:

```bash
export MODULE_A_MODE=mock
python -m uvicorn app:app --reload --port 8000
```

Verify: `http://localhost:8000/api/health` should return `{"status":"ok"}`.

### 3. Start Next.js

In a second terminal:

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000`.

The backend defaults to a local frontend origin of `http://localhost:3000`. If the UI cannot access the backend, check the frontend's API base URL configuration and the backend's `CORS_ORIGINS` value. Refer to the integrated branch's environment files for exact settings.

### 4. Exercise the mock flow

1. Open the web app.
2. Create a demo session or upload a supported sample video.
3. Confirm a session ID is returned and the backend writes `events.json`.
4. Open results, inspect sodium calculations and warnings, and click an event to seek to its video timestamp.

**Mock limitation:** Pre-recorded inference is meaningful only for matching test assets. An arbitrary video uploaded in mock mode is not analyzed by Qwen. Depending on which fixture the integrated bridge selects, mock output may be a generic demonstration rather than a prediction for the uploaded file.

## Run Module A locally

Install the Python project from the repository root:

```bash
python -m pip install -e .
```

Run mock automatic discovery + aggregation:

```bash
python examples/run_automatic_discovery.py \
  --video samples/test1.mp4 \
  --mode mock \
  --output outputs/test1/ingredients.json
```

For the oil clip:

```bash
python examples/run_automatic_discovery.py \
  --video samples/test2.mp4 \
  --mode mock \
  --output outputs/test2/ingredients.json
```

On Windows PowerShell, use one line instead of `\` line continuations:

```powershell
python examples/run_automatic_discovery.py --video samples/test1.mp4 --mode mock --output outputs/test1/ingredients.json
```

This tests OpenCV, the model-output interface, aggregation, and export **without loading Qwen weights**.

## Run real Qwen inference on Kaggle

The real model was tested on a Kaggle GPU notebook. Kaggle is intended for development/testing, **not as a permanent publicly accessible inference backend**.

### Prerequisites

- A Kaggle notebook with GPU accelerator and internet access enabled.
- A checkout of the project branch containing the Qwen implementation.
- Sample MP4 files in `samples/` (uploaded separately if omitted from Git).

```python
%cd /kaggle/working
!git clone -b CVmodel --single-branch https://github.com/jammjace/hackchussets.git
%cd /kaggle/working/hackchussets
%pip install -e ".[qwen]"
```

Change `CVmodel` to the current integrated branch if appropriate.

```python
import torch
print("GPU available:", torch.cuda.is_available())
```

Run the complete model + export pipeline:

```bash
python examples/run_automatic_discovery.py \
  --video samples/test1.mp4 \
  --mode qwen \
  --output outputs/test1/ingredients.json
```

Optionally pass `--timestamp-offset 1892.945` for the EPIC-KITCHENS original-video time reference. **Do not** apply this offset to normal uploaded cooking videos; their timestamps start at zero.

The CLI prints discovery and interval predictions and saves a concise `ingredients.json`. The model must run on suitable GPU hardware for practical latency. In its current CLI form, each new Python process loads model weights again.

## Data contracts

### Module A internal export — `ingredients.json`

Illustrative output:

```json
{
  "session_id": "test1",
  "ingredients": [
    {
      "event_id": "event_001",
      "ingredient": "salt",
      "quantity": 2.0,
      "unit": "tablespoon",
      "quantity_source": "interval_visual_estimate",
      "timestamp_start": 0.0,
      "timestamp_end": 4.0,
      "addition_confirmed": true,
      "estimate_complete": true
    }
  ]
}
```

- `quantity` is **nullable** when the observed amount is unknown.
- An incomplete event may include `known_estimated_subtotal_tbsp` while keeping the main `quantity` null.
- `event_id` remains stable within a session, and repeated additions are separate events.
- Timestamps are seconds relative to the uploaded video, rounded for JSON output.
- Sodium is **not** calculated by Module A.

### Shared backend contract — `events.json`

The backend was originally built around this shape:

```json
{
  "session_id": "cooking_001",
  "events": [
    {
      "event_id": "event_001",
      "timestamp_start": 0.0,
      "timestamp_end": 4.0,
      "timestamp": 0.0,
      "ingredient": "salt",
      "quantity": 2.0,
      "unit": "tablespoon",
      "addition_confirmed": true,
      "evidence_frame": null,
      "quantity_source": "interval_visual_estimate",
      "estimate_complete": true
    }
  ]
}
```

**The Module A bridge must transform `ingredients` to `events`**, add the seek timestamp, and set `evidence_frame` to null when no suitable JPEG exists. The bridge must not convert unknown quantities to zero. The sodium engine and frontend must treat `quantity: null` as an incomplete estimate and surface a warning.

The shared contract belongs to the integration layer; do not force the Qwen adapter to emit backend-specific fields.

### Sodium results

The backend associates sodium contributions with `event_id`. Unsupported ingredients, unsupported units, and incomplete quantities should be explicit states. The total reflects only successfully calculated contributions, with a warning when it is incomplete.

## API and frontend

The teammate's FastAPI service exposes these routes:

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Service health |
| `GET` | `/api/pantry` | List pantry items |
| `PUT` | `/api/pantry` | Update pantry |
| `POST` | `/api/pantry/reset` | Reset pantry |
| `POST` | `/api/sessions` | Upload cooking video and create session |
| `POST` | `/api/sessions/demo` | Generate a demo/mock session |
| `GET` | `/api/sessions/{id}/results` | Timeline, sodium totals, warnings |
| `GET` | `/api/sessions/{id}/video` | Play/seek original video |
| `GET` | `/api/sessions/{id}/evidence/{event_id}.jpg` | Evidence image, where available |

The frontend uses each event's `timestamp` to seek the corresponding video. Missing evidence images should display a placeholder. The sodium total represents the **whole meal**, not a per-serving value.

**Processing behavior:** The teammate's original upload endpoint waits synchronously for Module A. For long real GPU jobs, a future version should return a session ID immediately, enqueue inference, and let the frontend poll for completion.

## Testing

### Module A

```bash
python -m pytest tests -q
```

Codex reported **53 passing tests** after implementing aggregation and JSON export. This is a historical reported result, not a guarantee that all subsequent merges pass.

### Backend

```bash
cd backend
python -m pytest -q
```

The teammate's backend README describes **22 tests** for its original mock/sodium implementation. Rerun these after integration.

### Frontend

```bash
cd web
npm install
npm run build
npm run lint
```

Run commands only if the corresponding scripts exist in `web/package.json`. Commit any required `package-lock.json` correction alongside dependency changes.

### Minimum integration acceptance checks

- Mock upload produces a session and valid `events.json`.
- Sodium results join to the correct `event_id`.
- A nullable quantity does not crash the sodium engine.
- Incomplete amounts do not masquerade as zero sodium.
- The frontend renders the timeline and warnings.
- Clicking an event seeks the correct position in the video.
- Real inference remains separate from mock test fixtures.

## Demo plan

For the hackathon, prioritize a reliable demonstration of the **complete user journey**:

1. Show head-mounted cooking footage and explain the hands-free tracking problem.
2. Open a completed session whose detections were **previously generated by real Qwen inference**.
3. Show generic ingredient names, visual quantity estimates, per-ingredient sodium and total sodium.
4. Click timeline events to jump back to the relevant moment of the video.
5. If time and GPU availability allow, show a separate short real-inference run as technical proof.

Preprocessed predictions should be **clearly labeled** as such. Do not imply a live analysis is occurring when the app is replaying stored results.

## Limitations and roadmap

### Known limitations

- **Quantity accuracy:** Estimates are inferred from sparse snapshots, not measured with calibrated equipment. The observed 2.0-tablespoon salt result has not been validated against known physical ground truth.
- **Visual ambiguity:** Salt, sugar and other white granules may appear similar without labels or contextual evidence.
- **Longer videos:** The current discovery pass was proven on an 8-second clip. Full 40-second recordings need discovery-window strategy and performance tests.
- **Latency:** GPU model loading and repeated per-interval inference are expensive. Loading once and reusing a long-lived GPU worker can reduce cold-start overhead.
- **GPU hosting:** Kaggle GPU notebooks are temporary experiments, not an always-on inference service. A deployed GPU worker/service is needed for arbitrary live uploads.
- **Sodium coverage:** Results depend on the available pantry database, aliases, unit conversions and quantities. Unsupported or unknown inputs must remain visible as incomplete estimates.
- **Evidence images:** Real Qwen's current automated export does not guarantee an evidence JPEG for each event. Missing evidence is represented as null.
- **Supported formats:** The original Module A validator was MP4-focused, while the backend may accept additional extensions. The integrated path must validate formats end to end.
- **Medical safety:** A sodium estimate may be significantly wrong and should not be used for clinical decisions.

### Next steps

1. Finish the mock-mode Module A/B/C integration and frontend build verification.
2. Run end-to-end acceptance tests for `events.json`, nullable quantities and results screens.
3. Run the **merged** pipeline in real Qwen mode on a GPU, not just the standalone Module A CLI.
4. Measure actual load, discovery and inference latency on a representative 40-second video.
5. Add scalable windowed ingredient discovery for longer footage.
6. Deploy a persistent or on-demand GPU inference worker and asynchronous session processing.
7. Evaluate ingredient identification, false additions, timestamps and estimated quantities on measured cooking examples.

## References and credits

- **Qwen3-VL-2B-Instruct** — vision-language model used for ingredient discovery and visual quantity estimation: <https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct>
- **OpenCV** — video decoding and frame extraction: <https://opencv.org/>
- **EPIC-KITCHENS** — source of the two short evaluation clips and action annotations: <https://epic-kitchens.github.io/>
- **EPIC-KITCHENS download tools**: <https://github.com/epic-kitchens/epic-kitchens-download-scripts>
- **FastAPI**: <https://fastapi.tiangolo.com/>
- **Next.js**: <https://nextjs.org/>

This repository is a team hackathon prototype. Follow the licensing and redistribution requirements of the source videos and model before publishing artifacts or deploying the application publicly.

---

## Module C — Implemented Frontend (Na(h))

This section documents what has actually been built for Module C. The app is
branded **Na(h)** ("Na" = sodium; add an "h" and it reads "nah"). It lives in
`web/` (Next.js App Router, TypeScript, Tailwind v4, shadcn/ui). See
`web/README.md` for run instructions and `KIRO_HANDOFF.md` for the API
contract the frontend consumes.

### Screens

- **Landing (`/`)** — a sticky bare wordmark plus a lavender "Start cooking"
  CTA, an animated hero (Instrument Serif headline with the element-tile motif,
  a glasses POV panel with live detection overlays, and a cook character joined
  by a dashed sightline), a "how it works" three-step section with
  illustrations, a "who it's for" section, and the "not medical advice"
  disclaimer. CTAs fade out and route; "Try a demo" starts a mock session.
- **How to record (`/how-to-record`)** — the recording instructions as a Step
  List, plus a "What counts" card (counted: spoon measures, whole cubes/packets;
  not counted: splashes, free pours, pinches).
- **Pantry (`/pantry`)** — view, edit, add, set-default and reset pantry
  products, grouped by category with source text, saved via the pantry API.
- **Receipt (`/pantry/receipt`)** — a mocked receipt scan that adds products to
  the pantry (clearly labelled as simulated).
- **Upload (`/upload`)** — a drop zone / file picker that validates video files
  and previews the selection.
- **Processing (`/processing`)** — posts the video to `POST /api/sessions`,
  shows a four-step ticker, then redirects to the results.
- **Results (`/results/[sessionId]`)** — the core analysis screen, below.

### Results analysis features

The results page fetches `GET /api/sessions/{id}/results` and renders:

1. **Video player** — seekable; a placeholder when the session has no video.
2. **Cooking journey** — a vertical spine with a playhead that travels down as
   the cook plays. Each addition pops out alternately left/right with its
   evidence photo, amount and sodium. The playhead follows the video's
   `currentTime` when a video exists, or self-drives for demo sessions. Clicking
   a card seeks the video to that moment.
3. **Dish total** — the total sodium as a large serif number that counts up,
   with a Sodium Meter comparing it against the 2,300 mg daily limit (the meter
   rescales and hatches the over-limit portion when the dish exceeds the limit).
4. **Incomplete notice** — lists warnings when some additions could not be
   counted, so the real total is understood to be higher.
5. **Cumulative sodium chart** — a step-area chart of the running total over
   time with a labelled daily-limit reference line.
6. **Biggest contributor and one easy swap** — both computed live from the
   counted (`ok`) timeline rows.

The whole page honours `prefers-reduced-motion` by showing the final state at
once.

### Design system and data rules honoured

The Na(h) kitchen-editorial design system (`design/style-guide`) is implemented
in the frontend. The UI enforces the product's hard rules: an over-limit
(chilli) colour is used only for a dish total at or above 2,300 mg, never for a
single addition; a `null` sodium value is shown as "Not counted", never as 0;
flagged rows are never hidden; and seeking/playhead position use each event's
`timestamp`. All backend access goes through `web/lib/api.ts`, and video is only
ever sent to `POST /api/sessions`.
