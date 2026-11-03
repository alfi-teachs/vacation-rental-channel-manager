"""Request and response models."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

Channel = Literal["Airbnb", "Vrbo", "Direct"]
Status = Literal["Pending", "Confirmed", "Cancelled"]

MAX_STAY_NIGHTS = 60


class Property(BaseModel):
    id: int
    name: str
    location: str
    property_type: str
    bedrooms: int
    max_guests: int
    nightly_rate: int
    currency: str


class Reservation(BaseModel):
    id: int
    property_id: int
    property_name: str
    guest_name: str
    channel: Channel
    check_in: date
    check_out: date
    nights: int
    guests: int
    status: Status
    total_amount: int
    currency: str
    created_at: str


class ReservationCreate(BaseModel):
    property_id: int = Field(gt=0)
    guest_name: str = Field(min_length=1, max_length=120)
    channel: Channel
    check_in: date
    check_out: date
    guests: int = Field(ge=1, le=20)
    status: Literal["Pending", "Confirmed"] = "Pending"

    @field_validator("guest_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Guest name cannot be blank")
        return value

    @model_validator(mode="after")
    def check_dates(self):
        if self.check_out <= self.check_in:
            raise ValueError("Check-out must be after check-in")
        if (self.check_out - self.check_in).days > MAX_STAY_NIGHTS:
            raise ValueError(f"Stays are limited to {MAX_STAY_NIGHTS} nights")
        return self


class ReservationUpdate(BaseModel):
    status: Status
