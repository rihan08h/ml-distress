"""Medicine verification model."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Boolean, Date, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MedicineVerification(Base):
    __tablename__ = "medicine_verifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    code: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    code_type: Mapped[str | None] = mapped_column(String(20))  # barcode, qr_code
    is_authentic: Mapped[bool] = mapped_column(Boolean, nullable=False)
    medicine_name: Mapped[str | None] = mapped_column(String(255))
    manufacturer: Mapped[str | None] = mapped_column(String(255))
    batch_number: Mapped[str | None] = mapped_column(String(100))
    manufacturing_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date)
    verification_source: Mapped[str | None] = mapped_column(String(100))
    scan_image_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
