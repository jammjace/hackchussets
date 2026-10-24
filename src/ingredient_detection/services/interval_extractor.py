from collections.abc import Iterator
from io import BytesIO

from PIL import Image

from ..models.intervals import FrameInterval, TimestampedFrame
from ..models.video import VideoMetadata
from .frame_extractor import SlidingWindowFrameExtractor


class OneSecondIntervalExtractor(SlidingWindowFrameExtractor):
    """Reuse production OpenCV decoding for two-frame, one-second intervals."""

    def __init__(self) -> None:
        super().__init__(
            window_seconds=1.0,
            stride_seconds=1.0,
            sample_fps=1.0,
            max_width=768,
            jpeg_quality=80,
        )

    def iter_intervals(self, metadata: VideoMetadata) -> Iterator[FrameInterval]:
        samples = self.extract_discovery_frames(metadata)
        yield from self.intervals_from_frames(samples, metadata.duration_seconds)

    @staticmethod
    def intervals_from_frames(
        samples: list[TimestampedFrame], duration_seconds: float
    ) -> Iterator[FrameInterval]:
        """Build adjacent intervals from already-decoded discovery frames."""

        for index, sample in enumerate(samples):
            start, first = sample.timestamp, sample.image
            end = min(start + 1.0, duration_seconds)
            second = (
                samples[index + 1].image if index + 1 < len(samples) else first.copy()
            )
            yield FrameInterval(index, start, round(end, 3), (first, second))

    def extract_discovery_frames(
        self, metadata: VideoMetadata
    ) -> list[TimestampedFrame]:
        """Return the same decoded one-second samples without duplicate endpoints."""
        samples = []
        for window in self.iter_extract(metadata):
            if window.frames and window.frames[0].jpeg_bytes:
                samples.append(
                    TimestampedFrame(
                        window.timestamp_start,
                        self._to_pil(window.frames[0].jpeg_bytes),
                    )
                )
        return samples

    @staticmethod
    def _to_pil(data: bytes) -> Image.Image:
        with Image.open(BytesIO(data)) as image:
            return image.convert("RGB").copy()
