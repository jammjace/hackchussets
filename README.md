# Sodium Tracking AI — Cooking Video Analysis

## 1. Product Overview

We are building an AI-powered sodium-tracking web application that estimates the sodium content of meals by analyzing ingredients added during cooking.

The product aims to help individuals, particularly those managing hypertension, understand their sodium intake without manually logging every ingredient.

### User Experience

1. The user records a cooking video using a head-mounted camera or uploads an existing recording.
2. The application processes the recorded video using computer vision.
3. The system identifies measurable ingredient-addition events.
4. Each event records the ingredient, estimated quantity, unit, and time of addition.
5. A separate calculation module estimates the sodium contribution of each ingredient.
6. The webapp displays a **clickable cooking timeline**, showing the ingredient, quantity, estimated sodium contribution, and supporting image.
7. Clicking an event allows the user to jump to the corresponding timestamp in the original video.

**The goal is to turn cooking footage into an interactive, timestamped record of ingredient additions and their estimated sodium contributions.**

The system provides estimates, not medical-grade measurements. Ingredients with unmeasurable quantities may be omitted.

---

## 2. Full Product Architecture

```text
                USER
                  |
                  v
      Record / Upload Cooking Video
                  |
                  v
       Generate Unique Session ID
                  |
                  v
    MODULE A — INGREDIENT DETECTION
    -------------------------------
           VideoProcessor
                  |
                  v
        OpenCV FrameExtractor
      4-second analysis windows
      Configurable stride, 2 FPS
                  |
                  v
       Vision-Language Model
       GPT-4.1 mini (initial)
                  |
                  v
       IngredientEventTracker
       - Confirm additions
       - Identify ingredients
       - Preserve quantities/units
       - Deduplicate observations
       - Preserve timestamps
       - Assign unique event IDs
       - Select evidence frames
                  |
                  v
          TWO OUTPUT ARTIFACTS
         /                    \
        v                      v
  events.json             Evidence JPEGs
        |                      |
        v                      |
    MODULE B                   |
   Sodium Engine               |
   - Ingredient DB             |
   - Unit conversion           |
   - Sodium lookup             |
   - Sodium totals             |
        |                      |
        v                      |
   Sodium Results              |
        |                      |
        +-----------+----------+
                    |
                    v
      MODULE C — WEB APPLICATION
      --------------------------
      Interactive Cooking Timeline
      - Ingredient
      - Detected quantity
      - Sodium contribution
      - Evidence image
      - Seek original video
```

Modules communicate through structured data contracts rather than depending on each other's internal implementations.

---

## 3. Team Responsibilities

### Module A — Ingredient Detection

**Owner: Video processing and computer vision developer**

Responsibilities:

- Accept and validate recorded cooking videos.
- Extract timestamped frames using OpenCV.
- Process frame sequences with a vision-language model.
- Detect ingredient-addition actions.
- Identify ingredients and estimate quantities.
- Preserve original measurement units.
- Deduplicate overlapping detections.
- Track genuine repeated additions.
- Preserve event timestamps.
- Assign unique event IDs.
- Save one representative evidence JPEG per event when available.
- Export structured JSON under the recording's session directory.

Module A does not identify brands, convert quantities into nutritional units, or calculate sodium.

### Module B — Sodium Calculation

**Owner: Ingredient database and calculation developer**

Responsibilities:

- Maintain a hardcoded database of supported ingredients, products, brands, unit conversions, and sodium concentrations.
- Receive Module A's JSON events.
- Match detected ingredients to database entries.
- Convert quantities into appropriate units.
- Calculate sodium contribution for each addition.
- Aggregate total sodium for the recipe.
- Return results linked to the original `event_id`.

Module B does not need to process the original video or evidence images.

### Module C — Web Application

**Owner: Frontend and integration developer**

Responsibilities:

- Allow users to record or upload videos.
- Generate or coordinate recording sessions.
- Submit videos for backend processing.
- Trigger Modules A and B.
- Display ingredient-addition events chronologically.
- Display per-event sodium contributions.
- Display evidence images.
- Seek the original video to an event's timestamp.
- Display total estimated sodium and incomplete-estimate warnings.

The MVP uses post-recording processing, not livestream analysis.

---

## 4. Module A — Video Processing Pipeline

