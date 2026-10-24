from abc import ABC, abstractmethod

from collections.abc import Iterator

from ..models.frames import FrameWindow
from ..models.video import VideoMetadata


class IFrameExtractor(ABC):
    """Produces overlapping frame windows from a validated video."""

    @abstractmethod
    def extract(self, metadata: VideoMetadata) -> list[FrameWindow]:
        ...

    def iter_extract(self, metadata: VideoMetadata) -> Iterator[FrameWindow]:
        yield from self.extract(metadata)
