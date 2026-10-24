from pydantic import BaseModel, Field


class Frame(BaseModel):
    """A single sampled frame with its source timestamp."""

    timestamp: float = Field(ge=0)
    image_ref: str | None = None
    jpeg_bytes: bytes | None = Field(default=None, exclude=True, repr=False)


class FrameWindow(BaseModel):
    """An overlapping time window of sampled frames (4s window, 2s stride)."""

    window_id: int
    timestamp_start: float = Field(ge=0)
    timestamp_end: float = Field(ge=0)
    frames: list[Frame] = Field(default_factory=list)
