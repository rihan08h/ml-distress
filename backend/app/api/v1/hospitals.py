"""Hospital finder API routes (Premium)."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.core.security import get_current_active_user
from app.core.permissions import RequireTier
from app.models.user import User
from app.services.hospital_service import HospitalService
from app.schemas.hospital import NearbyHospitalsResponse

router = APIRouter(prefix="/hospitals", tags=["Hospitals"])


@router.get(
    "/nearby",
    response_model=NearbyHospitalsResponse,
    dependencies=[Depends(RequireTier("premium"))],
)
async def nearby_hospitals(
    lat: float = Query(...),
    lng: float = Query(...),
    condition: Optional[str] = Query(None),
    emergency: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = HospitalService(db)
    return await svc.find_nearby(lat, lng, condition=condition, emergency=emergency)
