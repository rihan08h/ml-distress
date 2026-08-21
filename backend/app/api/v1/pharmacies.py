"""Pharmacy locator & reservation API routes."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.pharmacy_service import PharmacyService
from app.schemas.pharmacy import (
    NearbyPharmaciesResponse,
    ReservationRequest, ReservationResponse,
)

router = APIRouter(prefix="/pharmacies", tags=["Pharmacies"])


@router.get("/nearby", response_model=NearbyPharmaciesResponse)
async def nearby_pharmacies(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: float = Query(5.0, description="Radius in km"),
    medicine_id: Optional[uuid.UUID] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    svc = PharmacyService(db)
    return await svc.find_nearby(lat, lng, radius_km=radius, medicine_id=medicine_id, limit=limit)


@router.post("/{pharmacy_id}/reserve", response_model=ReservationResponse)
async def reserve_medicine(
    pharmacy_id: uuid.UUID,
    req: ReservationRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PharmacyService(db)
    return await svc.reserve_medicine(pharmacy_id, current_user.id, req)
