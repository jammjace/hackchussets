from pydantic import BaseModel, Field


class VideoMetadata(BaseModel):
    """Basic metadata for a recorded cooking video."""

    path: str
    duration_seconds: float = Field(gt=0)
    fps: float = Field(gt=0)
    width: int = Field(gt=0)
    height: int = Field(gt=0)
