import json
from pathlib import Path

import pytest

from ingredient_detection.adapters.qwen_mock import (
    RECORDED_DISCOVERIES,
    MockIngredientDiscovery,
    MockQwenVisionModel,
)
from ingredient_detection.models.qwen import (
    IngredientDiscovery,
    IngredientDiscoveryResult,
    IntervalPrediction,
)
from ingredient_detection.pipeline.automatic_ingredient_pipeline import (
    AutomaticIngredientPipeline,
    AutomaticIngredientResult,
    DiscoveredIngredientQuantities,
)
from ingredient_detection.services.quantity_aggregator import (
    IngredientQuantityAggregator,
)


SAMPLES = Path(__file__).parents[1] / "samples"


def discovery(name, start, end, confirmed=True):
    return IngredientDiscovery(
        ingredient=name,
        timestamp_start=start,
        timestamp_end=end,
        addition_confirmed=confirmed,
        confidence="medium" if confirmed else "low",
    )


def prediction(start, quantity, pouring=True, ingredient="salt"):
    return IntervalPrediction(
        ingredient=ingredient,
        pouring_detected=pouring,
        quantity_tbsp=quantity,
        confidence="medium" if pouring else "low",
        timestamp_start=start,
        timestamp_end=start + 1,
        raw_response="fixture",
    )


def automatic_result(discoveries, predictions_by_discovery=None):
    predictions_by_discovery = predictions_by_discovery or [[] for _ in discoveries]
    return AutomaticIngredientResult(
        discovery=IngredientDiscoveryResult(
            ingredients=discoveries, raw_response="fixture"
        ),
        quantities=[
            DiscoveredIngredientQuantities(item, predictions)
            for item, predictions in zip(discoveries, predictions_by_discovery)
            if item.addition_confirmed and item.ingredient != "unknown"
        ],
    )


def aggregate(result, session_id="session"):
    return IngredientQuantityAggregator().aggregate(result, session_id)


def test_four_consecutive_salt_intervals_aggregate_to_two_tablespoons():
    item = discovery("salt", 0, 4)
    result = aggregate(
        automatic_result(
            [item],
            [[prediction(index, 0.5) for index in range(4)]],
        ),
        "test1",
    )
    event = result.ingredients[0]
    assert event.quantity == 2.0
    assert (event.timestamp_start, event.timestamp_end) == (0.0, 4.0)
    assert event.estimate_complete is True
    assert event.event_id == "event_001"


def test_no_pouring_intervals_are_not_summed():
    item = discovery("salt", 0, 4)
    predictions = [
        prediction(0, 0.5),
        prediction(1, 0, pouring=False),
        prediction(2, 0.5),
    ]
    events = aggregate(automatic_result([item], [predictions])).ingredients
    assert [(event.quantity, event.timestamp_start, event.timestamp_end) for event in events] == [
        (0.5, 0.0, 1.0),
        (0.5, 2.0, 3.0),
    ]


def test_confirmed_discovery_with_only_no_pour_intervals_has_zero_estimate():
    item = discovery("salt", 0, 2)
    event = aggregate(
        automatic_result(
            [item],
            [[prediction(0, 0, pouring=False), prediction(1, 0, pouring=False)]],
        )
    ).ingredients[0]
    assert event.quantity == 0.0
    assert event.estimate_complete is True
    assert (event.timestamp_start, event.timestamp_end) == (0.0, 2.0)


def test_repeated_same_ingredient_additions_remain_separate():
    first, second = discovery("salt", 0, 2), discovery("salt", 4, 6)
    result = aggregate(
        automatic_result(
            [first, second],
            [
                [prediction(0, 0.5), prediction(1, 0.5)],
                [prediction(4, 1.0), prediction(5, 0.5)],
            ],
        )
    )
    assert [(event.quantity, event.timestamp_start, event.timestamp_end) for event in result.ingredients] == [
        (1.0, 0.0, 2.0),
        (1.5, 4.0, 6.0),
    ]


def test_multiple_distinct_ingredients_are_supported():
    salt, oil = discovery("salt", 0, 1), discovery("olive oil", 2, 3)
    result = aggregate(
        automatic_result(
            [salt, oil],
            [[prediction(0, 0.5)], [prediction(2, 1.0, ingredient="olive oil")]],
        )
    )
    assert [(event.ingredient, event.quantity) for event in result.ingredients] == [
        ("salt", 0.5),
        ("olive oil", 1.0),
    ]


