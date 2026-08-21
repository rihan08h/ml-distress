"""Reminder schemas."""

from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date


class ReminderCreateRequest(BaseModel):
    medicine_id: Optional[UUID] = None
    medicine_name: str
    dosage: Optional[str] = None
    frequency: str = "once_daily"
    times: list[str]  # ["08:00", "14:00"]
    start_date: date
    end_date: Optional[date] = None
    instructions: Optional[str] = None
    notification_channels: list[str] = ["push"]


class ReminderResponse(BaseModel):
    id: UUID
    status: str = "active"
    medicine_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    times: list[str]
    next_reminder: Optional[str] = None
    total_doses: int = 0
    completed_doses: int = 0

    model_config = {"from_attributes": True}


class ReminderUpdateRequest(BaseModel):
    medicine_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    times: Optional[list[str]] = None
    end_date: Optional[date] = None
    instructions: Optional[str] = None
    is_active: Optional[bool] = None


class DoseTakenResponse(BaseModel):
    reminder_id: UUID
    dose_logged: bool = True
    progress: dict = {}
    next_dose: Optional[str] = None
