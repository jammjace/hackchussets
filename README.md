# Sodium Tracking AI — Cooking Video Analysis

## 1. Product Overview

We are developing an AI-powered sodium tracking application that estimates the sodium content of meals based on ingredients added during cooking.

The motivation is to help individuals, particularly those managing hypertension, better understand their sodium consumption without manually logging every ingredient.

### How the product works

Users record themselves cooking using a head-mounted camera or another camera that captures ingredient additions.

After recording, the application processes the video using computer vision to identify:

- What ingredients were added.
- How much of each ingredient was added.
- When each ingredient was added.

The detected ingredients and quantities are passed to a Python-based sodium calculation engine, which estimates the total sodium content of the cooked meal.

Results are presented through a web application.

**Our goal is to reduce manual food logging by automatically extracting ingredient quantities from cooking videos.**

The system provides estimates, not precise medical measurements. Ingredients with unmeasurable quantities may be omitted, meaning the calculated total may underestimate actual sodium content.

---

## 2. Full Product Architecture

```text
                  USER
                    |
                    v
        Record / Upload Cooking Video
                    |
                    v
          [1] Video Processing
                    |
                    v
          [2] Frame Extraction
           4-second video windows
           2-second stride, 2 FPS
                    |
                    v
          [3] Vision-Language Model
               GPT-4.1 mini
                    |
                    v
          [4] Ingredient Event Tracker
           - Identify ingredient
           - Identify quantity
           - Identify original unit
           - Confirm addition
           - Remove duplicates
                    |
                    v
          [5] Structured JSON Events
                    |
                    v
          [6] Sodium Calculation Engine
           - Ingredient database lookup
           - Unit conversion
           - Sodium concentration lookup
           - Sodium calculation
                    |
                    v
          [7] Final Nutritional Results
                    |
                    v
          [8] Web Application Dashboard
           - Ingredient timeline (video timestamp per addition)
           - Detected ingredients
           - Estimated quantities
           - Sodium per ingredient
           - Total estimated sodium
           - Incomplete estimate warnings
```

The system is divided into independently developed modules so teammates can work in parallel.

---

## 3. Team Responsibilities

### Module A — Ingredient Detection Pipeline

**Owner: Video processing and computer vision developer**

Scope:

1. Accept recorded cooking videos.
2. Extract sequential frames using OpenCV.
3. Group frames into overlapping analysis windows.
4. Send frame sequences to GPT-4.1 mini.
5. Identify ingredient-addition actions.
6. Identify ingredient names.
7. Estimate measurable ingredient quantities.
8. Track events and remove duplicate detections.
9. Export structured ingredient events as JSON-compatible objects.

**Module A must not perform nutritional calculations, unit conversions, or brand lookups.**

The output is a list of detected ingredient-addition events.

### Module B — Sodium Calculation Engine

**Owner: Nutritional database and calculation developer**

Scope:

1. Develop a hardcoded ingredient/product database.
2. Store ingredient names, supported brands/products, unit conversion factors, and sodium concentrations.
3. Receive structured ingredient events from Module A.
4. Match detected ingredients to database entries.
5. Convert quantities into units suitable for calculation.
6. Calculate sodium content for each ingredient addition.
7. Aggregate sodium across ingredient additions.
8. Return total sodium and a per-event breakdown that keeps each event's `event_id`, `timestamp_start` and `timestamp_end`, so the web app can build the ingredient timeline (see Section 7).
9. Stay stateless: the same events in must always give the same results out, so the web app can resend corrected events and get a recalculated total.

Initial implementation will use a hardcoded database. External food databases may be integrated later.

**Module B should not depend on the internal implementation of Module A. It should consume only the agreed event schema.**

Where multiple brands have different sodium concentrations, the system should use an explicit default or request product information instead of assuming the exact brand was detected.

### Module C — Web Application and Integration

**Owner: Frontend and application integration developer**

Scope:

