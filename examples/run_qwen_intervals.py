"""Run benchmark interval inference in mock mode or real Qwen mode."""

import argparse
import json
from pathlib import Path

from ingredient_detection.adapters.qwen_mock import MockQwenVisionModel
from ingredient_detection.pipeline.qwen_interval_pipeline import QwenIntervalPipeline
from ingredient_detection.services.benchmark_metadata import load_benchmark_clips


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True, type=Path)
    parser.add_argument("--mode", choices=["mock", "qwen"], default="mock")
    parser.add_argument("--metadata", type=Path, default=Path("samples/clip_metadata.json"))
    parser.add_argument("--mapping", type=Path, default=Path("samples/benchmark_mapping.json"))
    args = parser.parse_args()

    clips = load_benchmark_clips(args.metadata, args.mapping)
    try:
        clip = clips[args.video.name]
    except KeyError as exc:
        raise ValueError(f"no explicit benchmark mapping for {args.video.name!r}") from exc

    if args.mode == "mock":
        inference = MockQwenVisionModel(clip.video_id)
    else:
        # Imported only in real mode, so local mock development needs no model install.
        from ingredient_detection.adapters.qwen_vision import QwenVisionModel

        inference = QwenVisionModel()

    result = QwenIntervalPipeline(inference).process(
        str(args.video),
        clip.video_id,
        clip.ingredient,
        clip.original_timestamp_offset,
    )
    print(
        json.dumps(
            {
                "video_id": result.video_id,
                "ingredient": result.ingredient,
                "predictions": [item.model_dump() for item in result.predictions],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
