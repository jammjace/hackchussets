from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AggregatedIngredientEvent(BaseModel):
    """Frontend-facing Module A event derived from validated interval estimates."""

    model_config = ConfigDict(extra="forbid")

    event_id: str
    ingredient: str
    quantity: float | None = Field(ge=0)
    unit: Literal["tablespoon"] = "tablespoon"
    quantity_source: Literal["interval_visual_estimate"] = (
        "interval_visual_estimate"
    )
    timestamp_start: float = Field(ge=0)
    timestamp_end: float = Field(ge=0)
    addition_confirmed: bool
    estimate_complete: bool
    known_estimated_subtotal_tbsp: float | None = Field(default=None, ge=0)
    original_timestamp_start: float | None = Field(default=None, ge=0)
    original_timestamp_end: float | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_event(self) -> "AggregatedIngredientEvent":
        if self.timestamp_end < self.timestamp_start:
            raise ValueError("timestamp_end must not precede timestamp_start")
        if self.estimate_complete and self.quantity is None:
            raise ValueError("complete estimates require a numeric quantity")
        if not self.estimate_complete and self.quantity is not None:
            raise ValueError("incomplete estimates must use quantity=null")
        return self


class IngredientsExport(BaseModel):
    """Final Module A quantity artifact."""

    model_config = ConfigDict(extra="forbid")

    session_id: str
    ingredients: list[AggregatedIngredientEvent]
