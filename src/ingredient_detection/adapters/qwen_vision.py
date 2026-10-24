import json
import re

from ..interfaces.interval_inference import IIntervalInference
from ..interfaces.ingredient_discovery import IIngredientDiscovery
from ..models.intervals import FrameInterval, TimestampedFrame
from ..models.qwen import (
    IngredientDiscoveryResponse,
    IngredientDiscoveryResult,
    IntervalPrediction,
    QwenResponse,
)


EXPERIMENT_PROMPT = """You are examining TWO chronological frames from
a first-person cooking video.

The ingredient to track is: {expected_ingredient}.

The first frame shows the START of a one-second interval.
The second frame shows the END of that interval.

Your task:
Estimate how many tablespoons of the specified ingredient
ENTERED the cooking vessel DURING THIS INTERVAL ONLY.

Rules:
1. Do not count ingredients added before this interval.
2. Do not count ingredients already inside the vessel.
3. Do not count merely holding or moving a container.
4. If no addition is visible or supported, return 0.
5. If addition is supported, estimate a fractional tablespoon amount when possible (e.g. 0.2, 0.5, 1.0).
6. If addition occurs but quantity cannot be estimated, return null.
7. Do not automatically assume 1 tablespoon.
8. Do not count the same transfer twice.
9. Use the supplied ingredient as known context.
10. Return JSON only, with exactly these fields:

{{
  "ingredient": "{expected_ingredient}",
  "pouring_detected": false,
  "quantity_tbsp": 0,
  "confidence": "low"
}}

Confidence must be low, medium, or high."""


DISCOVERY_PROMPT = """You are examining chronological frames from a first-person cooking video.

Identify every ingredient visibly ADDED to the cooking vessel during this video.

Rules:
1. Distinguish adding an ingredient from merely holding, showing, or moving it.
2. Do not report ingredients already present in the vessel as new additions.
3. Return generic ingredient names such as salt, sugar, soy sauce, cinnamon, olive oil, butter, pepper, or garlic.
4. Never return a brand name. Packaging labels may support identification, but report only the generic ingredient.
5. Do not guess salt versus sugar from appearance alone. Return \"unknown\" when identity is ambiguous.
6. Support multiple distinct ingredient additions.
7. Timestamps are local video seconds. Estimate the start and end of each visible addition.
8. If no ingredient addition is visible, return an empty ingredients list.
9. Return JSON only, with exactly this structure:

{{
  "ingredients": [
    {{
      "ingredient": "salt",
      "timestamp_start": 1.0,
      "timestamp_end": 4.0,
      "addition_confirmed": true,
      "confidence": "medium"
    }}
  ]
}}

Confidence must be low, medium, or high.
Frame timestamps in chronological order: {timestamps}."""


def parse_interval_response(raw_response: str) -> QwenResponse:
    """Parse plain/fenced JSON and validate the exact experimental contract."""
    candidate = raw_response.strip()
    fenced = re.search(
        r"```(?:json)?\s*(\{.*?\})\s*```", candidate, re.DOTALL | re.IGNORECASE
    )
    if fenced:
        candidate = fenced.group(1)
    else:
        start, end = candidate.find("{"), candidate.rfind("}")
        if start < 0 or end <= start:
            raise ValueError("response does not contain a JSON object")
        candidate = candidate[start : end + 1]
    try:
        return QwenResponse.model_validate(json.loads(candidate))
    except json.JSONDecodeError as exc:
        raise ValueError("response contains invalid JSON") from exc


def parse_discovery_response(raw_response: str) -> IngredientDiscoveryResponse:
    """Parse and validate ingredient-discovery JSON."""
    candidate = raw_response.strip()
    fenced = re.search(
        r"```(?:json)?\s*(\{.*\})\s*```", candidate, re.DOTALL | re.IGNORECASE
    )
    if fenced:
        candidate = fenced.group(1)
    else:
        start, end = candidate.find("{"), candidate.rfind("}")
        if start < 0 or end <= start:
            raise ValueError("response does not contain a JSON object")
        candidate = candidate[start : end + 1]
    try:
        return IngredientDiscoveryResponse.model_validate(json.loads(candidate))
    except json.JSONDecodeError as exc:
        raise ValueError("response contains invalid JSON") from exc


class QwenVisionModel(IIntervalInference, IIngredientDiscovery):
    """Kaggle-compatible Qwen3-VL adapter loaded once per instance."""

    def __init__(self, model_name: str = "Qwen/Qwen3-VL-2B-Instruct") -> None:
        import torch
        from transformers import AutoProcessor, Qwen3VLForConditionalGeneration

        self._torch = torch
        self._processor = AutoProcessor.from_pretrained(model_name)
        self._model = Qwen3VLForConditionalGeneration.from_pretrained(
            model_name, torch_dtype="auto", device_map="auto"
        )
        self._model.eval()

    def predict(
        self, interval: FrameInterval, expected_ingredient: str
    ) -> IntervalPrediction:
        prompt = EXPERIMENT_PROMPT.format(expected_ingredient=expected_ingredient)
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": interval.frames[0]},
                    {"type": "image", "image": interval.frames[1]},
                    {"type": "text", "text": prompt},
                ],
            }
        ]
        text = self._processor.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = self._processor(
            text=[text], images=list(interval.frames), return_tensors="pt"
        )
        device = next(self._model.parameters()).device
        inputs = {
            key: value.to(device) if hasattr(value, "to") else value
            for key, value in inputs.items()
        }
        with self._torch.inference_mode():
            output = self._model.generate(
                **inputs, max_new_tokens=180, do_sample=False
            )
        prompt_tokens = inputs["input_ids"].shape[1]
        raw = self._processor.batch_decode(
            output[:, prompt_tokens:], skip_special_tokens=True
        )[0].strip()

        print("\n=== RAW QWEN RESPONSE ===")
        print(raw)
        print("=========================\n")

        parsed = parse_interval_response(raw)
        return IntervalPrediction(
            **parsed.model_dump(),
            raw_response=raw,
            timestamp_start=interval.timestamp_start,
            timestamp_end=interval.timestamp_end,
        )

    def discover(
        self, frames: list[TimestampedFrame]
    ) -> IngredientDiscoveryResult:
        if not frames:
            raise ValueError("ingredient discovery requires at least one frame")
        timestamps = ", ".join(f"{frame.timestamp:.3f}s" for frame in frames)
        prompt = DISCOVERY_PROMPT.format(timestamps=timestamps)
        content = [
            {"type": "image", "image": frame.image}
            for frame in frames
        ]
        content.append({"type": "text", "text": prompt})
        messages = [{"role": "user", "content": content}]
        text = self._processor.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        images = [frame.image for frame in frames]
        inputs = self._processor(text=[text], images=images, return_tensors="pt")
        device = next(self._model.parameters()).device
        inputs = {
            key: value.to(device) if hasattr(value, "to") else value
            for key, value in inputs.items()
        }
        with self._torch.inference_mode():
            output = self._model.generate(
                **inputs, max_new_tokens=300, do_sample=False
            )
        prompt_tokens = inputs["input_ids"].shape[1]
        raw = self._processor.batch_decode(
            output[:, prompt_tokens:], skip_special_tokens=True
        )[0].strip()

        print("\n=== RAW QWEN DISCOVERY RESPONSE ===")
        print(raw)
        print("===================================\n")

        parsed = parse_discovery_response(raw)
        return IngredientDiscoveryResult(
            ingredients=parsed.ingredients,
            raw_response=raw,
        )
