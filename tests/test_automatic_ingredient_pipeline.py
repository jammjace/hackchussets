from pathlib import Path

import pytest
from pydantic import ValidationError

from ingredient_detection.adapters.qwen_mock import MockIngredientDiscovery
from ingredient_detection.adapters.qwen_vision import QwenVisionModel, parse_discovery_response
from ingredient_detection.interfaces.ingredient_discovery import IIngredientDiscovery
from ingredient_detection.interfaces.interval_inference import IIntervalInference
from ingredient_detection.models.intervals import FrameInterval
from ingredient_detection.models.qwen import IngredientDiscovery, IntervalPrediction
from ingredient_detection.pipeline.automatic_ingredient_pipeline import (
    AutomaticIngredientPipeline,
)


SAMPLES = Path(__file__).parents[1] / "samples"


def discovery(name, start=1.0, end=2.0, confirmed=True, confidence="medium"):
    return IngredientDiscovery(
        ingredient=name,
        timestamp_start=start,
        timestamp_end=end,
        addition_confirmed=confirmed,
        confidence=confidence,
    )


class RecordingQuantityInference(IIntervalInference):
    def __init__(self):
        self.ingredients = []

    def predict(self, interval: FrameInterval, expected_ingredient: str):
        self.ingredients.append(expected_ingredient)
        return IntervalPrediction(
            ingredient=expected_ingredient,
            pouring_detected=False,
            quantity_tbsp=0,
            confidence="low",
            raw_response="fixture",
            timestamp_start=interval.timestamp_start,
            timestamp_end=interval.timestamp_end,
        )


def run(discoveries):
    discoverer = MockIngredientDiscovery(discoveries)
    quantity = RecordingQuantityInference()
    result = AutomaticIngredientPipeline(discoverer, quantity).process(
        str(SAMPLES / "test1.mp4")
    )
    return result, discoverer, quantity


def test_discovers_generic_ingredient_without_brand_output():
    result, _, _ = run([discovery("olive oil")])
    found = result.discovery.ingredients[0]
    assert found.ingredient == "olive oil"
    assert set(found.model_dump()) == {
        "ingredient",
        "timestamp_start",
        "timestamp_end",
        "addition_confirmed",
        "confidence",
    }


def test_supports_multiple_ingredient_detections():
    result, _, _ = run(
        [discovery("salt", 1, 2), discovery("garlic", 4, 5, confidence="high")]
    )
    assert [item.ingredient for item in result.discovery.ingredients] == ["salt", "garlic"]
    assert [item.discovery.ingredient for item in result.quantities] == ["salt", "garlic"]


def test_repeated_additions_keep_distinct_timestamps():
    result, _, _ = run(
        [discovery("salt", 1, 2), discovery("salt", 5, 6, confidence="high")]
    )
    assert [
        (item.ingredient, item.timestamp_start, item.timestamp_end)
        for item in result.discovery.ingredients
    ] == [("salt", 1.0, 2.0), ("salt", 5.0, 6.0)]
    assert [
        (item.discovery.timestamp_start, item.discovery.timestamp_end)
        for item in result.quantities
    ] == [(1.0, 2.0), (5.0, 6.0)]


def test_empty_discovery_runs_no_quantity_inference():
    result, _, quantity = run([])
    assert result.discovery.ingredients == []
    assert result.quantities == []
    assert quantity.ingredients == []


def test_unknown_is_preserved_and_skips_quantity_inference():
    result, _, quantity = run([discovery("unknown", confidence="low")])
    assert result.discovery.ingredients[0].ingredient == "unknown"
    assert result.quantities == []
    assert quantity.ingredients == []


def test_discovered_name_is_passed_to_existing_interval_estimator():
    result, _, quantity = run([discovery("cinnamon")])
    assert len(result.quantities[0].predictions) == 8
    assert quantity.ingredients == ["cinnamon"] * 8


def test_prediction_path_has_no_benchmark_label_input_or_metadata_lookup():
    result, discoverer, quantity = run([discovery("pepper")])
    assert discoverer.received_timestamps == [float(index) for index in range(8)]
    assert result.discovery.ingredients[0].ingredient == "pepper"
    assert set(quantity.ingredients) == {"pepper"}


def test_discovery_parser_handles_multiple_empty_and_unknown_results():
    multiple = parse_discovery_response(
        '{"ingredients":['
        '{"ingredient":"butter","timestamp_start":1,"timestamp_end":2,'
        '"addition_confirmed":true,"confidence":"high"},'
        '{"ingredient":"unknown","timestamp_start":3,"timestamp_end":4,'
        '"addition_confirmed":true,"confidence":"low"}]}'
    )
    empty = parse_discovery_response('{"ingredients":[]}')
    assert [item.ingredient for item in multiple.ingredients] == ["butter", "unknown"]
    assert empty.ingredients == []


def test_discovery_schema_rejects_separate_brand_output():
    with pytest.raises(ValidationError):
        parse_discovery_response(
            '{"ingredients":[{"ingredient":"salt","brand":"example brand",'
            '"timestamp_start":1,"timestamp_end":2,"addition_confirmed":true,'
            '"confidence":"medium"}]}'
        )


def test_real_and_mock_discovery_share_interface_without_loading_model():
    assert issubclass(QwenVisionModel, IIngredientDiscovery)
    assert issubclass(MockIngredientDiscovery, IIngredientDiscovery)
