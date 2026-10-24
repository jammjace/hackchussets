# Ingredient Detection (Cooking Video → Events)

Estimates *where ingredients are added* in head-mounted cooking videos.
Scope of this module: **Recorded Video → Frame Extraction → VLM (GPT-4.1 mini) → Event Tracker → JSON.**

Out of scope (teammate owns): ingredient DB, brands, unit conversion, sodium lookup/calculation.

## Pipeline

```
VideoProcessor → FrameExtractor → IngredientDetector (VLM) → IngredientEventTracker → JSON
```

- **FrameExtractor**: overlapping 4s windows every 2s, sampled at 2 FPS, timestamps preserved.
- **IngredientDetector**: interchangeable `IVisionModel` adapter (OpenAI planned, mock provided).
- **IngredientEventTracker**: merges overlapping-window duplicates, keeps genuine repeats separate, exports only valid events sorted by timestamp.

## Output contract

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
    }
  ]
}
```

Only events with an identifiable ingredient, confirmed addition, numeric quantity, and
recognizable unit are exported. Original quantity/unit are preserved (no gram/ml
conversion). Pinches, unmeasured pours, and uncertain additions are ignored — ignored
additions are **not** zero sodium; the downstream estimate may be incomplete.

## Setup

```bash
pip install -e ".[dev]"
pytest
python examples/run_mock_pipeline.py
cp .env.example .env   # when implementing the real VLM adapter
```

## Teammate integration

Consume `EventExport` from `CookingPipeline.process(video_path)` (or `.model_dump()`).
Your layer handles ingredient DB, brand, unit conversion, and sodium — read
`ingredient`, `quantity`, `unit` from each event; convert on your side.

## Status

Scaffold. Implemented: models, interfaces, frame-window math, event tracker, mock adapter, tests.
Not implemented: real video probing (`VideoProcessor`), real OpenAI VLM call (`OpenAIVisionModel`).
