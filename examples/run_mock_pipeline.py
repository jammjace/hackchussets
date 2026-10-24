"""Run the pipeline end-to-end with mocks (no video/API needed)."""

from ingredient_detection.adapters.mock_vision import MockVisionModel
from ingredient_detection.models.ingredient_event import IngredientObservation
from ingredient_detection.models.video import VideoMetadata
from ingredient_detection.services.event_tracker import IngredientEventTracker
from ingredient_detection.services.frame_extractor import SlidingWindowFrameExtractor
from ingredient_detection.services.ingredient_detector import IngredientDetector


def main() -> None:
    meta = VideoMetadata(path="demo.mp4", duration_seconds=10.0, fps=30, width=640, height=480)

    scripted = {
        0: IngredientObservation(timestamp_start=0.0, timestamp_end=4.0,
                                 ingredient="salt", quantity=0.5, unit="teaspoon",
                                 addition_confirmed=True),
        1: IngredientObservation(timestamp_start=2.0, timestamp_end=6.0,
                                 ingredient="salt", quantity=0.5, unit="teaspoon",
                                 addition_confirmed=True),  # duplicate of window 0
    }

    extractor = SlidingWindowFrameExtractor()
    detector = IngredientDetector(MockVisionModel(scripted))
    tracker = IngredientEventTracker()

    windows = extractor.extract(meta)
    observations = detector.detect(windows)
    export = tracker.build_export(observations)

    print(export.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
