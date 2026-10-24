from abc import ABC, abstractmethod

from collections.abc import Iterator

from ..models.frames import FrameWindow
from ..models.video import VideoMetadata


class IFrameExtractor(ABC):
    """Produces overlapping frame windows from a validated video."""

    @abstractmethod
    def extract(
        self,
        metadata: VideoMetadata,
        start_seconds: float = 0.0,
        duration_seconds: float | None = None,
    ) -> list[FrameWindow]:
        ...

    def iter_extract(
        self,
        metadata: VideoMetadata,
        start_seconds: float = 0.0,
        duration_seconds: float | None = None,
    ) -> Iterator[FrameWindow]:
        yield from self.extract(metadata, start_seconds, duration_seconds)
