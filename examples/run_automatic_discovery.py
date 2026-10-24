"""Run real Qwen ingredient discovery followed by unchanged quantity inference."""

import argparse
import json
from pathlib import Path

from ingredient_detection.adapters.qwen_mock import (
    RECORDED_DISCOVERIES,
    MockIngredientDiscovery,
    MockQwenVisionModel,
)
from ingredient_detection.pipeline.automatic_ingredient_pipeline import (
    AutomaticIngredientPipeline,
)
from ingredient_detection.services.benchmark_metadata import load_benchmark_clips
from ingredient_detection.services.quantity_aggregator import IngredientQuantityAggregator


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True, type=Path)
    parser.add_argument("--mode", choices=["mock", "qwen"], default="qwen")
    parser.add_argument("--session-id")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--timestamp-offset", type=float)
    parser.add_argument(
        "--evaluate",
        action="store_true",
        help="Compare discovery with benchmark labels only after prediction",
    )
    parser.add_argument("--metadata", type=Path, default=Path("samples/clip_metadata.json"))
    parser.add_argument("--mapping", type=Path, default=Path("samples/benchmark_mapping.json"))
    args = parser.parse_args()

    if args.mode == "qwen":
        from ingredient_detection.adapters.qwen_vision import QwenVisionModel

        model = QwenVisionModel()
        pipeline = AutomaticIngredientPipeline(model, model)
    else:
        fixture_by_filename = {"test1.mp4": "P12_101", "test2.mp4": "P22_113"}
        try:
            video_id = fixture_by_filename[args.video.name]
        except KeyError as exc:
            raise ValueError("mock mode supports only test1.mp4 and test2.mp4") from exc
        pipeline = AutomaticIngredientPipeline(
            MockIngredientDiscovery(RECORDED_DISCOVERIES[video_id]),
            MockQwenVisionModel(video_id),
        )

    result = pipeline.process(str(args.video))
    payload = {
        "discovery": result.discovery.model_dump(),
        "quantities": [
            {
                "discovery": item.discovery.model_dump(),
                "predictions": [prediction.model_dump() for prediction in item.predictions],
            }
            for item in result.quantities
        ],
    }

    if args.evaluate:
        # This lookup occurs after inference and is never passed to the model/pipeline.
        clips = load_benchmark_clips(args.metadata, args.mapping)
        expected = clips[args.video.name].ingredient
        discovered = [item.ingredient for item in result.discovery.ingredients]
        payload["evaluation"] = {
            "expected_ingredient": expected,
            "identified": expected.casefold() in discovered,
        }

    session_id = args.session_id or args.video.stem
    output_path = args.output or Path("outputs") / session_id / "ingredients.json"
    aggregator = IngredientQuantityAggregator()
    final_export = aggregator.aggregate(
        result,
        session_id=session_id,
        original_timestamp_offset=args.timestamp_offset,
    )
    aggregator.write_json(final_export, output_path)
    payload["ingredients_json"] = str(output_path)

    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
