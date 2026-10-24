from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class QwenResponse(BaseModel):
    """Exact JSON contract requested from Qwen."""

    model_config = ConfigDict(extra="forbid")

    ingredient: str
    pouring_detected: bool
    quantity_tbsp: float | None = Field(ge=0)
    confidence: Literal["low", "medium", "high"]

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