1. Allow users to record or upload cooking videos.
2. Submit recorded videos to the backend.
3. Trigger the ingredient detection pipeline.
4. Pass ingredient events to the sodium calculation engine.
5. Display an ingredient timeline: video timestamp, ingredient, detected quantity and sodium contribution for every addition.
6. Display estimated sodium per ingredient.
7. Display total estimated sodium.
8. Communicate limitations when quantities cannot be determined.
9. Let users inspect each addition against the video, and (stretch) correct it.

The webapp should provide an intuitive cooking-to-results experience.

For the MVP, processing occurs after the recording ends, not as a live stream.

---

## 4. Module A — Ingredient Detection Architecture

### Pipeline

```text
VideoProcessor
      |
      v
FrameExtractor
      |
      v
IngredientDetector
 (GPT-4.1 mini)
      |
      v
IngredientEventTracker
      |
      v
EventExport (JSON-compatible)
```

### VideoProcessor

Responsible for:

- Validating uploaded video files.
- Retrieving duration, resolution, and FPS.
- Preparing video metadata for downstream processing.

### FrameExtractor

Responsible for:

- Dividing videos into overlapping 4-second windows.
- Using an initial 2-second stride.
- Sampling frames at an initial rate of 2 FPS.
- Preserving frame timestamps.
- Maintaining chronological order.

These parameters should remain configurable.

### IngredientDetector

Uses GPT-4.1 mini as the initial vision-language model.

Responsible for:

- Analyzing chronological frame sequences.
- Identifying ingredients.
- Recognizing visible ingredient-addition actions.
- Estimating quantities when measuring utensils or other clear visual evidence are present.
- Returning structured ingredient observations.

The VLM must not invent measurements when visual evidence is insufficient.

The model adapter should remain interchangeable so alternative vision-language models can be evaluated later.

### IngredientEventTracker

Responsible for:

- Receiving ingredient observations.
- Confirming ingredient-addition events.
- Deduplicating events from overlapping video windows.
- Preserving repeated genuine additions.
- Recording event timestamps.
- Exporting valid events as JSON-compatible objects.

The Event Tracker manages the events and produces the JSON output. A separate JSON processing service is unnecessary.

---

## 5. Shared JSON Output Contract

This is the primary integration interface between Module A and Module B.

### Example

```json
{
  "events": [
    {
      "event_id": "event_001",
      "timestamp_start": 12.5,
      "timestamp_end": 15.2,
      "ingredient": "salt",
      "quantity": 0.5,
      "unit": "teaspoon",
      "addition_confirmed": true
    },
    {
      "event_id": "event_002",
      "timestamp_start": 25.0,
      "timestamp_end": 28.5,
      "ingredient": "soy sauce",
      "quantity": 2,
      "unit": "tablespoon",
      "addition_confirmed": true
    }
  ]
}
```

These are illustrative events, not actual model detections.

### Mandatory Event Rules

- `event_id`: Unique identifier for the addition event.
- `timestamp_start`: Beginning of the detected event, in seconds.
- `timestamp_end`: End of the detected event, in seconds.
- `ingredient`: Recognized ingredient name.
- `quantity`: Positive numerical quantity.
- `unit`: Original visually inferred measurement unit.
- `addition_confirmed`: Must be `true` for an exported event.

**Module A must preserve original quantities and units.**

Examples:

| Ingredient | Quantity | Unit |
|---|---:|---|
| Salt | 0.5 | teaspoon |
| Soy sauce | 2 | tablespoon |
| Onion | 1 | piece |
| Tomato | 1 | cup |

Module A must NOT:

- Convert teaspoons to grams.
- Convert tablespoons to milliliters.
- Convert pieces to weight.
- Identify brands.
- Calculate sodium.

All conversions belong to Module B.

### Event Filtering

Only export events where:

1. An ingredient is identifiable.
2. The ingredient was visibly added.
3. A measurable numeric quantity is available.
4. A recognizable unit is available.

Do not export:

