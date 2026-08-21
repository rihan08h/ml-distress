"""Analytics / demand prediction API routes (B2B)."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.core.security import get_current_active_user
from app.core.permissions import RequireTier
from app.models.user import User
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import DemandAnalyticsResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get(
    "/demand/{pharmacy_id}",
    response_model=DemandAnalyticsResponse,
    dependencies=[Depends(RequireTier("pharmacy"))],
)
async def get_demand_analytics(
    pharmacy_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = AnalyticsService(db)
    return await svc.get_demand_predictions(pharmacy_id)