def test_overlapping_same_ingredient_discoveries_assign_interval_once():
    first, second = discovery("salt", 0, 2), discovery("salt", 1, 3)
    shared = [prediction(0, 0.5), prediction(1, 0.5), prediction(2, 0.5)]
    result = aggregate(automatic_result([first, second], [shared, shared]))
    assert [(event.quantity, event.timestamp_start, event.timestamp_end) for event in result.ingredients] == [
        (1.0, 0.0, 2.0),
        (0.5, 2.0, 3.0),
    ]
    assert sum(event.quantity or 0 for event in result.ingredients) == 1.5


def test_unknown_and_unconfirmed_discoveries_preserve_uncertainty():
    unknown = discovery("unknown", 1, 2)
    unconfirmed = discovery("pepper", 3, 4, confirmed=False)
    result = aggregate(automatic_result([unknown, unconfirmed]))
    assert [(event.ingredient, event.quantity, event.addition_confirmed) for event in result.ingredients] == [
        ("unknown", None, True),
        ("pepper", None, False),
    ]
    assert all(not event.estimate_complete for event in result.ingredients)


def test_partial_unknown_quantity_exposes_subtotal_but_not_total():
    item = discovery("salt", 0, 2)
    event = aggregate(
        automatic_result([item], [[prediction(0, 0.5), prediction(1, None)]])
    ).ingredients[0]
    assert event.quantity is None
    assert event.known_estimated_subtotal_tbsp == 0.5
    assert event.estimate_complete is False


def test_completely_unknown_quantity_has_no_subtotal():
    item = discovery("salt", 0, 2)
    event = aggregate(
        automatic_result([item], [[prediction(0, None), prediction(1, None)]])
    ).ingredients[0]
    assert event.quantity is None
    assert event.known_estimated_subtotal_tbsp is None
    assert event.estimate_complete is False


def test_empty_discovery_exports_empty_array():
    result = aggregate(automatic_result([]))
    assert result.ingredients == []


def test_timestamps_round_offsets_and_event_ids_are_stable():
    later = discovery("oil", 2.0004, 3.0004)
    earlier = discovery("salt", 0.0004, 1.0004)
    result = IngredientQuantityAggregator().aggregate(
        automatic_result(
            [later, earlier],
            [[prediction(2.0004, 1, ingredient="oil")], [prediction(0.0004, 0.5)]],
        ),
        "rounding",
        original_timestamp_offset=94.4654,
    )
    assert [event.event_id for event in result.ingredients] == ["event_001", "event_002"]
    assert result.ingredients[0].timestamp_start == 0.0
    assert result.ingredients[0].original_timestamp_start == 94.465


def test_json_serialization_omits_raw_responses_and_null_optional_fields(tmp_path):
    item = discovery("salt", 0, 1)
    export = aggregate(automatic_result([item], [[prediction(0, 0.5)]]), "test1")
    path = IngredientQuantityAggregator().write_json(export, tmp_path / "ingredients.json")
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["session_id"] == "test1"
    assert payload["ingredients"][0]["quantity_source"] == "interval_visual_estimate"
    assert "raw_response" not in path.read_text(encoding="utf-8")
    assert "original_timestamp_start" not in payload["ingredients"][0]


def test_incomplete_json_preserves_required_null_quantity_and_subtotal(tmp_path):
    item = discovery("salt", 0, 2)
    export = aggregate(
        automatic_result([item], [[prediction(0, 0.5), prediction(1, None)]])
    )
    path = IngredientQuantityAggregator().write_json(export, tmp_path / "ingredients.json")
    event = json.loads(path.read_text(encoding="utf-8"))["ingredients"][0]
    assert "quantity" in event and event["quantity"] is None
    assert event["known_estimated_subtotal_tbsp"] == 0.5


@pytest.mark.parametrize(
    ("filename", "video_id", "ingredient", "expected_total"),
    [
        ("test1.mp4", "P12_101", "salt", 2.0),
        ("test2.mp4", "P22_113", "oil", 2.0),
    ],
)
def test_recorded_mock_pipeline_end_to_end(filename, video_id, ingredient, expected_total):
    result = AutomaticIngredientPipeline(
        MockIngredientDiscovery(RECORDED_DISCOVERIES[video_id]),
        MockQwenVisionModel(video_id),
    ).process(str(SAMPLES / filename))
    export = aggregate(result, Path(filename).stem)
    assert len(export.ingredients) == 1
    assert export.ingredients[0].ingredient == ingredient
    assert export.ingredients[0].quantity == expected_total
