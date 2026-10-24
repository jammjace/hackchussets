from pathlib import Path

from ..models.video import VideoMetadata


class VideoProcessor:
    """Validate an MP4 recording and retrieve metadata with OpenCV."""

    def validate_and_describe(self, video_path: str) -> VideoMetadata:
        path = Path(video_path).expanduser().resolve()
        if not path.is_file():
            raise FileNotFoundError(f"Video does not exist: {path}")
        if path.suffix.lower() != ".mp4":
            raise ValueError("Only MP4 recordings are supported by the MVP")

        import cv2

        capture = cv2.VideoCapture(str(path))
        try:
            if not capture.isOpened():
                raise ValueError(f"OpenCV could not open video: {path}")
            fps = float(capture.get(cv2.CAP_PROP_FPS))
            frame_count = float(capture.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
            if fps <= 0 or frame_count <= 0 or width <= 0 or height <= 0:
                raise ValueError(f"Video has invalid or missing metadata: {path}")
            return VideoMetadata(
                path=str(path),
                duration_seconds=frame_count / fps,
                fps=fps,
                width=width,
                height=height,
            )
        finally:
            capture.release()
