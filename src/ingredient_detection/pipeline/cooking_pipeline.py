from ..models.ingredient_event import EventExport
from ..services.event_tracker import IngredientEventTracker
from ..services.frame_extractor import SlidingWindowFrameExtractor
from ..services.ingredient_detector import IngredientDetector
from ..services.video_processor import VideoProcessor


class CookingPipeline:
    """Orchestrates: video -> frames -> VLM detection -> events (JSON)."""

    def __init__(
        self,
        video_processor: VideoProcessor,
        frame_extractor: SlidingWindowFrameExtractor,
        detector: IngredientDetector,
        tracker: IngredientEventTracker,
    ) -> None:
        self._video_processor = video_processor
        self._frame_extractor = frame_extractor
        self._detector = detector
        self._tracker = tracker

    def process(self, video_path: str) -> EventExport:
        metadata = self._video_processor.validate_and_describe(video_path)
        windows = self._frame_extractor.extract(metadata)
        observations = self._detector.detect(windows)
        return self._tracker.build_export(observations)
