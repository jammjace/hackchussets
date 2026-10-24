from abc import ABC, abstractmethod

from ..models.intervals import FrameInterval
from ..models.qwen import IntervalPrediction


class IIntervalInference(ABC):
    """Common contract for real and recorded-fixture interval inference."""

    @abstractmethod
    def predict(
        self, interval: FrameInterval, expected_ingredient: str
    ) -> IntervalPrediction:
        ...
