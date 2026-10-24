from abc import ABC, abstractmethod

from ..models.frames import FrameWindow
from ..models.ingredient_event import IngredientObservation


class IVisionModel(ABC):
    """Interchangeable VLM adapter (planned: GPT-4.1 mini)."""

    @abstractmethod
    def analyze(self, window: FrameWindow) -> IngredientObservation:
        ...
