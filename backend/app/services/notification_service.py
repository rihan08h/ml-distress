"""Notification dispatch service (push, email, SMS)."""

import structlog

logger = structlog.get_logger()


class NotificationService:
    """
    Notification dispatcher for push, email, and SMS.
    In production, this would integrate with Firebase FCM, SendGrid, and Twilio.
    """

    async def send_push(self, user_id: str, title: str, body: str, data: dict = None):
        """Send push notification via Firebase FCM."""
        logger.info("push_notification", user_id=user_id, title=title)
        # TODO: Firebase FCM integration
        return True

    async def send_email(self, email: str, subject: str, html_body: str):
        """Send email via SendGrid."""
        logger.info("email_notification", email=email, subject=subject)
        # TODO: SendGrid integration
        return True

    async def send_sms(self, phone: str, message: str):
        """Send SMS via Twilio (emergency only)."""
        logger.info("sms_notification", phone=phone)
        # TODO: Twilio integration
        return True

    async def send_reminder(self, user_id: str, medicine_name: str, dosage: str, channels: list[str]):
        """Send reminder notification through configured channels."""
        title = "Medicine Reminder"
        body = f"Time to take {medicine_name} ({dosage})"

        for channel in channels:
            if channel == "push":
                await self.send_push(user_id, title, body)
            elif channel == "email":
                pass  # Would need email from user profile
            elif channel == "sms":
                pass  # Would need phone from user profile
