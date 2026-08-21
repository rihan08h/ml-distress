"""Prescription OCR API routes."""

from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.prescription_service import PrescriptionService
from app.schemas.prescription import PrescriptionScanResponse

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])


@router.post("/scan", response_model=PrescriptionScanResponse)
async def scan_prescription(
    image: UploadFile = File(...),
    language: str = Form("en"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    # In production, upload to S3/GCS and get URL
    image_url = f"/uploads/prescriptions/{image.filename}"

    svc = PrescriptionService(db)
    return await svc.scan_prescription(current_user.id, image_url, language)


@router.get("/history")
async def prescription_history(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PrescriptionService(db)
    return await svc.get_prescriptions(current_user.id, limit=limit)
