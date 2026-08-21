"""Reminder-related Celery tasks."""

import asyncio
from datetime import datetime, timezone, timedelta

from app.celery_app import celery_app
from app.db.session import async_session_factory


@celery_app.task(name="app.tasks.reminders.check_due_reminders")
def check_due_reminders():
    """Check for reminders that are due and send notifications."""
    asyncio.run(_check_due_reminders())


async def _check_due_reminders():
    from sqlalchemy import select
    from app.models.reminder import Reminder, ReminderDose

    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)
        window = now + timedelta(minutes=5)

        result = await db.execute(
            select(ReminderDose)
            .join(Reminder)
            .where(
                ReminderDose.status == "pending",
                ReminderDose.scheduled_at <= window,
                ReminderDose.scheduled_at >= now - timedelta(minutes=30),
                Reminder.is_active == True,
            )
        )
        due_doses = result.scalars().all()

        for dose in due_doses:
            # In production: send push notification, SMS, or email
            dose.status = "notified"

        if due_doses:
            await db.commit()

    return f"Processed {len(due_doses)} due reminders"


@celery_app.task(name="app.tasks.reminders.send_reminder_notification")
def send_reminder_notification(reminder_id: str, dose_id: str):
    """Send a single reminder notification (push, SMS, or email)."""
    # Stub — integrate with Firebase / Twilio / SendGrid
    return {"reminder_id": reminder_id, "dose_id": dose_id, "sent": True}
