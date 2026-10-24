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


def test_range_preserves_original_video_timestamps():
    meta = VideoMetadata(path="x.mp4", duration_seconds=20.0, fps=30, width=640, height=480)
    extractor = SlidingWindowFrameExtractor()

    windows = extractor.extract(meta, start_seconds=10.0, duration_seconds=5.0)

    assert [window.timestamp_start for window in windows] == [10.0, 12.0, 14.0]
    assert windows[-1].timestamp_end == 15.0
    assert [frame.timestamp for frame in windows[0].frames] == [
        10.0,
        10.5,
        11.0,
        11.5,
        12.0,
        12.5,
        13.0,
        13.5,
    ]
