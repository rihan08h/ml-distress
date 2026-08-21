"""Emergency medicine finder API routes."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.services.emergency_service import EmergencyService

router = APIRouter(prefix="/emergency", tags=["Emergency"])


@router.get("/medicine/{medicine_id}")
async def find_emergency_medicine(
    medicine_id: uuid.UUID,
    lat: float = Query(...),
    lng: float = Query(...),
    db: AsyncSession = Depends(get_db),
):
    svc = EmergencyService(db)
    return await svc.find_emergency_medicine(medicine_id, lat, lng)
