"""Subscription schemas."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UpgradeRequest(BaseModel):
    tier: str  # premium, pharmacy
    payment_method: str = "razorpay"
    payment_token: Optional[str] = None
    plan_duration: str = "monthly"


class SubscriptionInfo(BaseModel):
    tier: str
    status: str
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    auto_renew: bool = True


class UpgradeResponse(BaseModel):
    subscription: SubscriptionInfo
    unlocked_features: list[str] = []


class SubscriptionStatusResponse(BaseModel):
    tier: str
    status: str
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    auto_renew: bool = True
    plan_duration: Optional[str] = None
