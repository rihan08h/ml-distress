"""Disease prediction model."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, Integer, Numeric, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("symptom_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    disease_name: Mapped[str] = mapped_column(String(255), nullable=False)
    icd_code: Mapped[str | None] = mapped_column(String(20))
    confidence: Mapped[float | None] = mapped_column(Numeric(4, 3))
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    specialist_type: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    # Relationships
    session: Mapped["SymptomSession"] = relationship(back_populates="predictions")


from app.models.symptom_session import SymptomSession  # noqa: E402, F401
