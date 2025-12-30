"""Background scheduler for automated tasks like session reminders."""

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.db.session import SessionLocal
from app.services.session_service import send_session_reminders

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = BackgroundScheduler()


def check_and_send_reminders() -> None:
    """
    Job that runs every minute to check for sessions needing reminders.
    Sends email reminders for sessions starting in 15 minutes.
    """
    db = SessionLocal()
    try:
        reminders_count = send_session_reminders(db)
        if reminders_count > 0:
            logger.info(f"Sent {reminders_count} session reminder(s)")
    except Exception as exc:
        logger.error(f"Error in reminder scheduler: {exc}")
    finally:
        db.close()


def start_scheduler() -> None:
    """Initialize and start the background scheduler."""
    # Add the reminder check job to run every minute
    scheduler.add_job(
        check_and_send_reminders,
        trigger=IntervalTrigger(minutes=1),
        id="session_reminders",
        name="Check and send session reminders",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started: Session reminder job active (runs every 1 minute)")


def shutdown_scheduler() -> None:
    """Gracefully shutdown the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shut down")
