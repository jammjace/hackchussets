from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class QwenResponse(BaseModel):
    """Exact JSON contract requested from Qwen."""

    model_config = ConfigDict(extra="forbid")

    ingredient: str
    pouring_detected: bool
    quantity_tbsp: float | None = Field(ge=0)
    confidence: Literal["low", "medium", "high"]

    @model_validator(mode="before")
    @classmethod
    def normalize_no_pour_null_quantity(cls, value: Any) -> Any:
        if (
            isinstance(value, dict)
            and value.get("pouring_detected") is False
            and value.get("quantity_tbsp") is None
        ):
            value = {**value, "quantity_tbsp": 0}
        return value

    @field_validator("ingredient")
    @classmethod
    def validate_ingredient(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("ingredient must not be empty")
        return value

    @model_validator(mode="after")
    def validate_quantity_state(self) -> "QwenResponse":
        if not self.pouring_detected and self.quantity_tbsp != 0:
            raise ValueError("quantity_tbsp must be 0 when pouring_detected is false")
        return self


class IntervalPrediction(QwenResponse):
    """Validated response enriched with local/original timestamps and raw text."""

    model_config = ConfigDict(extra="forbid")

    timestamp_start: float = Field(ge=0)
    timestamp_end: float = Field(gt=0)
    original_timestamp_start: float | None = Field(default=None, ge=0)
    original_timestamp_end: float | None = Field(default=None, ge=0)
    raw_response: str


class IngredientDiscovery(BaseModel):
    """One generic ingredient-addition candidate found in a video."""

    model_config = ConfigDict(extra="forbid")

    ingredient: str
    timestamp_start: float = Field(ge=0)
    timestamp_end: float = Field(ge=0)
    addition_confirmed: bool
    confidence: Literal["low", "medium", "high"]

    @field_validator("ingredient")
    @classmethod
    def normalize_ingredient(cls, value: str) -> str:
        value = value.strip().casefold()
        if not value:
            raise ValueError("ingredient must not be empty")
        return value

    @model_validator(mode="after")
    def validate_timestamps(self) -> "IngredientDiscovery":
        if self.timestamp_end < self.timestamp_start:
            raise ValueError("timestamp_end must not precede timestamp_start")
        return self


class IngredientDiscoveryResponse(BaseModel):
    """Exact structured discovery response from the model."""

    model_config = ConfigDict(extra="forbid")

    ingredients: list[IngredientDiscovery]


class IngredientDiscoveryResult(IngredientDiscoveryResponse):
    """Validated discovery response with the unmodified model text."""

    raw_response: str
