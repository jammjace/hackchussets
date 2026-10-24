from dataclasses import dataclass

from ..interfaces.ingredient_discovery import IIngredientDiscovery
from ..interfaces.interval_inference import IIntervalInference
from ..models.qwen import (
    IngredientDiscovery,
    IngredientDiscoveryResult,
    IntervalPrediction,
)
from ..services.interval_extractor import OneSecondIntervalExtractor
from ..services.video_processor import VideoProcessor


@dataclass(frozen=True)
class DiscoveredIngredientQuantities:
    discovery: IngredientDiscovery
    predictions: list[IntervalPrediction]


@dataclass(frozen=True)
class AutomaticIngredientResult:
    discovery: IngredientDiscoveryResult
    quantities: list[DiscoveredIngredientQuantities]


class AutomaticIngredientPipeline:
    """Discover ingredients, then estimate known ingredients per interval."""

    def __init__(
        self,
        discovery: IIngredientDiscovery,
        quantity_inference: IIntervalInference,
        extractor: OneSecondIntervalExtractor | None = None,
        video_processor: VideoProcessor | None = None,
    ) -> None:
        self._discovery = discovery
        self._quantity_inference = quantity_inference
        self._extractor = extractor or OneSecondIntervalExtractor()
        self._video_processor = video_processor or VideoProcessor()

    def process(self, video_path: str) -> AutomaticIngredientResult:
        """Run prediction using video pixels only; no benchmark labels are accepted."""
        metadata = self._video_processor.validate_and_describe(video_path)
        frames = self._extractor.extract_discovery_frames(metadata)
        discovery_result = self._discovery.discover(frames)
        intervals = list(
            self._extractor.intervals_from_frames(frames, metadata.duration_seconds)
        )
        quantities = []
        for discovered in discovery_result.ingredients:
            if not discovered.addition_confirmed or discovered.ingredient == "unknown":
                continue
            predictions = [
                self._quantity_inference.predict(interval, discovered.ingredient)
                for interval in intervals
            ]
            quantities.append(DiscoveredIngredientQuantities(discovered, predictions))
        return AutomaticIngredientResult(discovery_result, quantities)
