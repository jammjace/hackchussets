from ..models.ingredient_event import (
    EventExport,
    IngredientEvent,
    IngredientObservation,
)


class IngredientEventTracker:
    """Merge duplicate observations from overlapping windows while keeping
    genuine repeated additions separate. Exports only valid events.
    """

    def __init__(self, merge_gap_seconds: float = 4.0) -> None:
        # Observations of the same ingredient whose windows are within this gap
        # are treated as one overlapping observation (deduplicated).
        self.merge_gap_seconds = merge_gap_seconds

    def build_export(
        self, observations: list[IngredientObservation], session_id: str = "session"
    ) -> EventExport:
        valid = [o for o in observations if o.is_valid()]
        valid.sort(key=lambda o: o.timestamp_start)

        merged: list[IngredientObservation] = []
        for obs in valid:
            last = self._last_for_ingredient(merged, obs.ingredient)
            if last is not None and self._is_duplicate(last, obs):
                # Same ingredient within gap -> duplicate of overlapping windows.
                last.timestamp_end = max(last.timestamp_end, obs.timestamp_end)
                last.timestamp_start = min(last.timestamp_start, obs.timestamp_start)
                if last.timestamp is None:
                    last.timestamp = obs.timestamp
                if last.evidence_jpeg is None and obs.evidence_jpeg is not None:
                    last.evidence_jpeg = obs.evidence_jpeg
                    last.evidence_timestamp = obs.evidence_timestamp
            else:
                merged.append(obs.model_copy())

        merged.sort(key=lambda o: o.timestamp_start)
        events = [
            IngredientEvent(
                event_id=f"event_{i + 1:03d}",
                timestamp_start=o.timestamp_start,
                timestamp_end=o.timestamp_end,
                timestamp=(
                    o.timestamp
                    if o.timestamp is not None
                    else (o.timestamp_start + o.timestamp_end) / 2
                ),
                ingredient=o.ingredient,  # type: ignore[arg-type]
                quantity=o.quantity,  # type: ignore[arg-type]
                unit=o.unit,  # type: ignore[arg-type]
                addition_confirmed=True,
                evidence_timestamp=o.evidence_timestamp,
                evidence_jpeg=o.evidence_jpeg,
            )
            for i, o in enumerate(merged)
        ]
        return EventExport(session_id=session_id, events=events)

    def _is_duplicate(
        self, first: IngredientObservation, second: IngredientObservation
    ) -> bool:
        if first.ingredient.casefold() != second.ingredient.casefold():  # type: ignore[union-attr]
            return False
        if (
            first.quantity != second.quantity
            or first.unit.casefold() != second.unit.casefold()  # type: ignore[union-attr]
        ):
            return False
        first_time = first.timestamp or (first.timestamp_start + first.timestamp_end) / 2
        second_time = second.timestamp or (second.timestamp_start + second.timestamp_end) / 2
        windows_overlap = second.timestamp_start <= first.timestamp_end
        return windows_overlap and abs(second_time - first_time) <= self.merge_gap_seconds

    @staticmethod
    def _last_for_ingredient(
        obs_list: list[IngredientObservation], ingredient: str | None
    ) -> IngredientObservation | None:
        for o in reversed(obs_list):
            if o.ingredient and ingredient and o.ingredient.casefold() == ingredient.casefold():
                return o
        return None