- Unmeasured pours.
- Pinches of ingredients.
- Ingredients with unknown quantities.
- Actions where the ingredient was only picked up or displayed.
- Uncertain addition events.
- Duplicate observations of the same addition.

Skipped ingredients are not equivalent to zero sodium. The resulting sodium estimate must be treated as incomplete when additions are omitted.

---

## 6. Module B — Calculation Logic

Module B accepts `EventExport` from Module A.

Expected process:

```text
IngredientEvent JSON
        |
        v
Ingredient Database Lookup
        |
        v
Quantity / Unit Conversion
        |
        v
Sodium Concentration Lookup
        |
        v
Sodium per Addition
        |
        v
Aggregate Sodium Total
```

### Example calculation

Suppose the detection module returns:

```json
{
  "ingredient": "salt",
  "quantity": 0.5,
  "unit": "teaspoon"
}
```

The calculation module:

1. Retrieves the salt entry from the database.
2. Finds the conversion factor for teaspoons.
3. Converts the observed amount into grams.
4. Retrieves sodium concentration.
5. Calculates estimated sodium in milligrams.

General formula:

**Sodium (mg) = Ingredient mass (g) × Sodium per 100 g (mg) / 100**

For volumes or pieces, the mass must first be estimated using an ingredient-specific conversion factor.

The same process is applied to every valid event, then results are summed.

Repeated additions should be counted separately.

Unrecognized ingredients or unsupported units should be flagged rather than silently treated as zero sodium.

---

## 7. Module C — Web Application

### Expected User Journey

1. User opens the web application.
2. User records or uploads a cooking video.
3. User submits the recording for analysis.
4. The backend processes the video and extracts events.
5. The sodium calculator estimates the sodium contribution of each ingredient.
6. The webapp displays the results.

### Results Display: Ingredient Timeline

Rather than showing only a final number, the results screen shows **every detected addition in the order it happened in the video**. This has two purposes:

- **Users can inspect results.** Each row links back to the moment in the video, so the user can check what the system saw.
- **Judges see direct evidence of the AI pipeline.** The timeline shows that sodium totals come from specific detected events, not a guess.

| Video time | Ingredient | Detected quantity | Sodium contribution | Status |
|---|---|---|---|---|
| 0:12 | Salt | 0.5 teaspoon | Calculated by Module B | OK |
| 0:25 | Soy sauce | 2 tablespoons | Calculated by Module B | OK |
| 1:44 | Oyster sauce | 1 tablespoon | Not calculated | Not in ingredient database |

Below the timeline, show the **total estimated sodium in the recipe**.

#### Where each column comes from

| Column | Source | Notes |
|---|---|---|
| Video time | `timestamp_start` from Module A | Already in the contract; no change to Module A needed |
| Ingredient | `ingredient` from Module A | Shown as detected; Module B may add the matched product name |
| Detected quantity | `quantity` + `unit` from Module A | Shown in the original unit, never converted |
| Sodium contribution | Module B per-event result | Must be matched to the row by `event_id` |
| Status | Module B per-event result | `ok`, `unrecognized_ingredient` or `unsupported_unit` |

#### Behavior

1. **Order:** rows sorted by `timestamp_start`. Repeated additions of the same ingredient appear as separate rows.
2. **Jump to video:** clicking a row's timestamp seeks the video player to that moment.
3. **Frame thumbnail (optional):** the web app can grab a still from the uploaded video at `timestamp_start` in the browser, so Module A does not need to export images.
4. **Flagged rows:** events Module B cannot calculate stay visible with a clear status and no sodium value. They are never shown as 0 mg, and they trigger the incomplete-estimate notice.
5. **Running total (optional):** a cumulative sodium chart over video time, with the same events as points.

#### Corrections (stretch goal)

If time allows, users can edit a row's ingredient or quantity, or remove a row that was a false detection. The web app then resends the corrected event list to Module B and redraws the timeline and total. Corrected rows are marked as user-edited, so detected and corrected values are never confused.

For the hackathon MVP, the timeline is **inspect only**; corrections are added if time allows.

