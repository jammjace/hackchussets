from dataclasses import dataclass

from ..interfaces.interval_inference import IIntervalInference
from ..models.qwen import IntervalPrediction
from ..services.interval_extractor import OneSecondIntervalExtractor
from ..services.video_processor import VideoProcessor


@dataclass(frozen=True)
class QwenIntervalResult:
    video_id: str
    ingredient: str
    predictions: list[IntervalPrediction]


class QwenIntervalPipeline:
    """Video -> one-second frames -> validated intermediate predictions."""

    def __init__(
        self,
        inference: IIntervalInference,
        extractor: OneSecondIntervalExtractor | None = None,
        video_processor: VideoProcessor | None = None,
    ) -> None:
        self._inference = inference
        self._extractor = extractor or OneSecondIntervalExtractor()
        self._video_processor = video_processor or VideoProcessor()

    def process(
        self,
        video_path: str,
        video_id: str,
        expected_ingredient: str,
        original_timestamp_offset: float = 0.0,
    ) -> QwenIntervalResult:
        metadata = self._video_processor.validate_and_describe(video_path)
        predictions = []
        for interval in self._extractor.iter_intervals(metadata):
            prediction = self._inference.predict(interval, expected_ingredient)
            predictions.append(
                prediction.model_copy(
                    update={
                        "original_timestamp_start": (
                            prediction.timestamp_start + original_timestamp_offset
                        ),
                        "original_timestamp_end": (
                            prediction.timestamp_end + original_timestamp_offset
                        ),
                    }
                )
            )
        return QwenIntervalResult(video_id, expected_ingredient, predictions)
