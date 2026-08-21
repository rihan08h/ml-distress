"""First aid knowledge base model."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Text, Date, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FirstAidKB(Base):
    __tablename__ = "first_aid_kb"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    condition_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    icd_code: Mapped[str | None] = mapped_column(String(20))
    immediate_actions: Mapped[dict] = mapped_column(JSONB, nullable=False)
    things_to_avoid: Mapped[dict] = mapped_column(JSONB, nullable=False)
    emergency_signs: Mapped[dict] = mapped_column(JSONB, nullable=False)
    source: Mapped[str | None] = mapped_column(Text)
    verified_by: Mapped[str | None] = mapped_column(String(255))
    last_reviewed: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())