### VideoProcessor

- Accepts a recorded cooking video.
- Validates the file.
- Retrieves video metadata, including FPS, resolution, and duration.
- Maintains a reference to the original recording.

### OpenCV FrameExtractor

Extracts chronological frame sequences from the recording.

Initial settings:

| Parameter | Initial value |
|---|---|
| Video format | MP4 |
| Analysis window | 4 seconds |
| Window stride | Configurable, initially 2 seconds |
| Sampling rate | 2 FPS |
| Frames per full window | 8 |
| Image format | JPEG |
| Timestamp units | Seconds from start of original recording |

Frame extraction should:

- Preserve original timestamps.
- Support overlapping and nonoverlapping windows.
- Resize and compress images before VLM input.
- Process sequences incrementally to avoid unnecessary memory usage.
- Make relevant frames available for evidence selection.

### IngredientDetector

The initial VLM is GPT-4.1 mini, through an interchangeable model adapter.

It analyzes ordered images to identify:

- Ingredient name.
- Visible ingredient addition.
- Numeric quantity, when measurable.
- Original observed unit.
- Approximate timing of addition.

The model must not invent quantities when there is insufficient visual evidence.

Alternative local vision-language models may be integrated later.

### IngredientEventTracker

Receives structured observations from the VLM.

Responsibilities:

1. Identify valid addition events.
2. Reject unmeasured or uncertain additions.
3. Merge duplicate observations from overlapping windows.
4. Preserve separate genuine additions.
5. Assign a unique `event_id` to each confirmed addition.
6. Preserve start, end, and estimated addition timestamps.
7. Select one representative evidence frame.
8. Save the evidence image using the matching event ID.
9. Export events in chronological order.

The Event Tracker produces JSON-compatible data. No separate JSON event-processing module is necessary.

---

## 5. Session-Based Storage and Event Identification

**Every cooking recording must be associated with a unique `session_id`.**

Each session has its own directory containing the event JSON and evidence images.

### Required Storage Structure

```text
storage/
  recordings/
    cooking_001.mp4
    cooking_002.mp4

  sessions/
    cooking_001/
      events.json
      evidence/
        event_001.jpg
        event_002.jpg
        event_003.jpg

    cooking_002/
      events.json
      evidence/
        event_001.jpg
        event_002.jpg
```

### Naming Rules

- `session_id` identifies a cooking session.
- `event_id` identifies a specific ingredient-addition event within that session.
- Each confirmed addition receives its own event ID.
- Each evidence image must be named after the corresponding event ID.
- For example, `event_001` maps to `event_001.jpg`.
- Repeated additions of the same ingredient receive different event IDs.
- Event IDs may repeat across different sessions because the session ID distinguishes them.
- A session folder must never overwrite another session's data.

**The combination of `session_id` and `event_id` uniquely identifies an ingredient addition across the application.**

### Evidence Image Rules

For every exported event:

- Save at most one JPEG evidence image.
- Use the event ID as the filename.
- Prefer a frame showing the ingredient being added to the cooking vessel.
- Preserve the source video's timestamp for the selected evidence frame.
- Do not fabricate an image if a suitable frame is unavailable.
- If no suitable frame exists, set `evidence_frame` to `null`.
- Do not store Base64 image data in `events.json`.
- Do not permanently save all extracted frames.

### Example

If salt is added twice:

```text
event_001 → First salt addition → event_001.jpg
event_002 → Second salt addition → event_002.jpg
```

They must remain separate events even though the ingredient name is identical.

---

## 6. Shared JSON Output Contract

The JSON file must include the session ID and the detected ingredient events.

### Example `events.json`

```json
{
  "session_id": "cooking_001",
  "events": [
    {
      "event_id": "event_001",
      "timestamp_start": 12.5,
      "timestamp_end": 15.2,
      "timestamp": 13.5,
      "ingredient": "salt",
      "quantity": 0.5,
      "unit": "teaspoon",
      "addition_confirmed": true,
      "evidence_frame": "evidence/event_001.jpg"
    },
    {
      "event_id": "event_002",
      "timestamp_start": 25.0,
      "timestamp_end": 28.5,
      "timestamp": 26.0,
      "ingredient": "soy sauce",
      "quantity": 2,
      "unit": "tablespoon",
      "addition_confirmed": true,
      "evidence_frame": "evidence/event_002.jpg"
    }
  ]
}
```

