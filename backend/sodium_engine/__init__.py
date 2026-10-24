import json
from pathlib import Path

from .engine import calculate, match_category, normalise_unit  # noqa: F401

DEFAULT_PANTRY_PATH = Path(__file__).with_name("pantry_default.json")


def load_default_pantry() -> dict:
    return json.loads(DEFAULT_PANTRY_PATH.read_text(encoding="utf-8"))
