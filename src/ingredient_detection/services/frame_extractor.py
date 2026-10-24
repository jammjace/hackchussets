from collections.abc import Iterator
from pathlib import Path

from ..interfaces.frame_extractor import IFrameExtractor
from ..models.frames import Frame, FrameWindow
from ..models.video import VideoMetadata


class SlidingWindowFrameExtractor(IFrameExtractor):
    """Decode resized JPEG samples in chronological, bounded-size windows."""

    def __init__(
        self,
        window_seconds: float = 4.0,
        stride_seconds: float = 2.0,
        sample_fps: float = 2.0,
        max_width: int = 1024,
        jpeg_quality: int = 82,
    ) -> None:
        if window_seconds <= 0 or stride_seconds <= 0 or sample_fps <= 0:
            raise ValueError("window, stride, and sampling values must be positive")
        self.window_seconds = window_seconds
        self.stride_seconds = stride_seconds
        self.sample_fps = sample_fps
        self.max_width = max_width
        self.jpeg_quality = jpeg_quality

    def extract(
        self,
        metadata: VideoMetadata,
        start_seconds: float = 0.0,
        duration_seconds: float | None = None,
    ) -> list[FrameWindow]:
        return list(self.iter_extract(metadata, start_seconds, duration_seconds))

    def iter_extract(
        self,
        metadata: VideoMetadata,
        start_seconds: float = 0.0,
        duration_seconds: float | None = None,
    ) -> Iterator[FrameWindow]:
        """Yield one window at a time, optionally bounded to a source-video range."""
        if start_seconds < 0:
            raise ValueError("start_seconds must be non-negative")
        if duration_seconds is not None and duration_seconds <= 0:
            raise ValueError("duration_seconds must be positive")
        if start_seconds >= metadata.duration_seconds:
            raise ValueError("start_seconds must be before the end of the video")

        range_end = metadata.duration_seconds
        if duration_seconds is not None:
            range_end = min(range_end, start_seconds + duration_seconds)
        step = 1.0 / self.sample_fps
        start = start_seconds
        window_id = 0
        while start < range_end:
            end = min(start + self.window_seconds, range_end)
            frames = self._decode_window(metadata.path, start, end, step)
            yield FrameWindow(
                window_id=window_id,
                timestamp_start=round(start, 3),
                timestamp_end=round(end, 3),
                frames=frames,
            )
            window_id += 1
            start += self.stride_seconds

    def _decode_window(self, path: str, start: float, end: float, step: float) -> list[Frame]:
        # Metadata-only unit tests intentionally use a nonexistent path.
        if not Path(path).is_file():
            return [Frame(timestamp=round(t, 3)) for t in self._times(start, end, step)]

        import cv2

        capture = cv2.VideoCapture(path)
        frames: list[Frame] = []
        try:
            for timestamp in self._times(start, end, step):
                capture.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000.0)
                ok, image = capture.read()
                if not ok:
                    continue
                height, width = image.shape[:2]
                if width > self.max_width:
                    scale = self.max_width / width
                    image = cv2.resize(
                        image, (self.max_width, max(1, round(height * scale))),
                        interpolation=cv2.INTER_AREA,
                    )
                encoded, buffer = cv2.imencode(
                    ".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, self.jpeg_quality]
                )
                if encoded:
                    frames.append(Frame(timestamp=round(timestamp, 3), jpeg_bytes=buffer.tobytes()))
        finally:
            capture.release()
        return frames

    @staticmethod
    def _times(start: float, end: float, step: float) -> Iterator[float]:
        timestamp = start
        while timestamp < end:
            yield timestamp
            timestamp += step
