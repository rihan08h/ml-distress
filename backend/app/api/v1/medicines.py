"""Medicine search & detail API routes."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.services.medicine_service import MedicineService
from app.schemas.medicine import (
    MedicineSearchResponse, MedicineDetailResponse,
    GenericAlternativesResponse,
)

router = APIRouter(prefix="/medicines", tags=["Medicines"])


@router.get("/search", response_model=MedicineSearchResponse)
async def search_medicines(
    q: str = Query(..., min_length=2, description="Search query"),
    type: str = Query("all", description="Filter: all, generic, brand"),
    dosage_form: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    svc = MedicineService(db)
    return await svc.search(q, type_filter=type, dosage_form=dosage_form, page=page, limit=limit)


@router.get("/{medicine_id}", response_model=MedicineDetailResponse)
async def get_medicine(medicine_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    svc = MedicineService(db)
    return await svc.get_detail(medicine_id)


@router.get("/{medicine_id}/generics", response_model=GenericAlternativesResponse)
async def get_generics(medicine_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    svc = MedicineService(db)
    return await svc.get_generics(medicine_id)
