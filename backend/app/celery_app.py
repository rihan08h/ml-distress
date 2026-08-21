"""Celery application configuration for background tasks."""

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "smartmedicine",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_routes={
        "app.tasks.reminders.*": {"queue": "reminders"},
        "app.tasks.notifications.*": {"queue": "notifications"},
    },
    beat_schedule={
        "check-due-reminders": {
            "task": "app.tasks.reminders.check_due_reminders",
            "schedule": 60.0,  # every 60 seconds
        },
        "cleanup-expired-reservations": {
            "task": "app.tasks.cleanup.cleanup_expired_reservations",
            "schedule": 300.0,  # every 5 minutes
        },
    },
)
