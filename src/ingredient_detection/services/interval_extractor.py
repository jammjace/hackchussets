from collections.abc import Iterator
from io import BytesIO

from PIL import Image

from ..models.intervals import FrameInterval
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
        samples = []
        for window in self.iter_extract(metadata):
            if window.frames and window.frames[0].jpeg_bytes:
                samples.append(
                    (window.timestamp_start, self._to_pil(window.frames[0].jpeg_bytes))
                )

        for index, (start, first) in enumerate(samples):
            end = min(start + 1.0, metadata.duration_seconds)
            second = samples[index + 1][1] if index + 1 < len(samples) else first.copy()
            yield FrameInterval(index, start, round(end, 3), (first, second))

    @staticmethod
    def _to_pil(data: bytes) -> Image.Image:
        with Image.open(BytesIO(data)) as image:
            return image.convert("RGB").copy()
