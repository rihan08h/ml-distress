"""Reminder and DoseLog models."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Boolean, Text, Integer, Date, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id", ondelete="SET NULL"))
    medicine_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dosage: Mapped[str | None] = mapped_column(String(100))
    frequency: Mapped[str | None] = mapped_column(String(30))
    times: Mapped[dict] = mapped_column(JSONB, nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notification_channels: Mapped[dict] = mapped_column(JSONB, default=lambda: ["push"])
    prescription_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("prescriptions.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped["User"] = relationship(back_populates="reminders")
    doses: Mapped[list["ReminderDose"]] = relationship(back_populates="reminder", cascade="all, delete-orphan")


class ReminderDose(Base):
    __tablename__ = "reminder_doses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reminder_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("reminders.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_at: Mapped[datetime] = mapped_column(nullable=False, index=True)
    taken_at: Mapped[datetime | None] = mapped_column()
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, taken, missed, skipped
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    # Relationships
    reminder: Mapped["Reminder"] = relationship(back_populates="doses")


from app.models.user import User  # noqa: E402, F401
