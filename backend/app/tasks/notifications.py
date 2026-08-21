"""Notification Celery tasks."""

from app.celery_app import celery_app


@celery_app.task(name="app.tasks.notifications.send_push_notification")
def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
    """Send a push notification via Firebase Cloud Messaging."""
    # Stub — integrate with Firebase Admin SDK
    return {"user_id": user_id, "title": title, "sent": True}


@celery_app.task(name="app.tasks.notifications.send_sms")
def send_sms(phone: str, message: str):
    """Send an SMS via Twilio."""
    # Stub — integrate with Twilio
    return {"phone": phone, "sent": True}


@celery_app.task(name="app.tasks.notifications.send_email")
def send_email(to_email: str, subject: str, body: str):
    """Send an email via SendGrid."""
    # Stub — integrate with SendGrid
    return {"to_email": to_email, "subject": subject, "sent": True}
