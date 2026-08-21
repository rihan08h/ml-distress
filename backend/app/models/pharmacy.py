"""Pharmacy, Inventory, Network, and Transfer models."""

import uuid
from datetime import datetime, date

from sqlalchemy import (
    String, Boolean, Text, Integer, Numeric, Date,
    ForeignKey, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Pharmacy(Base):
    __tablename__ = "pharmacies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    license_number: Mapped[str | None] = mapped_column(String(100), unique=True)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str | None] = mapped_column(String(100), index=True)
    state: Mapped[str | None] = mapped_column(String(100))
    pincode: Mapped[str | None] = mapped_column(String(10))
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    website: Mapped[str | None] = mapped_column(Text)
    latitude: Mapped[float] = mapped_column(Numeric(10, 8), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(11, 8), nullable=False)
    rating: Mapped[float | None] = mapped_column(Numeric(2, 1))
    total_reviews: Mapped[int] = mapped_column(Integer, default=0)
    is_open_24hrs: Mapped[bool] = mapped_column(Boolean, default=False)
    operating_hours: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    google_place_id: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    # Relationships
    inventory: Mapped[list["PharmacyInventory"]] = relationship(back_populates="pharmacy", cascade="all, delete-orphan")
    owner: Mapped["User"] = relationship(foreign_keys=[owner_user_id])


class PharmacyInventory(Base):
    __tablename__ = "pharmacy_inventory"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pharmacy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pharmacies.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    price: Mapped[float | None] = mapped_column(Numeric(10, 2))
    expiry_date: Mapped[date | None] = mapped_column(Date)
    batch_number: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="in_stock")  # in_stock, low_stock, out_of_stock
    last_updated: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("pharmacy_id", "medicine_id", "batch_number"),)

    # Relationships
    pharmacy: Mapped["Pharmacy"] = relationship(back_populates="inventory")
    medicine: Mapped["Medicine"] = relationship()


class PharmacyNetwork(Base):
    __tablename__ = "pharmacy_network"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pharmacy_a_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pharmacies.id", ondelete="CASCADE"))
    pharmacy_b_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pharmacies.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, connected, rejected
    connected_at: Mapped[datetime | None] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    __table_args__ = (UniqueConstraint("pharmacy_a_id", "pharmacy_b_id"),)


class MedicineTransfer(Base):
    __tablename__ = "medicine_transfers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_pharmacy_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("pharmacies.id", ondelete="SET NULL"))
    to_pharmacy_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("pharmacies.id", ondelete="SET NULL"))
    medicine_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id", ondelete="SET NULL"))
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    reason: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column()


from app.models.user import User  # noqa: E402, F401
from app.models.medicine import Medicine  # noqa: E402, F401
