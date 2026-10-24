"""Export the exact JPEG frame sequences produced for VLM analysis."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from ingredient_detection.services.frame_extractor import SlidingWindowFrameExtractor
from ingredient_detection.services.video_processor import VideoProcessor


def milliseconds(seconds: float) -> int:
    return round(seconds * 1000)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export production OpenCV frame windows without calling OpenAI."
    )
    parser.add_argument("--video", required=True, help="Path to a local MP4 recording")
    parser.add_argument(
        "--start", type=float, default=0.0, help="Start time in source-video seconds"
    )
    parser.add_argument(
        "--duration", type=float, help="Optional duration to inspect, in seconds"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("outputs/frame_test"),
        help="Empty output directory (default: outputs/frame_test)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = args.output.resolve()
    if output_dir.exists() and any(output_dir.iterdir()):
        raise FileExistsError(
            f"Output directory is not empty: {output_dir}. "
            "Choose another --output directory or remove it first."
        )

    metadata = VideoProcessor().validate_and_describe(args.video)
    extractor = SlidingWindowFrameExtractor(
        window_seconds=4.0,
        stride_seconds=2.0,
        sample_fps=2.0,
        max_width=768,
        jpeg_quality=80,
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, object] = {
        "video": metadata.path,
        "source_duration_seconds": metadata.duration_seconds,
        "requested_start_seconds": args.start,
        "requested_duration_seconds": args.duration,
        "settings": {
            "window_seconds": extractor.window_seconds,
            "stride_seconds": extractor.stride_seconds,
            "sample_fps": extractor.sample_fps,
            "max_width": extractor.max_width,
            "jpeg_quality": extractor.jpeg_quality,
        },
        "windows": [],
    }
    windows = manifest["windows"]
    assert isinstance(windows, list)
    image_count = 0

    for window in extractor.iter_extract(
        metadata,
        start_seconds=args.start,
        duration_seconds=args.duration,
    ):
        window_name = (
            f"window_{window.window_id:03d}_{milliseconds(window.timestamp_start):04d}ms"
        )
        window_dir = output_dir / window_name
        window_dir.mkdir()
        frame_entries = []
        for frame in window.frames:
            if frame.jpeg_bytes is None:
                continue
            frame_name = f"frame_{milliseconds(frame.timestamp):04d}ms.jpg"
            # These are the extractor's bytes; do not decode or re-encode them.
            (window_dir / frame_name).write_bytes(frame.jpeg_bytes)
            frame_entries.append(
                {
                    "filename": f"{window_name}/{frame_name}",
                    "timestamp_seconds": frame.timestamp,
                    "timestamp_ms": milliseconds(frame.timestamp),
                }
            )
            image_count += 1
        windows.append(
            {
                "window_id": window.window_id,
                "timestamp_start_seconds": window.timestamp_start,
                "timestamp_end_seconds": window.timestamp_end,
                "directory": window_name,
                "frames": frame_entries,
            }
        )

    manifest["window_count"] = len(windows)
    manifest["image_count"] = image_count
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Exported {len(windows)} windows and {image_count} images to {output_dir}")


if __name__ == "__main__":
    main()