The values above are illustrative.

### Field Definitions

| Field | Type | Description |
|---|---|---|
| `session_id` | String | Unique identifier for the cooking recording |
| `event_id` | String | Unique ingredient-addition ID within the session |
| `timestamp_start` | Float | Beginning of addition interval |
| `timestamp_end` | Float | End of addition interval |
| `timestamp` | Float | Best estimated moment of addition |
| `ingredient` | String | Identified ingredient |
| `quantity` | Float | Detected numerical quantity |
| `unit` | String | Original observed measurement unit |
| `addition_confirmed` | Boolean | True for exported events |
| `evidence_frame` | String or null | Relative path to corresponding JPEG |

### Timestamp Rules

All timestamps refer to the original recording, in seconds.

For example:

- Analysis window: 120–124 seconds.
- Ingredient added at approximately 122 seconds.
- Event `timestamp`: approximately `122.0`.

The frontend uses `timestamp` to seek within the original recording.

Do not substitute the beginning of the analysis window for the actual addition timestamp.

Timestamps reflect available visual evidence and may not be frame-perfect.

### Strict Event Filtering

Only export an event when:

1. The ingredient is identifiable.
2. The addition is confirmed.
3. A positive numeric quantity is available.
4. A recognizable measurement unit is available.

Exclude:

- Pinches.
- Unmeasured pours.
- Unknown quantities.
- Uncertain additions.
- Ingredients merely picked up or displayed.
- Duplicate observations of one addition.

An excluded event is not equivalent to zero sodium. Missing quantities make the sodium estimate incomplete.

### Quantity Rules

Preserve the original detected quantity and unit.

| Ingredient | Quantity | Unit |
|---|---:|---|
| Salt | 0.5 | teaspoon |
| Soy sauce | 2 | tablespoon |
| Onion | 1 | piece |
| Chopped tomato | 1 | cup |

Module A must not convert these values into grams, milliliters, or sodium measurements.

---

## 7. Module A Output Artifacts

Each completed session should produce:

```text
cooking_001/
  events.json
  evidence/
    event_001.jpg
    event_002.jpg
```

Module A also preserves a reference to the original recording.

### `events.json`

Used by:

- Module B for sodium calculation.
- Module C for timeline construction.

Contains:

- Session ID.
- Event IDs.
- Ingredient names.
- Quantities and units.
- Event timestamps.
- Evidence-image references.

### Evidence JPEGs

Used by:

- Module A for debugging detections.
- Module C to display timeline thumbnails and visual evidence.

Module B does not need to read the JPEG files.

### Original Recording

Used by:

- Module A for video analysis and frame extraction.
- Module C for video playback and timestamp seeking.

The original video should remain associated with the session until the results no longer need it.

---

## 8. Module B — Sodium Calculation Integration

Module B receives the event list from Module A.

Example:

```python
events = pipeline_result.events

# Module B implementation
sodium_results = sodium_calculator.calculate(events)
```

Module B is responsible for:

1. Looking up ingredients in the database.
2. Applying ingredient-specific unit conversions.
3. Retrieving sodium concentrations.
4. Calculating sodium per addition.
5. Aggregating total sodium.

### Required Output Contract

Every sodium result must preserve the original `event_id`.

Example:

```json
{
  "session_id": "cooking_001",
  "results": [
    {
      "event_id": "event_001",
      "sodium_mg": 1180
    },
    {
      "event_id": "event_002",
      "sodium_mg": 950
    }
  ],
  "total_sodium_mg": 2130
}
```

Values are illustrative.

Module B should not modify:

- Event IDs.
- Event timestamps.
- Evidence image references.
- Original detected quantities or units.

If an ingredient is unsupported by the database, the calculator should flag it rather than assign zero sodium.

---

## 9. Module C — Interactive Cooking Timeline

The webapp combines:

- Original cooking recording.
- Module A's `events.json`.
- Module A's evidence JPEGs.
- Module B's sodium calculations.

### Example Timeline

