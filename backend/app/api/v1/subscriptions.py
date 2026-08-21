"""Subscription management API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.subscription_service import SubscriptionService
from app.schemas.subscription import (
    UpgradeRequest, UpgradeResponse,
    SubscriptionStatusResponse,
)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = SubscriptionService(db)
    return await svc.get_status(current_user.id)


@router.post("/upgrade", response_model=UpgradeResponse)
async def upgrade_subscription(
    req: UpgradeRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = SubscriptionService(db)
    return await svc.upgrade(current_user.id, req)


@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = SubscriptionService(db)
    return await svc.cancel(current_user.id)
