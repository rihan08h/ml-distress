"""Cleanup Celery tasks."""

import asyncio
from datetime import datetime, timezone

from app.celery_app import celery_app
from app.db.session import async_session_factory


@celery_app.task(name="app.tasks.cleanup.cleanup_expired_reservations")
def cleanup_expired_reservations():
    """Cancel reservations that have passed their pickup_by time."""
    asyncio.run(_cleanup_expired_reservations())


async def _cleanup_expired_reservations():
    from sqlalchemy import select, update
    from app.models.reservation import Reservation

    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)

        result = await db.execute(
            update(Reservation)
            .where(
                Reservation.status == "pending",
                Reservation.pickup_by < now,
            )
            .values(status="expired")
            .returning(Reservation.id)
        )
        expired_ids = result.scalars().all()
        await db.commit()

    return f"Expired {len(expired_ids)} reservations"
