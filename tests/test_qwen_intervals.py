import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from ingredient_detection.adapters.qwen_mock import MockQwenVisionModel
from ingredient_detection.adapters.qwen_vision import QwenVisionModel, parse_interval_response
from ingredient_detection.interfaces.interval_inference import IIntervalInference
from ingredient_detection.pipeline.qwen_interval_pipeline import QwenIntervalPipeline
from ingredient_detection.services.benchmark_metadata import load_benchmark_clips
from ingredient_detection.services.interval_extractor import OneSecondIntervalExtractor
from ingredient_detection.services.video_processor import VideoProcessor


SAMPLES = Path(__file__).parents[1] / "samples"


def test_confirmed_mapping_and_metadata_offsets():
    clips = load_benchmark_clips(
        SAMPLES / "clip_metadata.json", SAMPLES / "benchmark_mapping.json"
    )
    assert clips["test1.mp4"].video_id == "P12_101"
    assert clips["test1.mp4"].ingredient == "salt"
    assert clips["test2.mp4"].video_id == "P22_113"
    assert clips["test2.mp4"].ingredient == "oil"


@pytest.mark.parametrize("filename", ["test1.mp4", "test2.mp4"])
def test_real_sample_produces_eight_rgb_intervals(filename):
    metadata = VideoProcessor().validate_and_describe(str(SAMPLES / filename))
    intervals = list(OneSecondIntervalExtractor().iter_intervals(metadata))
    assert len(intervals) == 8
    assert [(item.timestamp_start, item.timestamp_end) for item in intervals] == [
        (float(index), float(index + 1)) for index in range(8)
    ]
    for interval in intervals:
        assert len(interval.frames) == 2
        assert all(image.mode == "RGB" for image in interval.frames)
        assert all(image.width == 768 for image in interval.frames)
        assert all(image.height == 432 for image in interval.frames)


@pytest.mark.parametrize(
    ("filename", "video_id", "ingredient", "offset", "quantities"),
    [
        ("test1.mp4", "P12_101", "salt", 1892.945, [0.5, 0.5, 0.5, 0.5, 0, 0, 0, 0]),
        ("test2.mp4", "P22_113", "oil", 94.465, [0.5, 1.0, 0.5, 0, 0, 0, 0, 0]),
    ],
)
def test_mock_pipeline_matches_recorded_predictions(
    filename, video_id, ingredient, offset, quantities
):
    result = QwenIntervalPipeline(MockQwenVisionModel(video_id)).process(
        str(SAMPLES / filename), video_id, ingredient, offset
    )
    assert [item.quantity_tbsp for item in result.predictions] == quantities
    assert [item.pouring_detected for item in result.predictions] == [
        value > 0 for value in quantities
    ]
    assert result.predictions[0].original_timestamp_start == pytest.approx(offset)
    assert all(item.raw_response for item in result.predictions)


def test_response_parser_accepts_fenced_json():
    parsed = parse_interval_response(
        '```json\n{"ingredient":"oil","pouring_detected":false,'
        '"quantity_tbsp":0,"confidence":"low"}\n```'
    )
    assert parsed.ingredient == "oil"


def test_no_pour_null_quantity_is_normalized_to_zero():
    parsed = parse_interval_response(
        '{"ingredient":"salt","pouring_detected":false,'
        '"quantity_tbsp":null,"confidence":"low"}'
    )
    assert parsed.pouring_detected is False
    assert parsed.quantity_tbsp == 0


def test_detected_pour_preserves_unknown_null_quantity():
    parsed = parse_interval_response(
        '{"ingredient":"salt","pouring_detected":true,'
        '"quantity_tbsp":null,"confidence":"low"}'
    )
    assert parsed.pouring_detected is True
    assert parsed.quantity_tbsp is None


def test_no_pour_positive_quantity_is_rejected():
    with pytest.raises(ValidationError, match="quantity_tbsp must be 0"):
        parse_interval_response(
            '{"ingredient":"salt","pouring_detected":false,'
            '"quantity_tbsp":0.5,"confidence":"low"}'
        )


@pytest.mark.parametrize(
    "raw",
    [
        "not json",
        '{"ingredient":"oil"}',
        '{"ingredient":"oil","pouring_detected":false,"quantity_tbsp":1,"confidence":"low"}',
        '{"ingredient":"oil","pouring_detected":false,"quantity_tbsp":0,"confidence":"certain"}',
    ],
)
def test_response_parser_rejects_invalid_or_incomplete_output(raw):
    with pytest.raises((ValueError, ValidationError)):
        parse_interval_response(raw)


def test_real_and_mock_share_interface_without_loading_real_model():
    assert issubclass(QwenVisionModel, IIntervalInference)
    assert issubclass(MockQwenVisionModel, IIntervalInference)
