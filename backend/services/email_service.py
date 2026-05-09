"""
Email service for SynthGen.

Sends verification emails via SMTP when configured.
Falls back to console logging when MAIL_SERVER is empty (development mode).
"""

from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from backend.config import settings

logger = logging.getLogger(__name__)


def _is_email_configured() -> bool:
    """Check if SMTP is configured."""
    return bool(settings.MAIL_SERVER and settings.MAIL_USERNAME and settings.MAIL_PASSWORD)


def send_verification_email(to_email: str, username: str, token: str) -> bool:
    """
    Send email verification link.
    Returns True if sent (or logged in dev mode).
    """
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

    html = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #111118; border-radius: 16px; border: 1px solid rgba(108,99,255,0.2);">
        <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #6C63FF, #00D4FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">✨ SynthGen</span>
        </div>
        <h2 style="color: #F0F0FF; margin: 0 0 16px;">Verify your email</h2>
        <p style="color: #8888AA; line-height: 1.6; margin: 0 0 24px;">
            Hello <strong style="color: #F0F0FF;">{username}</strong>,<br><br>
            Click the button below to verify your email address and activate your SynthGen account.
        </p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{verify_url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6C63FF, #8B83FF); color: #fff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
                Verify Email
            </a>
        </div>
        <p style="color: #555566; font-size: 13px; line-height: 1.5;">
            This link expires in 24 hours.<br>
            If you didn't create an account, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(108,99,255,0.15); margin: 24px 0;">
        <p style="color: #555566; font-size: 12px; text-align: center;">
            SynthGen — AI-Powered Synthetic Data Platform
        </p>
    </div>
    """

    subject = "Verify your SynthGen account"

    if not _is_email_configured():
        # Dev mode: log to console
        logger.info("=" * 60)
        logger.info("📧 EMAIL VERIFICATION (dev mode — not sent)")
        logger.info("   To:    %s", to_email)
        logger.info("   Token: %s", token)
        logger.info("   Link:  %s", verify_url)
        logger.info("=" * 60)
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.MAIL_FROM
        msg["To"] = to_email
        msg.attach(MIMEText(f"Verify your email: {verify_url}", "plain"))
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as server:
            if settings.MAIL_USE_TLS:
                server.starttls()
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.sendmail(settings.MAIL_FROM, to_email, msg.as_string())

        logger.info("Verification email sent to %s", to_email)
        return True

    except Exception as exc:
        logger.error("Failed to send verification email to %s: %s", to_email, exc)
        return False
