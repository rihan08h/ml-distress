"""User and MedicalProfile models."""

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, Text, Date, Numeric, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    role: Mapped[str] = mapped_column(String(20), default="patient")  # patient, pharmacy_owner, admin
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    # Relationships
    medical_profile: Mapped["MedicalProfile"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    reminders: Mapped[list["Reminder"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    prescriptions: Mapped[list["Prescription"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    symptom_sessions: Mapped[list["SymptomSession"]] = relationship(back_populates="user")


class MedicalProfile(Base):
    __tablename__ = "medical_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    date_of_birth: Mapped[datetime | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(20))
    blood_group: Mapped[str | None] = mapped_column(String(5))
    known_conditions: Mapped[dict] = mapped_column(JSONB, default=list)
    current_medications: Mapped[dict] = mapped_column(JSONB, default=list)
    allergies: Mapped[dict] = mapped_column(JSONB, default=list)
    location_lat: Mapped[float | None] = mapped_column(Numeric(10, 8))
    location_lng: Mapped[float | None] = mapped_column(Numeric(11, 8))
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    # Relationship
    user: Mapped["User"] = relationship(back_populates="medical_profile")


# Avoid circular imports — these are resolved via string refs
from app.models.subscription import Subscription  # noqa: E402, F401
from app.models.reminder import Reminder  # noqa: E402, F401
from app.models.prescription import Prescription  # noqa: E402, F401
from app.models.symptom_session import SymptomSession  # noqa: E402, F401
