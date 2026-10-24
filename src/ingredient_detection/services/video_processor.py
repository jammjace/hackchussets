from ..models.video import VideoMetadata


class VideoProcessor:
    """Validate a video and retrieve metadata.

    Scaffold only: real probing (ffmpeg/opencv) is not implemented.
    """

    def validate_and_describe(self, video_path: str) -> VideoMetadata:
        raise NotImplementedError("Real video probing not implemented in scaffold.")
