"""Safety API routes — drug interactions, verification."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.interaction_service import InteractionService
from app.services.verification_service import VerificationService
from app.schemas.safety import (
    InteractionCheckRequest, InteractionCheckResponse,
    VerifyRequest, VerifyResponse,
)

router = APIRouter(prefix="/safety", tags=["Safety"])


@router.post("/interactions", response_model=InteractionCheckResponse)
async def check_interactions(
    req: InteractionCheckRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = InteractionService(db)
    return await svc.check_interactions(req)


@router.get("/interactions/{medicine_id}")
async def get_medicine_interactions(
    medicine_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    svc = InteractionService(db)
    results = await svc.get_medicine_interactions(medicine_id)
    return {"medicine_id": str(medicine_id), "interactions": results}


@router.post("/verify", response_model=VerifyResponse)
async def verify_medicine(
    req: VerifyRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = VerificationService(db)
    return await svc.verify_medicine(current_user.id, req)


@router.get("/verify/history")
async def verification_history(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = VerificationService(db)
    return await svc.get_verification_history(current_user.id, limit=limit)
