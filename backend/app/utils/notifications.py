import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
import os
from datetime import datetime

def send_gmail_credentials(to_email: str, company_name: str, login_url: str, password: str):
    """
    Sends an onboarding email with login credentials via Gmail SMTP.
    Requires GMAIL_SENDER and GMAIL_APP_PASSWORD in .env
    """
    sender_email = os.getenv("GMAIL_SENDER")
    app_password = os.getenv("GMAIL_APP_PASSWORD")
    
    if not sender_email or not app_password:
        print("Warning: GMAIL_SENDER or GMAIL_APP_PASSWORD not configured. Skipping email.")
        return False

    subject = f"Welcome to My Net ISP Cloud, {company_name}! Your Account is Ready"
    
    # HTML Email Body
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a;">Welcome to My Net ISP Cloud! </h2>
                <p>Hi {company_name} team,</p>
                <p>Your subscription payment was successful, and your ISP management platform is fully provisioned and ready to go.</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #334155;">Your Login Credentials</h3>
                    <p><strong>Login URL:</strong> <a href="{login_url}">{login_url}</a></p>
                    <p><strong>Email:</strong> {to_email}</p>
                    <p><strong>Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">{password}</code></p>
                </div>
                
                <p><em>Please log in and change your password immediately from the Settings menu.</em></p>
                
                <p>Best regards,<br>The My Net ISP Team</p>
            </div>
        </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"My Net ISP <{sender_email}>"
    msg["To"] = to_email

    msg.attach(MIMEText(html_body, "html"))

    try:
        # Connect to Gmail SMTP
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, app_password)
            server.sendmail(sender_email, to_email, msg.as_string())
        print(f" Welcome email sent to {to_email}")
        return True
    except Exception as e:
        print(f" Failed to send Gmail: {e}")
        return False


def send_whatsapp_credentials(phone_number: str, company_name: str, login_url: str, email: str, password: str):
    """
    Sends credentials via WhatsApp using Twilio (Standard) or a similar API.
    Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER in .env
    """
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_whatsapp = os.getenv("TWILIO_WHATSAPP_NUMBER") # e.g., 'whatsapp:+14155238886'
    
    if not account_sid or not auth_token or not from_whatsapp:
        print("Warning: Twilio WhatsApp credentials not configured. Skipping WhatsApp.")
        return False
        
    # Format phone number for WhatsApp
    formatted_phone = phone_number.replace("+", "").replace(" ", "")
    if formatted_phone.startswith("0"):
        formatted_phone = "254" + formatted_phone[1:]
    to_whatsapp = f"whatsapp:+{formatted_phone}"

    message_body = (
        f" *Welcome to My Net ISP Cloud, {company_name}!*\n\n"
        f"Your subscription payment was successful. Your platform is ready to use.\n\n"
        f" *Your Login Details:*\n"
        f" URL: {login_url}\n"
        f" Email: {email}\n"
        f" Password: {password}\n\n"
        f"Please log in and change your password immediately."
    )

    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    
    try:
        response = requests.post(
            url,
            auth=(account_sid, auth_token),
            data={
                "From": from_whatsapp,
                "To": to_whatsapp,
                "Body": message_body
            }
        )
        response.raise_for_status()
        print(f" WhatsApp message sent to {phone_number}")
        return True
    except Exception as e:
        print(f" Failed to send WhatsApp: {e}")
        return False
