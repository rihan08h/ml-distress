"""Symptom session model (Premium)."""

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, Text, Integer, Numeric, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SymptomSession(Base):
    __tablename__ = "symptom_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    request_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    input_text: Mapped[str] = mapped_column(Text, nullable=False)
    input_type: Mapped[str] = mapped_column(String(10), default="text")
    voice_file_url: Mapped[str | None] = mapped_column(Text)
    transcription: Mapped[str | None] = mapped_column(Text)
    transcription_confidence: Mapped[float | None] = mapped_column(Numeric(3, 2))
    parsed_symptoms: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    risk_level: Mapped[str | None] = mapped_column(String(20))
    risk_recommendation: Mapped[str | None] = mapped_column(Text)
    model_version: Mapped[str | None] = mapped_column(String(50))
    llm_used: Mapped[bool] = mapped_column(Boolean, default=False)
    processing_time_ms: Mapped[int | None] = mapped_column(Integer)
    user_age: Mapped[int | None] = mapped_column(Integer)
    user_gender: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    # Relationships
    user: Mapped["User"] = relationship(back_populates="symptom_sessions")
    predictions: Mapped[list["Prediction"]] = relationship(back_populates="session", cascade="all, delete-orphan")


from app.models.user import User  # noqa: E402, F401
from app.models.prediction import Prediction  # noqa: E402, F401
