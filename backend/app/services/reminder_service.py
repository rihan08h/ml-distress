"""Reminder management service."""

import uuid
from datetime import datetime, date, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import FREE_REMINDER_LIMIT
from app.core.exceptions import NotFoundError, ValidationError
from app.models.reminder import Reminder, ReminderDose
from app.schemas.reminder import (
    ReminderCreateRequest, ReminderResponse,
    ReminderUpdateRequest, DoseTakenResponse,
)


class ReminderService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: uuid.UUID,
        req: ReminderCreateRequest,
        user_tier: str = "free",
    ) -> ReminderResponse:
        # Check free tier limit
        if user_tier == "free":
            count_result = await self.db.execute(
                select(func.count())
                .select_from(Reminder)
                .where(Reminder.user_id == user_id, Reminder.is_active == True)
            )
            count = count_result.scalar() or 0
            if count >= FREE_REMINDER_LIMIT:
                raise ValidationError(
                    f"Free tier allows only {FREE_REMINDER_LIMIT} active reminders. Upgrade to Premium for unlimited."
                )

        reminder = Reminder(
            user_id=user_id,
            medicine_id=req.medicine_id,
            medicine_name=req.medicine_name,
            dosage=req.dosage,
            frequency=req.frequency,
            times=req.times,
            instructions=req.instructions,
            start_date=req.start_date,
            end_date=req.end_date,
            notification_channels=req.notification_channels,
        )
        self.db.add(reminder)
        await self.db.flush()

        return ReminderResponse(
            id=reminder.id,
            medicine_name=reminder.medicine_name,
            dosage=reminder.dosage,
            frequency=reminder.frequency,
            times=reminder.times,
        )

    async def list_reminders(self, user_id: uuid.UUID) -> list[ReminderResponse]:
        result = await self.db.execute(
            select(Reminder)
            .where(Reminder.user_id == user_id, Reminder.is_active == True)
            .order_by(Reminder.created_at.desc())
        )
        reminders = result.scalars().all()
        return [
            ReminderResponse(
                id=r.id,
                medicine_name=r.medicine_name,
                dosage=r.dosage,
                frequency=r.frequency,
                times=r.times if isinstance(r.times, list) else [],
            )
            for r in reminders
        ]

    async def update(self, user_id: uuid.UUID, reminder_id: uuid.UUID, req: ReminderUpdateRequest) -> ReminderResponse:
        result = await self.db.execute(
            select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == user_id)
        )
        reminder = result.scalar_one_or_none()
        if not reminder:
            raise NotFoundError("Reminder")

        if req.medicine_name is not None:
            reminder.medicine_name = req.medicine_name
        if req.dosage is not None:
            reminder.dosage = req.dosage
        if req.frequency is not None:
            reminder.frequency = req.frequency
        if req.times is not None:
            reminder.times = req.times
        if req.end_date is not None:
            reminder.end_date = req.end_date
        if req.instructions is not None:
            reminder.instructions = req.instructions
        if req.is_active is not None:
            reminder.is_active = req.is_active

        await self.db.flush()

        return ReminderResponse(
            id=reminder.id,
            medicine_name=reminder.medicine_name,
            dosage=reminder.dosage,
            frequency=reminder.frequency,
            times=reminder.times if isinstance(reminder.times, list) else [],
        )

    async def delete(self, user_id: uuid.UUID, reminder_id: uuid.UUID) -> dict:
        result = await self.db.execute(
            select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == user_id)
        )
        reminder = result.scalar_one_or_none()
        if not reminder:
            raise NotFoundError("Reminder")

        reminder.is_active = False
        await self.db.flush()
        return {"message": "Reminder deleted"}

    async def mark_taken(self, user_id: uuid.UUID, reminder_id: uuid.UUID) -> DoseTakenResponse:
        result = await self.db.execute(
            select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == user_id)
        )
        reminder = result.scalar_one_or_none()
        if not reminder:
            raise NotFoundError("Reminder")

        dose = ReminderDose(
            reminder_id=reminder_id,
            scheduled_at=datetime.now(timezone.utc),
            taken_at=datetime.now(timezone.utc),
            status="taken",
        )
        self.db.add(dose)
        await self.db.flush()

        # Calculate progress
        total_result = await self.db.execute(
            select(func.count()).select_from(ReminderDose).where(ReminderDose.reminder_id == reminder_id)
        )
        total = total_result.scalar() or 0
        taken_result = await self.db.execute(
            select(func.count()).select_from(ReminderDose).where(
                ReminderDose.reminder_id == reminder_id, ReminderDose.status == "taken"
            )
        )
        taken = taken_result.scalar() or 0

        return DoseTakenResponse(
            reminder_id=reminder_id,
            progress={"completed": taken, "total": total, "adherence_percent": round(taken / max(total, 1) * 100)},
        )
