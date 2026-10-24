from abc import ABC, abstractmethod

from ..models.frames import FrameWindow
from ..models.video import VideoMetadata


class IFrameExtractor(ABC):
    """Produces overlapping frame windows from a validated video."""

    @abstractmethod
    def extract(self, metadata: VideoMetadata) -> list[FrameWindow]:
        ...
