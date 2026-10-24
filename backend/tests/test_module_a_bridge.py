from module_a_bridge import ingredients_export_to_events


def test_bridge_adapts_rich_export_and_preserves_nullable_quantity():
    source = {
        "session_id": "cooking_001",
        "ingredients": [{
            "event_id": "event_001",
            "ingredient": "salt",
            "quantity": None,
            "unit": "tablespoon",
            "quantity_source": "interval_visual_estimate",
            "timestamp_start": 1.0,
            "timestamp_end": 3.0,
            "addition_confirmed": True,
            "estimate_complete": False,
            "known_estimated_subtotal_tbsp": 0.5,
        }],
    }
    result = ingredients_export_to_events(source)
    event = result["events"][0]
    assert result["session_id"] == "cooking_001"
    assert event["timestamp"] == 1.0
    assert event["quantity"] is None
    assert event["known_estimated_subtotal_tbsp"] == 0.5
    assert event["evidence_frame"] is None
