"""Pharmacy B2B Portal API routes."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.pharmacy_service import PharmacyService

router = APIRouter(prefix="/portal", tags=["Pharmacy Portal"])


class InventoryUpdateBody(BaseModel):
    quantity: Optional[int] = None
    price: Optional[float] = None


class TransferCreateBody(BaseModel):
    to_pharmacy_id: uuid.UUID
    medicine_id: uuid.UUID
    quantity: int
    reason: str = "restock"


@router.get("/{pharmacy_id}/inventory")
async def portal_inventory(
    pharmacy_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PharmacyService(db)
    return await svc.get_portal_inventory(pharmacy_id)


@router.patch("/{pharmacy_id}/inventory/{medicine_id}")
async def update_inventory(
    pharmacy_id: uuid.UUID,
    medicine_id: uuid.UUID,
    body: InventoryUpdateBody,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PharmacyService(db)
    return await svc.update_inventory_item(pharmacy_id, medicine_id, body.quantity, body.price)


@router.post("/{pharmacy_id}/transfers")
async def create_transfer(
    pharmacy_id: uuid.UUID,
    body: TransferCreateBody,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PharmacyService(db)
    return await svc.create_transfer(
        from_pharmacy_id=pharmacy_id,
        to_pharmacy_id=body.to_pharmacy_id,
        medicine_id=body.medicine_id,
        quantity=body.quantity,
        reason=body.reason,
    )


@router.get("/{pharmacy_id}/transfers")
async def list_transfers(
    pharmacy_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PharmacyService(db)
    return await svc.get_transfers(pharmacy_id)


@router.get("/{pharmacy_id}/analytics")
async def portal_analytics(
    pharmacy_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PharmacyService(db)
    return await svc.get_portal_analytics(pharmacy_id)
