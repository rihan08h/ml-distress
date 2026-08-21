"""Hospital cache model."""

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, Text, Numeric, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HospitalCache(Base):
    __tablename__ = "hospitals_cache"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    google_place_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    type: Mapped[str] = mapped_column(String(50), default="hospital")
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(50))
    latitude: Mapped[float] = mapped_column(Numeric(10, 8), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(11, 8), nullable=False)
    rating: Mapped[float | None] = mapped_column(Numeric(2, 1))
    has_emergency: Mapped[bool] = mapped_column(Boolean, default=False)
    specialties: Mapped[dict] = mapped_column(JSONB, default=list)
    operating_hours: Mapped[dict] = mapped_column(JSONB, default=dict)
    cached_at: Mapped[datetime] = mapped_column(default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column()
