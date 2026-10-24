"""Module B: sodium calculation.

Pure functions only: no FastAPI, no file paths, no video. Takes Module A's
events.json (as a dict) plus a pantry (as a dict) and returns sodium per event,
keyed by event_id, plus the recipe total.

Rules from the team README:
- Never change event_id, timestamps, evidence_frame, quantity or unit.
- Unknown ingredients or units are flagged, never counted as 0 mg.
- Repeated additions are counted separately.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any

STATUS_OK = "ok"
STATUS_UNRECOGNISED = "unrecognised_ingredient"
STATUS_UNSUPPORTED_UNIT = "unsupported_unit"
STATUS_NOT_CONFIRMED = "not_confirmed"


def normalise_text(text: str) -> str:
    """Lowercase, strip accents and punctuation: 'Nuoc Mam!' and 'nuoc mam' match."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.replace("đ", "d").replace("Đ", "d")
    text = re.sub(r"[^a-z0-9 ]+", " ", text.lower())
    return re.sub(r"\s+", " ", text).strip()


def normalise_unit(unit: str, pantry: dict[str, Any]) -> str:
    u = normalise_text(unit)
    return pantry.get("unit_aliases", {}).get(u, u)


def match_category(ingredient: str, pantry: dict[str, Any]) -> dict[str, Any] | None:
    """Exact alias match first, then the longest alias contained in the name
    ('dark soy sauce' -> soy sauce). Longest wins so 'chicken stock cube'
    beats 'bouillon'."""
    name = normalise_text(ingredient)
    categories = pantry.get("categories", [])
    for cat in categories:
        if name in (normalise_text(a) for a in cat["aliases"]):
            return cat
    best, best_len = None, 0
    padded = f" {name} "
    for cat in categories:
        for alias in cat["aliases"]:
            a = normalise_text(alias)
            if a and f" {a} " in padded and len(a) > best_len:
                best, best_len = cat, len(a)
    return best


def _find_product(category: dict[str, Any], pantry: dict[str, Any]) -> dict[str, Any] | None:
    pid = category.get("default_product_id")
    for product in pantry.get("products", []):
        if product["product_id"] == pid:
            return product
    return None


def sodium_for_quantity(product: dict[str, Any], quantity: float, unit: str,
                        pantry: dict[str, Any]) -> float | None:
    """Direct per-unit value first; otherwise convert between volume units via ml.
    Returns None when the unit cannot be converted for this product."""
    per_unit = product.get("sodium_mg_per_unit", {})
    if unit in per_unit:
        return quantity * per_unit[unit]

    volume = pantry.get("volume_ml", {})
    if unit in volume:
        for known_unit, mg in per_unit.items():
            if known_unit in volume:
                mg_per_ml = mg / volume[known_unit]
                return quantity * volume[unit] * mg_per_ml
    return None


def calculate(events_doc: dict[str, Any], pantry: dict[str, Any]) -> dict[str, Any]:
    """Return per-event sodium and the recipe total, following README section 8,
    plus status, matched product, and warnings for the web app."""
    results: list[dict[str, Any]] = []
    warnings: list[str] = []
    total = 0.0

    for event in events_doc.get("events", []):
        row: dict[str, Any] = {
            "event_id": event["event_id"],
            "sodium_mg": None,
            "status": STATUS_OK,
            "category_id": None,
            "product_id": None,
            "product_name": None,
        }

        if not event.get("addition_confirmed", True):
            row["status"] = STATUS_NOT_CONFIRMED
            results.append(row)
            continue

        category = match_category(event["ingredient"], pantry)
        product = _find_product(category, pantry) if category else None
        if category is None or product is None:
            row["status"] = STATUS_UNRECOGNISED
            warnings.append(
                f"'{event['ingredient']}' isn't in the pantry, so the real total is higher."
            )
            results.append(row)
            continue

        row["category_id"] = category["category_id"]
        row["product_id"] = product["product_id"]
        row["product_name"] = f"{product['brand']} {product['name']}".strip()

        unit = normalise_unit(event["unit"], pantry)
        mg = sodium_for_quantity(product, float(event["quantity"]), unit, pantry)
        if mg is None:
            row["status"] = STATUS_UNSUPPORTED_UNIT
            warnings.append(
                f"Can't convert '{event['unit']}' of {category['display_name']}, so it isn't counted."
            )
            results.append(row)
            continue

        row["sodium_mg"] = round(mg, 1)
        total += mg
        results.append(row)

    return {
        "session_id": events_doc.get("session_id"),
        "results": results,
        "total_sodium_mg": round(total, 1),
        "is_incomplete": any(r["status"] != STATUS_OK for r in results),
        "warnings": warnings,
    }
