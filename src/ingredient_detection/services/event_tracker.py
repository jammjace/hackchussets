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

    def build_export(self, observations: list[IngredientObservation]) -> EventExport:
        valid = [o for o in observations if o.is_valid()]
        valid.sort(key=lambda o: o.timestamp_start)

        merged: list[IngredientObservation] = []
        for obs in valid:
            last = self._last_for_ingredient(merged, obs.ingredient)
            if last is not None and obs.timestamp_start <= last.timestamp_end + self.merge_gap_seconds:
                # Same ingredient within gap -> duplicate of overlapping windows.
                last.timestamp_end = max(last.timestamp_end, obs.timestamp_end)
            else:
                merged.append(obs.model_copy())

        merged.sort(key=lambda o: o.timestamp_start)
        events = [
            IngredientEvent(
                event_id=f"event_{i + 1:03d}",
                timestamp_start=o.timestamp_start,
                timestamp_end=o.timestamp_end,
                ingredient=o.ingredient,  # type: ignore[arg-type]
                quantity=o.quantity,  # type: ignore[arg-type]
                unit=o.unit,  # type: ignore[arg-type]
                addition_confirmed=True,
            )
            for i, o in enumerate(merged)
        ]
        return EventExport(events=events)

    @staticmethod
    def _last_for_ingredient(
        obs_list: list[IngredientObservation], ingredient: str | None
    ) -> IngredientObservation | None:
        for o in reversed(obs_list):
            if o.ingredient == ingredient:
                return o
        return None
