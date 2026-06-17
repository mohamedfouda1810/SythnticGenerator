"""
Email service for SynthGen.

Sends verification emails via SMTP when configured.
Falls back to console logging when MAIL_SERVER is empty (development mode).
"""

from __future__ import annotations

import logging
import smtplib
import uuid
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from backend.config import settings

logger = logging.getLogger(__name__)


def _is_email_configured() -> bool:
    """Check if SMTP is configured."""
    return bool(
        settings.MAIL_SERVER and settings.MAIL_USERNAME and settings.MAIL_PASSWORD
    )


def send_verification_email(to_email: str, username: str, token: str) -> bool:
    """
    Send email verification link.
    Returns True if sent (or logged in dev mode).
    Uses plain, spam-safe email format compatible with Gmail delivery.
    """
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}&email={to_email}"
    date_str = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")

    # ── Plain text body (required for good spam score) ──────────────
    plain_text = f"""Hello {username},

Please verify your email address to activate your SynthGen account.

Click the link below (or copy-paste it into your browser):

{verify_url}

This link expires in 24 hours.

If you did not create a SynthGen account, please ignore this email.

— The SynthGen Team
"""

    # ── HTML body (clean, minimal, spam-safe) ───────────────────────
    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#f9f9fb;border:1px solid #e4e4e7;border-radius:8px;max-width:560px;">
          <tr>
            <td style="padding:36px 40px 28px;text-align:center;border-bottom:1px solid #e4e4e7;">
              <span style="font-size:22px;font-weight:700;color:#1e1e2e;letter-spacing:-0.5px;">
                SynthGen
              </span>
              <span style="display:block;font-size:12px;color:#71717a;margin-top:4px;letter-spacing:0.05em;text-transform:uppercase;">
                AI Engine
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#18181b;">
                Verify your email address
              </h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#52525b;">
                Hello <strong style="color:#18181b;">{username}</strong>,
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#52525b;">
                Click the button below to verify your email address and activate your
                SynthGen account. This link expires in <strong>24 hours</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{verify_url}"
                       style="display:inline-block;padding:14px 36px;background:#4f46e5;
                              color:#ffffff;text-decoration:none;border-radius:6px;
                              font-size:15px;font-weight:600;letter-spacing:0.01em;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:#6366f1;word-break:break-all;">
                {verify_url}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                If you did not create a SynthGen account, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    subject = "Verify your SynthGen account"

    if not _is_email_configured():
        # Dev mode: log to console
        logger.info("=" * 60)
        logger.info("EMAIL VERIFICATION (dev mode - not sent)")
        logger.info("   To:    %s", to_email)
        logger.info("   Token: %s", token)
        logger.info("   Link:  %s", verify_url)
        logger.info("=" * 60)
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"SynthGen <{settings.MAIL_FROM}>"
        msg["To"] = to_email
        msg["Date"] = date_str
        msg["Message-ID"] = f"<{uuid.uuid4()}@synthgen.app>"
        msg["Reply-To"] = settings.MAIL_FROM

        # Plain text first, HTML second (RFC 2046: last part preferred by clients)
        msg.attach(MIMEText(plain_text, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as server:
            server.ehlo()
            if settings.MAIL_USE_TLS:
                server.starttls()
                server.ehlo()
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.sendmail(settings.MAIL_FROM, [to_email], msg.as_string())

        logger.info("Verification email sent to %s", to_email)
        return True

    except smtplib.SMTPAuthenticationError as exc:
        logger.error(
            "SMTP authentication failed for %s — check MAIL_USERNAME/MAIL_PASSWORD: %s",
            settings.MAIL_USERNAME, exc,
        )
        return False
    except smtplib.SMTPException as exc:
        logger.error("SMTP error sending to %s: %s", to_email, exc)
        return False
    except Exception as exc:
        logger.error("Unexpected error sending verification email to %s: %s", to_email, exc)
        return False
