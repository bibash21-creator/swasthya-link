"""Email service for sending OTP and notification emails using Resend."""
import resend
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Resend with API key
if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY


def send_otp_email(to_email: str, otp: str, user_name: str = "") -> bool:
    """
    Send OTP verification email to user.
    
    Args:
        to_email: Recipient email address
        otp: The 6-digit OTP code
        user_name: Optional user name for personalization
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured. Email not sent.")
        return False
    
    try:
        subject = "Your SwasthyaLink Verification Code"
        
        # HTML email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verification Code</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background-color: #f4f4f5;
                    margin: 0;
                    padding: 20px;
                }}
                .container {{
                    max-width: 480px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 12px;
                    padding: 40px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .logo {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .logo h1 {{
                    color: #059669;
                    font-size: 28px;
                    margin: 0;
                }}
                .content {{
                    text-align: center;
                }}
                .greeting {{
                    font-size: 18px;
                    color: #1f2937;
                    margin-bottom: 16px;
                }}
                .message {{
                    font-size: 14px;
                    color: #6b7280;
                    margin-bottom: 24px;
                    line-height: 1.6;
                }}
                .otp-code {{
                    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                    color: white;
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    padding: 20px 40px;
                    border-radius: 8px;
                    display: inline-block;
                    margin: 20px 0;
                }}
                .expiry {{
                    font-size: 13px;
                    color: #9ca3af;
                    margin-top: 20px;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    font-size: 12px;
                    color: #9ca3af;
                }}
                .security-notice {{
                    background-color: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 12px 16px;
                    margin-top: 20px;
                    font-size: 13px;
                    color: #92400e;
                    text-align: left;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">
                    <h1>SwasthyaLink</h1>
                </div>
                <div class="content">
                    <p class="greeting">Hello {user_name or 'there'},</p>
                    <p class="message">
                        Thank you for using SwasthyaLink. To complete your verification, 
                        please use the following one-time password (OTP):
                    </p>
                    <div class="otp-code">{otp}</div>
                    <p class="expiry">
                        This code will expire in {settings.OTP_EXPIRE_MINUTES} minutes.
                    </p>
                    <div class="security-notice">
                        <strong>Security Tip:</strong> Never share this code with anyone. 
                        SwasthyaLink will never ask for your OTP via phone or email.
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated message from SwasthyaLink.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version as fallback
        text_content = f"""
Hello {user_name or 'there'},

Your SwasthyaLink verification code is: {otp}

This code will expire in {settings.OTP_EXPIRE_MINUTES} minutes.

If you didn't request this code, please ignore this email.

---
SwasthyaLink - Nepal's Medical Link Platform
        """
        
        params = {
            "from": f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "text": text_content,
        }
        
        response = resend.Emails.send(params)
        logger.info(f"OTP email sent to {to_email}, message ID: {response.get('id')}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}")
        # Log more details for debugging
        logger.error(f"Resend API Key configured: {bool(settings.RESEND_API_KEY)}")
        logger.error(f"From email: {settings.FROM_EMAIL}")
        logger.error(f"To email: {to_email}")
        return False


def send_welcome_email(to_email: str, user_name: str, role: str) -> bool:
    """
    Send welcome email after successful verification.
    
    Args:
        to_email: Recipient email address
        user_name: User's name
        role: User role (patient, pharmacy, admin)
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    if not settings.RESEND_API_KEY:
        return False
    
    try:
        role_messages = {
            "patient": "You can now upload prescriptions, find nearby pharmacies, and order medicines online.",
            "pharmacy": "You can now manage your inventory, receive prescription orders, and grow your business.",
            "admin": "You have full access to manage the SwasthyaLink platform."
        }
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to SwasthyaLink</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background-color: #f4f4f5;
                    margin: 0;
                    padding: 20px;
                }}
                .container {{
                    max-width: 480px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 12px;
                    padding: 40px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .logo {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .logo h1 {{
                    color: #059669;
                    font-size: 28px;
                    margin: 0;
                }}
                .content {{
                    text-align: center;
                }}
                .welcome {{
                    font-size: 24px;
                    color: #1f2937;
                    margin-bottom: 16px;
                    font-weight: 600;
                }}
                .message {{
                    font-size: 14px;
                    color: #6b7280;
                    margin-bottom: 24px;
                    line-height: 1.6;
                }}
                .cta-button {{
                    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                    color: white;
                    text-decoration: none;
                    padding: 14px 32px;
                    border-radius: 8px;
                    display: inline-block;
                    font-weight: 600;
                    margin: 20px 0;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    font-size: 12px;
                    color: #9ca3af;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">
                    <h1>SwasthyaLink</h1>
                </div>
                <div class="content">
                    <p class="welcome">Welcome, {user_name}!</p>
                    <p class="message">
                        Your account has been successfully verified. {role_messages.get(role, '')}
                    </p>
                    <a href="https://swasthyalink-teal.vercel.app/dashboard" class="cta-button">
                        Go to Dashboard
                    </a>
                </div>
                <div class="footer">
                    <p>Thank you for joining SwasthyaLink.</p>
                    <p>Nepal's Medical Link Platform</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        params = {
            "from": f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>",
            "to": [to_email],
            "subject": "Welcome to SwasthyaLink!",
            "html": html_content,
        }
        
        response = resend.Emails.send(params)
        logger.info(f"Welcome email sent to {to_email}, message ID: {response.get('id')}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send welcome email to {to_email}: {e}")
        return False
