"""Symptom analysis API routes (Premium)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.core.security import get_current_active_user
from app.core.permissions import RequireTier
from app.models.user import User
from app.services.symptom_service import SymptomService
from app.schemas.symptom import (
    SymptomAnalyzeRequest, SymptomAnalyzeResponse,
)

router = APIRouter(prefix="/symptoms", tags=["Symptoms"])


@router.post(
    "/analyze",
    response_model=SymptomAnalyzeResponse,
    dependencies=[Depends(RequireTier("premium"))],
)
async def analyze_symptoms(
    req: SymptomAnalyzeRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = SymptomService(db)
    return await svc.analyze(current_user.id, req, user_tier="premium")


@router.get("/history")
async def symptom_history(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = SymptomService(db)
    return await svc.get_symptom_history(current_user.id, limit=limit)
