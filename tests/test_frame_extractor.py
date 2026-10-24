from ingredient_detection.models.video import VideoMetadata
from ingredient_detection.services.frame_extractor import SlidingWindowFrameExtractor


def test_overlapping_windows_and_sampling():
    meta = VideoMetadata(path="x.mp4", duration_seconds=8.0, fps=30, width=640, height=480)
    extractor = SlidingWindowFrameExtractor()
    windows = extractor.extract(meta)

    # 2s stride over 8s -> starts at 0,2,4,6
    assert [w.timestamp_start for w in windows] == [0.0, 2.0, 4.0, 6.0]
    # 4s window at 2 FPS -> 8 frames
    assert len(windows[0].frames) == 8
    assert windows[0].timestamp_end == 4.0
