"""Tier-based access control (Free / Premium / Pharmacy)."""

from enum import Enum

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.dependencies import get_db


class SubscriptionTier(str, Enum):
    FREE = "free"
    PREMIUM = "premium"
    PHARMACY = "pharmacy"


TIER_HIERARCHY = {"free": 0, "premium": 1, "pharmacy": 2}

PREMIUM_FEATURES = {
    "symptom_checker", "voice_input", "hospital_finder",
    "first_aid", "health_reports", "unlimited_reminders",
}


async def _get_user_tier(user, db: AsyncSession) -> str:
    """Get the active subscription tier for a user."""
    from app.models.subscription import Subscription
    from datetime import datetime, timezone

    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.user_id == user.id,
            Subscription.status == "active",
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()
    if sub and (sub.expires_at is None or sub.expires_at > datetime.now(timezone.utc)):
        return sub.tier
    return "free"


class RequireTier:
    """FastAPI dependency to gate endpoints by subscription tier."""

    def __init__(self, minimum_tier: str | SubscriptionTier):
        if isinstance(minimum_tier, str):
            self.minimum_tier = SubscriptionTier(minimum_tier)
        else:
            self.minimum_tier = minimum_tier

    async def __call__(
        self,
        user=Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        user_tier = await _get_user_tier(user, db)

        if TIER_HIERARCHY.get(user_tier, 0) < TIER_HIERARCHY.get(self.minimum_tier.value, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "UPGRADE_REQUIRED",
                    "message": f"This feature requires {self.minimum_tier.value} subscription.",
                    "current_tier": user_tier,
                    "upgrade_url": "/subscription/upgrade",
                },
            )
        # Attach tier to user for downstream use
        user.current_tier = user_tier
        return user
