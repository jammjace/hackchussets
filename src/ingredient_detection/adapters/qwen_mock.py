import json

from ..interfaces.interval_inference import IIntervalInference
from ..models.intervals import FrameInterval
from ..models.qwen import IntervalPrediction


RECORDED_PREDICTIONS = {
    "P22_113": ("oil", [0.5, 1.0, 0.5, 0, 0, 0, 0, 0]),
    "P12_101": ("salt", [0.5, 0.5, 0.5, 0.5, 0, 0, 0, 0]),
}


class MockQwenVisionModel(IIntervalInference):
    """Recorded Kaggle outputs; these are fixtures, not ground truth."""

    def __init__(self, video_id: str) -> None:
        if video_id not in RECORDED_PREDICTIONS:
            raise ValueError(f"no recorded predictions for {video_id!r}")
        self.video_id = video_id

    def predict(
        self, interval: FrameInterval, expected_ingredient: str
    ) -> IntervalPrediction:
        ingredient, quantities = RECORDED_PREDICTIONS[self.video_id]
        if expected_ingredient.casefold() != ingredient.casefold():
            raise ValueError(
                f"fixture expects {ingredient!r}, received {expected_ingredient!r}"
            )
        if interval.interval_id >= len(quantities):
            raise ValueError("recorded fixture contains only eight intervals")
        quantity = quantities[interval.interval_id]
        payload = {
            "ingredient": ingredient,
            "pouring_detected": quantity > 0,
            "quantity_tbsp": quantity,
            "confidence": "medium" if quantity > 0 else "low",
        }
        return IntervalPrediction(
            **payload,
            raw_response=json.dumps(payload),
            timestamp_start=interval.timestamp_start,
            timestamp_end=interval.timestamp_end,
        )
