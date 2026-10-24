from ingredient_detection.models.ingredient_event import IngredientObservation
from ingredient_detection.services.event_tracker import IngredientEventTracker


def obs(start, end, ingredient=None, qty=None, unit=None, confirmed=False):
    return IngredientObservation(
        timestamp_start=start,
        timestamp_end=end,
        ingredient=ingredient,
        quantity=qty,
        unit=unit,
        addition_confirmed=confirmed,
    )


def test_deduplicates_overlapping_windows():
    tracker = IngredientEventTracker(merge_gap_seconds=4.0)
    observations = [
        obs(10.0, 14.0, "salt", 0.5, "teaspoon", True),
        obs(12.0, 16.0, "salt", 0.5, "teaspoon", True),  # overlapping duplicate
    ]
    export = tracker.build_export(observations)
    assert len(export.events) == 1
    assert export.events[0].ingredient == "salt"
    assert export.events[0].timestamp_end == 16.0


def test_preserves_genuine_repeated_additions():
    tracker = IngredientEventTracker(merge_gap_seconds=4.0)
    observations = [
        obs(10.0, 14.0, "salt", 0.5, "teaspoon", True),
        obs(40.0, 44.0, "salt", 0.5, "teaspoon", True),  # far apart -> separate
    ]
    export = tracker.build_export(observations)
    assert len(export.events) == 2
    assert [e.event_id for e in export.events] == ["event_001", "event_002"]


def test_filters_invalid_events():
    tracker = IngredientEventTracker()
    observations = [
        obs(1.0, 5.0, "salt", None, "teaspoon", True),       # no quantity
        obs(6.0, 10.0, "onion", 1.0, "piece", False),        # not confirmed
        obs(11.0, 15.0, None, 2.0, "tablespoon", True),      # no ingredient
        obs(16.0, 20.0, "sugar", 1.0, None, True),           # no unit
        obs(21.0, 25.0, "pepper", 1.0, "teaspoon", True),    # valid
    ]
    export = tracker.build_export(observations)
    assert len(export.events) == 1
    assert export.events[0].ingredient == "pepper"


def test_events_sorted_by_timestamp():
    tracker = IngredientEventTracker()
    observations = [
        obs(30.0, 34.0, "pepper", 1.0, "teaspoon", True),
        obs(5.0, 9.0, "salt", 0.5, "teaspoon", True),
    ]
    export = tracker.build_export(observations)
    starts = [e.timestamp_start for e in export.events]
    assert starts == sorted(starts)