```text
COOKING SESSION: cooking_001

Original Cooking Video
[Video Player]

Detected Ingredient Timeline
----------------------------------

00:13 — Salt
         Quantity: 0.5 teaspoon
         Sodium: Module B result
         Image: event_001.jpg

00:26 — Soy Sauce
         Quantity: 2 tablespoons
         Sodium: Module B result
         Image: event_002.jpg
```

### Click Behavior

When a user selects an event:

1. Identify the event using `session_id` and `event_id`.
2. Display the ingredient name and quantity.
3. Display its sodium contribution from Module B.
4. Load the corresponding evidence image, if available.
5. Seek the original recording to the event's `timestamp`.

### Linking Data Across Modules

| Identifier | Purpose |
|---|---|
| `session_id` | Locate the recording and all associated results |
| `event_id` | Match an addition to its sodium result |
| `timestamp` | Seek to the addition in the original video |
| `evidence_frame` | Retrieve the event's supporting image |

The frontend should use `event_id` as the join key within each session.

---

## 10. Serving Evidence Images to the Webapp

Evidence images are stored as JPEG files, not inside JSON.

For local development, Module A may output:

```text
evidence/event_001.jpg
```

Module C cannot automatically access backend filesystem paths.

The backend integration layer must make these images available using an accessible URL.

Example endpoint:

```text
GET /api/sessions/cooking_001/evidence/event_001.jpg
```

The backend resolves this request to:

```text
storage/sessions/cooking_001/evidence/event_001.jpg
```

The backend should validate session IDs and filenames, and prevent access to files outside the configured storage directory.

### Storage Approach for MVP

Use local filesystem storage when the backend components share the same filesystem.

If Module C is deployed separately, expose the images through a backend API or shared object storage.

The same approach applies to original video playback.

Module A remains responsible for generating events and images, not implementing frontend delivery infrastructure.

---

## 11. Python Project Structure

Module A uses the following planned architecture:

```text
src/
  ingredient_detection/
    models/
      video.py
      frames.py
      ingredient_event.py

    interfaces/
      frame_extractor.py
      vision_model.py

    services/
      video_processor.py
      frame_extractor.py
      ingredient_detector.py
      event_tracker.py

    pipeline/
      cooking_pipeline.py

    adapters/
      openai_vision.py

tests/
examples/
pyproject.toml
README.md
.env.example
```

The existing repository should remain the source of truth for exact filenames and implemented classes.

Do not introduce unnecessary layers or duplicate services when implementing the timeline features.

---

## 12. Development Setup

Install development dependencies:

```bash
pip install -e ".[dev]"
```

Run tests:

```bash
pytest
```

Run the mock pipeline:

```bash
python examples/run_mock_pipeline.py
```

For eventual API integration:

```bash
cp .env.example .env
```

Place API credentials in `.env`.

The setup commands assume the matching project files exist and have been configured.

Do not commit API keys, cooking videos, or evidence images to Git.

---

## 13. Development Status

### Module A — Ingredient Detection

Previously scaffolded:

- Pydantic models.
- OOP interfaces.
- Frame-window calculation logic.
- Event Tracker.
- Mock model adapter.
- Initial unit tests.

Newly confirmed requirements:

- Session-level organization.
- Stable event IDs unique within a session.
- Event timestamps for timeline seeking.
- One evidence JPEG per event when available.
- Evidence filename matching its event ID.
- JSON paths referencing the corresponding JPEGs.
- Session-specific output directories.

Remaining work:

1. Implement actual OpenCV frame extraction.
2. Implement VLM inference.
3. Integrate real ingredient observations with the Event Tracker.
4. Implement event timestamp estimation.
5. Implement evidence-frame selection and saving.
6. Export session-organized JSON and JPEG files.
7. Test with recorded cooking videos.

These new features are planned requirements and are not necessarily implemented yet.

### Module B — Sodium Calculation

Developed independently by a teammate.

### Module C — Web Application

Developed independently by a teammate.

---

## 14. MVP Success Criteria

The MVP should demonstrate:

1. User records or uploads a cooking video.
2. The backend associates it with a unique session ID.
3. OpenCV extracts timestamped frame sequences.
4. The VLM identifies measurable ingredient additions.
5. The Event Tracker removes duplicates.
6. Each valid addition receives a unique event ID.
7. Each event includes ingredient, quantity, unit, and timestamps.
8. A representative JPEG is saved for each event when available.
9. Each JPEG filename matches its event ID.
10. The session's `events.json` references the correct JPEGs.
11. Module B calculates sodium for each event.
12. Module C displays the clickable timeline.
13. Clicking an event reveals the image and seeks the original video.
14. The webapp displays the recipe's total estimated sodium and relevant limitations.

