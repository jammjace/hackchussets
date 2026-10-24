import json
import re
from pathlib import Path

from ..models.ingredient_export import AggregatedIngredientEvent, IngredientsExport
from ..models.qwen import IngredientDiscovery, IntervalPrediction
from ..pipeline.automatic_ingredient_pipeline import AutomaticIngredientResult


class IngredientQuantityAggregator:
    """Aggregate validated interval predictions into distinct addition events."""

    def aggregate(
        self,
        result: AutomaticIngredientResult,
        session_id: str,
        original_timestamp_offset: float | None = None,
    ) -> IngredientsExport:
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,63}", session_id):
            raise ValueError("invalid session_id")
        if original_timestamp_offset is not None and original_timestamp_offset < 0:
            raise ValueError("original_timestamp_offset must be non-negative")

        predictions_by_discovery = {
            id(item.discovery): item.predictions for item in result.quantities
        }
        assignments = self._assign_active_intervals(
            result.discovery.ingredients, predictions_by_discovery
        )
        pending: list[AggregatedIngredientEvent] = []
        for index, discovery in enumerate(result.discovery.ingredients):
            active = assignments.get(index, [])
            if not discovery.addition_confirmed or discovery.ingredient == "unknown":
                pending.append(
                    self._uncertain_event(discovery, original_timestamp_offset)
                )
            elif not active:
                pending.append(
                    self._zero_event(discovery, original_timestamp_offset)
                )
            else:
                for group in self._consecutive_groups(active):
                    pending.append(
                        self._aggregate_group(
                            discovery, group, original_timestamp_offset
                        )
                    )

        pending.sort(key=lambda item: (item.timestamp_start, item.timestamp_end, item.ingredient))
        events = [
            item.model_copy(update={"event_id": f"event_{index:03d}"})
            for index, item in enumerate(pending, start=1)
        ]
        return IngredientsExport(session_id=session_id, ingredients=events)

    def write_json(self, export: IngredientsExport, output_path: str | Path) -> Path:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = export.model_dump(mode="json")
        optional_fields = {
            "known_estimated_subtotal_tbsp",
            "original_timestamp_start",
            "original_timestamp_end",
        }
        for event in payload["ingredients"]:
            for field in optional_fields:
                if event[field] is None:
                    del event[field]
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        return path

    @staticmethod
    def _assign_active_intervals(
        discoveries: list[IngredientDiscovery],
        predictions_by_discovery: dict[int, list[IntervalPrediction]],
    ) -> dict[int, list[IntervalPrediction]]:
        assigned: dict[int, list[IntervalPrediction]] = {}
        interval_candidates: dict[
            tuple[str, float, float], list[tuple[float, int, IntervalPrediction]]
        ] = {}
        for index, discovery in enumerate(discoveries):
            if not discovery.addition_confirmed or discovery.ingredient == "unknown":
                continue
            for prediction in predictions_by_discovery.get(id(discovery), []):
                if not prediction.pouring_detected:
                    continue
                overlap = min(prediction.timestamp_end, discovery.timestamp_end) - max(
                    prediction.timestamp_start, discovery.timestamp_start
                )
                if overlap <= 0:
                    continue
                key = (
                    discovery.ingredient,
                    prediction.timestamp_start,
                    prediction.timestamp_end,
                )
                interval_candidates.setdefault(key, []).append(
                    (overlap, index, prediction)
                )
        for candidates in interval_candidates.values():
            _, index, prediction = sorted(
                candidates, key=lambda item: (-item[0], item[1])
            )[0]
            assigned.setdefault(index, []).append(prediction)
        for predictions in assigned.values():
            predictions.sort(key=lambda item: item.timestamp_start)
        return assigned

    @staticmethod
    def _consecutive_groups(
        predictions: list[IntervalPrediction],
    ) -> list[list[IntervalPrediction]]:
        groups: list[list[IntervalPrediction]] = []
        for prediction in predictions:
            if not groups or round(prediction.timestamp_start, 3) != round(
                groups[-1][-1].timestamp_end, 3
            ):
                groups.append([prediction])
            else:
                groups[-1].append(prediction)
        return groups

    def _aggregate_group(
        self,
        discovery: IngredientDiscovery,
        predictions: list[IntervalPrediction],
        offset: float | None,
    ) -> AggregatedIngredientEvent:
        known = [item.quantity_tbsp for item in predictions if item.quantity_tbsp is not None]
        incomplete = len(known) != len(predictions)
        subtotal = round(sum(known), 6) if known else None
        start = round(predictions[0].timestamp_start, 3)
        end = round(predictions[-1].timestamp_end, 3)
        return AggregatedIngredientEvent(
            event_id="pending",
            ingredient=discovery.ingredient,
            quantity=None if incomplete else (subtotal or 0.0),
            timestamp_start=start,
            timestamp_end=end,
            addition_confirmed=True,
            estimate_complete=not incomplete,
            known_estimated_subtotal_tbsp=(subtotal if incomplete and known else None),
            original_timestamp_start=(round(start + offset, 3) if offset is not None else None),
            original_timestamp_end=(round(end + offset, 3) if offset is not None else None),
        )

    @staticmethod
    def _uncertain_event(
        discovery: IngredientDiscovery, offset: float | None
    ) -> AggregatedIngredientEvent:
        start, end = round(discovery.timestamp_start, 3), round(discovery.timestamp_end, 3)
        return AggregatedIngredientEvent(
            event_id="pending",
            ingredient=discovery.ingredient,
            quantity=None,
            timestamp_start=start,
            timestamp_end=end,
            addition_confirmed=discovery.addition_confirmed,
            estimate_complete=False,
            original_timestamp_start=(round(start + offset, 3) if offset is not None else None),
            original_timestamp_end=(round(end + offset, 3) if offset is not None else None),
        )

    @staticmethod
    def _zero_event(
        discovery: IngredientDiscovery, offset: float | None
    ) -> AggregatedIngredientEvent:
        start, end = round(discovery.timestamp_start, 3), round(discovery.timestamp_end, 3)
        return AggregatedIngredientEvent(
            event_id="pending",
            ingredient=discovery.ingredient,
            quantity=0.0,
            timestamp_start=start,
            timestamp_end=end,
            addition_confirmed=True,
            estimate_complete=True,
            original_timestamp_start=(round(start + offset, 3) if offset is not None else None),
            original_timestamp_end=(round(end + offset, 3) if offset is not None else None),
        )
