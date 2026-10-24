from abc import ABC, abstractmethod

from ..models.intervals import TimestampedFrame
from ..models.qwen import IngredientDiscoveryResult


class IIngredientDiscovery(ABC):
    """Identify generic ingredient additions from chronological frames."""

    @abstractmethod
    def discover(self, frames: list[TimestampedFrame]) -> IngredientDiscoveryResult:
        ...
