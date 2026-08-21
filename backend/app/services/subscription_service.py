"""Subscription management service."""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ValidationError, NotFoundError
from app.core.permissions import PREMIUM_FEATURES
from app.models.subscription import Subscription
from app.schemas.subscription import (
    UpgradeRequest, UpgradeResponse, SubscriptionInfo,
    SubscriptionStatusResponse,
)


class SubscriptionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_status(self, user_id: uuid.UUID) -> SubscriptionStatusResponse:
        result = await self.db.execute(
            select(Subscription)
            .where(Subscription.user_id == user_id, Subscription.status == "active")
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
        sub = result.scalar_one_or_none()
        if not sub:
            return SubscriptionStatusResponse(tier="free", status="active")

        return SubscriptionStatusResponse(
            tier=sub.tier,
            status=sub.status,
            started_at=sub.started_at,
            expires_at=sub.expires_at,
            auto_renew=sub.auto_renew,
            plan_duration=sub.plan_duration,
        )

    async def upgrade(self, user_id: uuid.UUID, req: UpgradeRequest) -> UpgradeResponse:
        if req.tier not in ("premium", "pharmacy"):
            raise ValidationError("Invalid tier. Choose 'premium' or 'pharmacy'.")

        # Calculate expiry
        duration_days = 365 if req.plan_duration == "yearly" else 30
        now = datetime.now(timezone.utc)

        # Deactivate existing subscription
        result = await self.db.execute(
            select(Subscription)
            .where(Subscription.user_id == user_id, Subscription.status == "active")
        )
        for old_sub in result.scalars():
            old_sub.status = "cancelled"
            old_sub.cancelled_at = now

        # Create new subscription
        amount = 99 if req.tier == "premium" else 499
        if req.plan_duration == "yearly":
            amount *= 10  # 2 months free

        new_sub = Subscription(
            user_id=user_id,
            tier=req.tier,
            status="active",
            payment_provider=req.payment_method,
            payment_id=req.payment_token,
            plan_duration=req.plan_duration,
            amount=amount,
            started_at=now,
            expires_at=now + timedelta(days=duration_days),
        )
        self.db.add(new_sub)
        await self.db.flush()

        features = list(PREMIUM_FEATURES) if req.tier in ("premium", "pharmacy") else []

        return UpgradeResponse(
            subscription=SubscriptionInfo(
                tier=new_sub.tier,
                status=new_sub.status,
                started_at=new_sub.started_at,
                expires_at=new_sub.expires_at,
                auto_renew=new_sub.auto_renew,
            ),
            unlocked_features=features,
        )

    async def cancel(self, user_id: uuid.UUID) -> dict:
        result = await self.db.execute(
            select(Subscription)
            .where(Subscription.user_id == user_id, Subscription.status == "active")
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
        sub = result.scalar_one_or_none()
        if not sub or sub.tier == "free":
            raise ValidationError("No active paid subscription to cancel.")

        sub.status = "cancelled"
        sub.cancelled_at = datetime.now(timezone.utc)
        sub.auto_renew = False
        await self.db.flush()

        return {"message": "Subscription cancelled. Access continues until expiry.", "expires_at": str(sub.expires_at)}
