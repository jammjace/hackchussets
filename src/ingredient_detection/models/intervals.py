from dataclasses import dataclass

from PIL import Image


@dataclass(frozen=True)
class FrameInterval:
    """Two chronological RGB frames spanning one local-video interval."""

    interval_id: int
    timestamp_start: float
    timestamp_end: float
    frames: tuple[Image.Image, Image.Image]
