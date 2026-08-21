"""Drug interaction model."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DrugInteraction(Base):
    __tablename__ = "drug_interactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medicine_a_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id", ondelete="CASCADE"), index=True)
    medicine_b_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id", ondelete="CASCADE"), index=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)  # minor, moderate, major, contraindicated
    description: Mapped[str] = mapped_column(Text, nullable=False)
    mechanism: Mapped[str | None] = mapped_column(Text)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str | None] = mapped_column(String(100))
    evidence_level: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    __table_args__ = (UniqueConstraint("medicine_a_id", "medicine_b_id"),)

    # Relationships
    medicine_a: Mapped["Medicine"] = relationship(foreign_keys=[medicine_a_id])
    medicine_b: Mapped["Medicine"] = relationship(foreign_keys=[medicine_b_id])


from app.models.medicine import Medicine  # noqa: E402, F401