### Known Limitations

- Sparse sampling may miss short additions.
- Quantities may be difficult to infer from visual footage.
- Unmeasured additions are excluded.
- Ingredient recognition can be incorrect.
- Evidence frames may not show the exact addition moment.
- The final sodium total may be incomplete.
- The product does not provide medical-grade sodium measurements.

---

## 15. Future Improvements

Potential extensions include:

- Real-time frame processing.
- Smarter candidate-event detection.
- Audio-assisted ingredient recognition.
- Better visual volume estimation.
- Detection of unmeasured pours.
- Locally hosted open-weight vision-language models.
- User correction of ingredient quantities.
- Expanded ingredient and product databases.
- Serving-size calculations.

These are outside the current hackathon MVP.

---

## 16. Summary — Shared Team Contract

### Module A — Ingredient Detection

**Input:** Recorded cooking video and session ID.

**Output:**

- `events.json`, with event IDs, ingredient details, quantities, units, timestamps, and evidence references.
- Up to one JPEG image per confirmed event.
- Reference to the original recording.

### Module B — Sodium Calculation

**Input:** Module A's structured events.

**Output:**

- Sodium contribution per event, linked by `event_id`.
- Total estimated recipe sodium.

### Module C — Web Application

**Input:**

- Original recording.
- Module A's event JSON.
- Evidence JPEG images.
- Module B's sodium results.

**Output:** Clickable ingredient-addition timeline and sodium dashboard.

### Final Integration Rules

- `session_id` uniquely identifies the cooking session.
- `event_id` uniquely identifies an addition within that session.
- `(session_id, event_id)` uniquely identifies an addition across the application.
- `event_001` corresponds to `event_001.jpg` when evidence is available.
- `timestamp` determines where the video player seeks.
- `evidence_frame` references the saved JPEG.
- `ingredient`, `quantity`, and `unit` provide Module B's calculation inputs.
- Module B preserves event IDs when returning sodium results.
- Module C joins Module A and B outputs using the session and event IDs.

**One ingredient addition = one event record + at most one corresponding evidence image.**

---

## Module A quick start

Install and test the implementation:

```bash
pip install -e ".[dev]"
pytest
```

Construct `CookingPipeline` with `VideoProcessor`, `SlidingWindowFrameExtractor`,
`IngredientDetector(OpenAIVisionModel(...))`, and `IngredientEventTracker`, then call:

```python
result = pipeline.process("storage/recordings/cooking.mp4", session_id="cooking_001")
```

This writes `storage/sessions/cooking_001/events.json` and at most one JPEG per
confirmed event under its `evidence/` directory. Existing session directories are
never overwritten. Set `OPENAI_API_KEY` in a local `.env` or your process environment;
never commit the key.

---

## Qwen interval experiment

The intermediate Qwen path reuses `VideoProcessor` and the OpenCV frame
extractor. It samples RGB frames at local timestamps 0, 1, 2, and so on,
creates eight adjacent intervals for an eight-second clip, and produces
validated per-interval predictions. It does not aggregate quantities or write
the production ingredient-event JSON.

The confirmed benchmark mapping is stored in
`samples/benchmark_mapping.json`:

- `test1.mp4` is `P12_101` (`salt`).
- `test2.mp4` is `P22_113` (`oil`).

Run the recorded Kaggle fixtures locally without loading Qwen:

```bash
python examples/run_qwen_intervals.py --video samples/test1.mp4 --mode mock
python examples/run_qwen_intervals.py --video samples/test2.mp4 --mode mock
```

For Kaggle GPU inference, upload the repository and clips, enable a GPU, then:

```bash
pip install -e ".[qwen]"
python examples/run_qwen_intervals.py --video samples/test1.mp4 --mode qwen
```

The real adapter loads `Qwen/Qwen3-VL-2B-Instruct` and its processor once,
uses deterministic generation with `max_new_tokens=180`, and retains each raw
model response alongside its validated intermediate prediction.
