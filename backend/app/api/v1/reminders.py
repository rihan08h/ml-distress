"""Reminder management API routes."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.reminder_service import ReminderService
from app.schemas.reminder import (
    ReminderCreateRequest, ReminderResponse,
    ReminderUpdateRequest, DoseTakenResponse,
)

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.post("", response_model=ReminderResponse, status_code=201)
async def create_reminder(
    req: ReminderCreateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = ReminderService(db)
    return await svc.create(current_user.id, req)


@router.get("", response_model=list[ReminderResponse])
async def list_reminders(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = ReminderService(db)
    return await svc.list_reminders(current_user.id)


@router.put("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: uuid.UUID,
    req: ReminderUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = ReminderService(db)
    return await svc.update(current_user.id, reminder_id, req)


@router.delete("/{reminder_id}")
async def delete_reminder(
    reminder_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = ReminderService(db)
    return await svc.delete(current_user.id, reminder_id)


@router.post("/{reminder_id}/taken", response_model=DoseTakenResponse)
async def mark_dose_taken(
    reminder_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = ReminderService(db)
    return await svc.mark_taken(current_user.id, reminder_id)
