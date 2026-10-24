from pydantic import BaseModel, Field


class IngredientObservation(BaseModel):
    """Raw observation from the VLM for one window. May be incomplete/invalid."""

    timestamp_start: float = Field(ge=0)
    timestamp_end: float = Field(ge=0)
    ingredient: str | None = None
    quantity: float | None = None
    unit: str | None = None
    addition_confirmed: bool = False

    def is_valid(self) -> bool:
        """Export rule: ingredient + confirmed addition + numeric qty + unit."""
        return (
            bool(self.ingredient)
            and self.addition_confirmed
            and self.quantity is not None
            and self.quantity > 0
            and bool(self.unit)
        )


class IngredientEvent(BaseModel):
    """Final exported event. Preserves original observed quantity and unit."""

    event_id: str
    timestamp_start: float = Field(ge=0)
    timestamp_end: float = Field(ge=0)
    ingredient: str
    quantity: float = Field(gt=0)
    unit: str
    addition_confirmed: bool = True


class EventExport(BaseModel):
    """Strict JSON output contract."""

    events: list[IngredientEvent] = Field(default_factory=list)
