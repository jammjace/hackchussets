from ..interfaces.vision_model import IVisionModel
from ..models.frames import FrameWindow
from ..models.ingredient_event import IngredientObservation


class MockVisionModel(IVisionModel):
    """Returns scripted observations keyed by window_id. For tests/examples."""

    def __init__(self, scripted: dict[int, IngredientObservation]) -> None:
        self._scripted = scripted

    def analyze(self, window: FrameWindow) -> IngredientObservation:
        if window.window_id in self._scripted:
            return self._scripted[window.window_id]
        return IngredientObservation(
            timestamp_start=window.timestamp_start,
            timestamp_end=window.timestamp_end,
        )
