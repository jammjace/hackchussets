import json
from pathlib import Path

import pytest

from sodium_engine import calculate, load_default_pantry

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "mock_events.json"


@pytest.fixture
def pantry():
    return load_default_pantry()


@pytest.fixture
def events():
    return json.loads(FIXTURE.read_text())


def test_mock_total_is_5163_3(events, pantry):
    # Safety net: if this number changes, the engine or the pantry changed.
    # 2080 cube + 850 sazon + 960 soy tbsp + 953.3 fish 2 tsp + 320 soy tsp
    result = calculate(events, pantry)
    assert result["total_sodium_mg"] == pytest.approx(5163.3, abs=0.1)


def test_every_event_keeps_its_id_in_order(events, pantry):
    result = calculate(events, pantry)
    assert [r["event_id"] for r in result["results"]] == [e["event_id"] for e in events["events"]]


def test_unknown_ingredient_is_flagged_not_zero(events, pantry):
    result = calculate(events, pantry)
    oyster = next(r for r in result["results"] if r["event_id"] == "event_006")
    assert oyster["status"] == "unrecognised_ingredient"
    assert oyster["sodium_mg"] is None
    assert result["is_incomplete"] is True
    assert any("oyster sauce" in w for w in result["warnings"])


def test_repeated_additions_count_separately(events, pantry):
    result = calculate(events, pantry)
    soy = [r for r in result["results"] if r["category_id"] == "soy_sauce"]
    assert [r["sodium_mg"] for r in soy] == [960.0, 320.0]


@pytest.mark.parametrize("ingredient,unit,expected", [
    ("Soy Sauce", "tbsp", 960.0),
    ("soya sauce", "Tablespoons", 960.0),
    ("dark soy sauce", "tsp", 320.0),
    ("Nước mắm", "tablespoon", 1430.0),
    ("Sazón", "packets", 850.0),
    ("chicken stock cube", "cubes", 2080.0),
    ("salt", "teaspoon", 2325.0),
])
def test_aliases_accents_and_unit_spellings(pantry, ingredient, unit, expected):
    doc = {"events": [{"event_id": "e1", "timestamp_start": 0, "timestamp_end": 1,
                       "ingredient": ingredient, "quantity": 1, "unit": unit,
                       "addition_confirmed": True}]}
    assert calculate(doc, pantry)["results"][0]["sodium_mg"] == pytest.approx(expected, abs=0.1)


def test_unconvertible_unit_is_flagged(pantry):
    doc = {"events": [{"event_id": "e1", "timestamp_start": 0, "timestamp_end": 1,
                       "ingredient": "chicken bouillon", "quantity": 1, "unit": "piece",
                       "addition_confirmed": True}]}
    row = calculate(doc, pantry)["results"][0]
    assert row["status"] == "unsupported_unit"
    assert row["sodium_mg"] is None


def test_engine_does_not_modify_input(events, pantry):
    before = json.dumps(events, sort_keys=True)
    calculate(events, pantry)
    assert json.dumps(events, sort_keys=True) == before


def test_null_quantity_is_incomplete_instead_of_crashing(pantry):
    doc = {"events": [{
        "event_id": "e1", "timestamp_start": 0, "timestamp_end": 1,
        "ingredient": "salt", "quantity": None, "unit": "tablespoon",
        "addition_confirmed": True, "estimate_complete": False,
    }]}
    result = calculate(doc, pantry)
    assert result["results"][0]["status"] == "incomplete_quantity"


def test_null_quantity_does_not_require_a_unit(pantry):
    doc = {"events": [{
        "event_id": "e1", "timestamp_start": 0, "timestamp_end": 1,
        "ingredient": "salt", "quantity": None, "unit": None,
        "addition_confirmed": True,
    }]}
    result = calculate(doc, pantry)
    assert result["results"][0]["status"] == "incomplete_quantity"
    assert result["results"][0]["sodium_mg"] is None
    assert result["total_sodium_mg"] == 0
    assert result["results"][0]["sodium_mg"] is None
    assert result["is_incomplete"] is True


def test_partial_quantity_counts_only_known_subtotal(pantry):
    doc = {"events": [{
        "event_id": "e1", "timestamp_start": 0, "timestamp_end": 2,
        "ingredient": "salt", "quantity": None, "unit": "tablespoon",
        "addition_confirmed": True, "estimate_complete": False,
        "known_estimated_subtotal_tbsp": 0.5,
    }]}
    result = calculate(doc, pantry)
    # 0.5 tablespoon = 1.5 teaspoons of salt.
    assert result["results"][0]["sodium_mg"] == pytest.approx(3487.5)
    assert result["total_sodium_mg"] == pytest.approx(3487.5)
    assert result["is_incomplete"] is True
