from pathlib import Path

import pytest

from ingredient_detection.services.video_processor import VideoProcessor


def test_video_processor_rejects_missing_file(tmp_path):
    with pytest.raises(FileNotFoundError):
        VideoProcessor().validate_and_describe(str(tmp_path / "missing.mp4"))


def test_video_processor_rejects_non_mp4(tmp_path):
    video = tmp_path / "recording.mov"
    video.write_bytes(b"not a video")
    with pytest.raises(ValueError, match="MP4"):
        VideoProcessor().validate_and_describe(str(video))
