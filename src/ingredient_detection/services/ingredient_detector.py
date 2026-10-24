from ..interfaces.vision_model import IVisionModel
from ..models.frames import FrameWindow
from ..models.ingredient_event import IngredientObservation


class IngredientDetector:
    """Analyze chronological frame windows via an interchangeable VLM.

    Identifies ingredient, quantity, unit, and confirmed addition only.
    """

    def __init__(self, vision_model: IVisionModel) -> None:
        self._vision_model = vision_model

    def detect(self, windows: list[FrameWindow]) -> list[IngredientObservation]:
        ordered = sorted(windows, key=lambda w: w.timestamp_start)
        return [self._vision_model.analyze(w) for w in ordered]
