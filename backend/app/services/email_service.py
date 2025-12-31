"""Email notifications via SMTP."""

from __future__ import annotations

import logging
import smtplib
import threading
from email.message import EmailMessage

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _parse_sender(sender: str | None) -> tuple[str | None, str | None]:
    if not sender:
        return None, None
    if "<" in sender and ">" in sender:
        name, email = sender.split("<", 1)
        return name.strip() or None, email.replace(">", "").strip() or None
    return None, sender.strip()


def _send_email_brevo(subject: str, body: str, recipients: list[str]) -> None:
    settings = get_settings()
    if not settings.brevo_api_key:
        return
    if not recipients:
        return

    sender_name, sender_email = _parse_sender(settings.smtp_from)
    if not sender_email:
        return

    payload = {
        "sender": {"email": sender_email, "name": sender_name or sender_email},
        "to": [{"email": email} for email in recipients],
        "subject": subject,
        "textContent": body,
    }
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": settings.brevo_api_key,
    }
    try:
        response = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers=headers,
            timeout=settings.brevo_timeout,
        )
        response.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Email notification failed: %s", exc)


def _send_email_sync(subject: str, body: str, recipients: list[str]) -> None:
    settings = get_settings()
    if settings.brevo_api_key:
        _send_email_brevo(subject, body, recipients)
        return
    if not settings.smtp_host or not settings.smtp_from:
        return
    if not recipients:
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = ", ".join(recipients)
    msg.set_content(body)

    try:
        if settings.smtp_ssl:
            with smtplib.SMTP_SSL(
                settings.smtp_host,
                settings.smtp_port,
                timeout=settings.smtp_timeout,
            ) as server:
                if settings.smtp_user and settings.smtp_password:
                    server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(
                settings.smtp_host,
                settings.smtp_port,
                timeout=settings.smtp_timeout,
            ) as server:
                server.ehlo()
                if settings.smtp_tls:
                    server.starttls()
                    server.ehlo()
                if settings.smtp_user and settings.smtp_password:
                    server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Email notification failed: %s", exc)


def send_email(subject: str, body: str, recipients: list[str], *, background: bool = True) -> None:
    """Send email notifications without blocking the request."""
    if background:
        thread = threading.Thread(
            target=_send_email_sync,
            args=(subject, body, recipients),
            daemon=True,
        )
        thread.start()
        return
    _send_email_sync(subject, body, recipients)
