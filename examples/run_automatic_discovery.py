"""Run real Qwen ingredient discovery followed by unchanged quantity inference."""

import argparse
import json
from pathlib import Path

from ingredient_detection.adapters.qwen_vision import QwenVisionModel
from ingredient_detection.pipeline.automatic_ingredient_pipeline import (
    AutomaticIngredientPipeline,
)
from ingredient_detection.services.benchmark_metadata import load_benchmark_clips


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True, type=Path)
    parser.add_argument(
        "--evaluate",
        action="store_true",
        help="Compare discovery with benchmark labels only after prediction",
    )
    parser.add_argument("--metadata", type=Path, default=Path("samples/clip_metadata.json"))
    parser.add_argument("--mapping", type=Path, default=Path("samples/benchmark_mapping.json"))
    args = parser.parse_args()

    model = QwenVisionModel()
    result = AutomaticIngredientPipeline(model, model).process(str(args.video))
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

    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
