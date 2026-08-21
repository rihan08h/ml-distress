"""Subscription model."""

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, Numeric, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tier: Mapped[str] = mapped_column(String(20), nullable=False, default="free")  # free, premium, pharmacy
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")  # active, cancelled, expired, trialing
    payment_provider: Mapped[str | None] = mapped_column(String(20))
    payment_id: Mapped[str | None] = mapped_column(String(255))
    plan_duration: Mapped[str] = mapped_column(String(20), default="monthly")  # monthly, yearly
    amount: Mapped[float | None] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    started_at: Mapped[datetime] = mapped_column(default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column()
    cancelled_at: Mapped[datetime | None] = mapped_column()
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    # Relationship
    user: Mapped["User"] = relationship(back_populates="subscriptions")


from app.models.user import User  # noqa: E402, F401
