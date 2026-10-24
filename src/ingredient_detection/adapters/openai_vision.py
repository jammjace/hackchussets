import base64
import json

from pydantic import BaseModel

from ..interfaces.vision_model import IVisionModel
from ..models.frames import FrameWindow
from ..models.ingredient_event import IngredientObservation


class OpenAIVisionModel(IVisionModel):
    """Analyze an ordered frame window with the OpenAI Responses API."""

    def __init__(self, api_key: str, model: str = "gpt-4.1-mini") -> None:
        from openai import OpenAI

        self._client = OpenAI(api_key=api_key)
        self._model = model

    def analyze(self, window: FrameWindow) -> IngredientObservation:
        content: list[dict[str, object]] = [
            {
                "type": "input_text",
                "text": (
                    f"These ordered frames span {window.timestamp_start:.3f} to "
                    f"{window.timestamp_end:.3f} seconds. Identify one measurable ingredient "
                    "addition only when the images confirm it. Never infer a quantity or unit "
                    "that is not visibly supported. Return null fields and false when invalid. "
                    "timestamp must be the best estimated moment in the original video; "
                    "evidence_frame_index is the zero-based frame that best shows the addition."
                ),
            }
        ]
        visible_frames = [frame for frame in window.frames if frame.jpeg_bytes]
        for frame in visible_frames:
            encoded = base64.b64encode(frame.jpeg_bytes).decode("ascii")  # type: ignore[arg-type]
            content.append(
                {
                    "type": "input_image",
                    "image_url": f"data:image/jpeg;base64,{encoded}",
                    "detail": "low",
                }
            )
        if not visible_frames:
            return IngredientObservation(
                timestamp_start=window.timestamp_start,
                timestamp_end=window.timestamp_end,
            )

        response = self._client.responses.create(
            model=self._model,
            input=[{"role": "user", "content": content}],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "ingredient_observation",
                    "strict": True,
                    "schema": _VisionResult.model_json_schema(),
                }
            },
        )
        result = _VisionResult.model_validate(json.loads(response.output_text))
        evidence = None
        evidence_timestamp = None
        if (
            result.evidence_frame_index is not None
            and 0 <= result.evidence_frame_index < len(visible_frames)
        ):
            selected = visible_frames[result.evidence_frame_index]
            evidence = selected.jpeg_bytes
            evidence_timestamp = selected.timestamp
        timestamp = result.timestamp
        if timestamp is not None:
            timestamp = min(max(timestamp, window.timestamp_start), window.timestamp_end)
        return IngredientObservation(
            timestamp_start=window.timestamp_start,
            timestamp_end=window.timestamp_end,
            timestamp=timestamp,
            ingredient=result.ingredient,
            quantity=result.quantity,
            unit=result.unit,
            addition_confirmed=result.addition_confirmed,
            evidence_timestamp=evidence_timestamp,
            evidence_jpeg=evidence,
        )


class _VisionResult(BaseModel):
    ingredient: str | None
    quantity: float | None
    unit: str | None
    addition_confirmed: bool
    timestamp: float | None
    evidence_frame_index: int | None
