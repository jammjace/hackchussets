from pydantic import BaseModel, Field


class IngredientObservation(BaseModel):
    """Raw observation from the VLM for one window. May be incomplete/invalid."""

    timestamp_start: float = Field(ge=0)
    timestamp_end: float = Field(ge=0)
    timestamp: float | None = Field(default=None, ge=0)
    ingredient: str | None = None
    quantity: float | None = None
    unit: str | None = None
    addition_confirmed: bool = False
    evidence_timestamp: float | None = Field(default=None, ge=0)
    evidence_jpeg: bytes | None = Field(default=None, exclude=True, repr=False)

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
    timestamp: float = Field(ge=0)
    ingredient: str
    quantity: float = Field(gt=0)
    unit: str
    addition_confirmed: bool = True
    evidence_frame: str | None = None
    evidence_timestamp: float | None = Field(default=None, ge=0, exclude=True)
    evidence_jpeg: bytes | None = Field(default=None, exclude=True, repr=False)


class EventExport(BaseModel):
    """Strict JSON output contract."""

    session_id: str
    events: list[IngredientEvent] = Field(default_factory=list)