#### Known gap

Module A only exports measurable, confirmed additions (Section 5). Ingredients it saw but could not measure, such as an unmeasured pour, never reach the timeline. If the team wants these shown as "seen but not measured" rows, Module A would need an optional, separate list of skipped observations. That is a contract change and needs agreement from the Module A owner; it is not part of the MVP.

#### Scope

Where relevant, show an incomplete-estimate notice if ingredients or quantities could not be reliably measured.

The result represents sodium estimated for the recorded recipe, not necessarily sodium consumed by an individual. Serving-size calculation is outside the initial MVP unless implemented separately.

---

## 8. Current Python Project Structure

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

This structure describes Module A.

Modules B and C may have their own folders or packages.

The shared event schema is the contract connecting the modules.

---

## 9. Setup — Ingredient Detection Module

```bash
pip install -e ".[dev]"

pytest

python examples/run_mock_pipeline.py
```

For future API integration:

```bash
cp .env.example .env
```

Add the required API key to `.env`.

Do not commit API keys or secrets.

The setup commands assume the corresponding project files exist and are configured.

---

## 10. Current Development Status

### Module A — Ingredient Detection

**Scaffolding stage**

Reported as implemented:

- Pydantic data models.
- OOP interfaces.
- Frame-window calculation logic.
- Ingredient Event Tracker.
- Mock VLM adapter.
- Initial tests.

Remaining work:

- Real video probing and validation.
- Actual frame decoding and extraction.
- GPT-4.1 mini API integration.
- VLM response parsing and validation.
- Testing with recorded cooking videos.
- Evaluating ingredient and quantity detection accuracy.
- Integration testing with Module B.

### Module B — Sodium Calculator

Developed separately by a teammate.

Responsibilities include ingredient database creation, unit conversions, sodium calculations, and aggregation.

### Module C — Web Application

Developed separately by a teammate.

Responsible for video submission, coordinating backend processing, and presenting results.

---

## 11. MVP Success Criteria

The hackathon MVP is successful when:

1. A recorded cooking video can be processed end to end.
2. The vision model identifies measurable ingredient additions.
3. Ingredient quantities and units are correctly extracted when visually clear.
4. The Event Tracker removes duplicate observations.
5. Genuine repeated ingredient additions remain separate events.
6. Module A exports valid structured JSON.
7. Module B can consume the JSON without changes to Module A.
8. The application displays an ingredient timeline (video time, ingredient, quantity, sodium per addition) and a total.
9. Unknown or excluded quantities are not presented as accurately measured.
10. The full workflow can be demonstrated using a short cooking video.

### Technical Limitations

- Small quantities may be difficult to identify visually.
- Occluded ingredients may be missed.
- Camera movement can affect recognition.
- Scoops and pours without clear measurements may be excluded.
- Vision-language models can make mistakes in object counting and action interpretation.
- The final sodium estimate may omit ingredients not successfully detected.
- No medical-grade accuracy is claimed.

**The MVP prioritizes measurable ingredient-addition events and a working end-to-end pipeline over attempting to estimate every ingredient precisely.**

---

## 12. Future Improvements

Potential future extensions:

- Real-time cooking video processing.
- Audio-assisted ingredient identification.
- Better visual quantity estimation.
- Barcode and branded-product recognition.
- Larger ingredient and nutrition databases.
- User correction of timeline rows, if not completed during the hackathon.
- Showing detected-but-unmeasured ingredients on the timeline.
- Serving-size adjustments.
- Personalized dietary sodium tracking.

These features are outside the current hackathon MVP.

---

## Summary

The product consists of three main components:

**Module A: Ingredient Detection**
Recorded video → VLM → Ingredient Event Tracker → JSON

**Module B: Sodium Calculation**
Ingredient JSON → Ingredient database → Unit conversion → Sodium estimates

**Module C: Web Application**
Video upload → Backend processing → Ingredient timeline and results dashboard

Each module is independently developed and connected through clearly defined data contracts.
