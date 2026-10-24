from ..interfaces.frame_extractor import IFrameExtractor
from ..models.frames import Frame, FrameWindow
from ..models.video import VideoMetadata


class SlidingWindowFrameExtractor(IFrameExtractor):
    """Overlapping windows: 4s window, 2s stride, sampled at 2 FPS.

    Scaffold builds window/timestamp structure; real decoding is deferred
    (frames carry no image data yet).
    """

    def __init__(
        self,
        window_seconds: float = 4.0,
        stride_seconds: float = 2.0,
        sample_fps: float = 2.0,
    ) -> None:
        self.window_seconds = window_seconds
        self.stride_seconds = stride_seconds
        self.sample_fps = sample_fps

    def extract(self, metadata: VideoMetadata) -> list[FrameWindow]:
        windows: list[FrameWindow] = []
        duration = metadata.duration_seconds
        step = 1.0 / self.sample_fps
        start = 0.0
        window_id = 0
        while start < duration:
            end = min(start + self.window_seconds, duration)
            frames: list[Frame] = []
            t = start
            while t < end:
                frames.append(Frame(timestamp=round(t, 3)))
                t += step
            windows.append(
                FrameWindow(
                    window_id=window_id,
                    timestamp_start=round(start, 3),
                    timestamp_end=round(end, 3),
                    frames=frames,
                )
            )
            window_id += 1
            start += self.stride_seconds
        return windows
