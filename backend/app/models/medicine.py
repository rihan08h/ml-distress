"""Medicine and GenericMapping models."""

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, Text, Numeric, ForeignKey, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Medicine(Base):
    __tablename__ = "medicines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    generic_name: Mapped[str | None] = mapped_column(String(255), index=True)
    brand: Mapped[str | None] = mapped_column(String(255), index=True)
    manufacturer: Mapped[str | None] = mapped_column(String(255))
    composition: Mapped[dict] = mapped_column(JSONB, nullable=False)
    dosage_form: Mapped[str | None] = mapped_column(String(50))
    dosage_instructions: Mapped[dict | None] = mapped_column(JSONB)
    side_effects: Mapped[dict] = mapped_column(JSONB, default=dict)
    contraindications: Mapped[dict] = mapped_column(JSONB, default=list)
    storage_info: Mapped[str | None] = mapped_column(Text)
    price_mrp: Mapped[float | None] = mapped_column(Numeric(10, 2))
    pack_size: Mapped[str | None] = mapped_column(String(50))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    prescription_required: Mapped[bool] = mapped_column(Boolean, default=False)
    category: Mapped[str | None] = mapped_column(String(100), index=True)
    atc_code: Mapped[str | None] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    # Relationships
    generic_alternatives: Mapped[list["GenericMapping"]] = relationship(
        foreign_keys="GenericMapping.brand_medicine_id",
        back_populates="brand_medicine",
    )


class GenericMapping(Base):
    __tablename__ = "generic_mappings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_medicine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id", ondelete="CASCADE"), index=True)
    generic_medicine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id", ondelete="CASCADE"), index=True)
    composition_match_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=100.00)
    price_savings_percent: Mapped[float | None] = mapped_column(Numeric(5, 2))

    __table_args__ = (UniqueConstraint("brand_medicine_id", "generic_medicine_id"),)

    # Relationships
    brand_medicine: Mapped["Medicine"] = relationship(foreign_keys=[brand_medicine_id])
    generic_medicine: Mapped["Medicine"] = relationship(foreign_keys=[generic_medicine_id])
