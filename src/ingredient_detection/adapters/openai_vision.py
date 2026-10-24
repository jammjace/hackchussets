from ..interfaces.vision_model import IVisionModel
from ..models.frames import FrameWindow
from ..models.ingredient_event import IngredientObservation


class OpenAIVisionModel(IVisionModel):
    """Planned GPT-4.1 mini adapter. Not implemented in scaffold."""

    def __init__(self, api_key: str, model: str = "gpt-4.1-mini") -> None:
        self._api_key = api_key
        self._model = model

    def analyze(self, window: FrameWindow) -> IngredientObservation:
        raise NotImplementedError("OpenAI VLM call not implemented in scaffold.")
