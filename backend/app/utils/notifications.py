"""
Notification utilities for Lurk - Email, SMS, and Push notifications
"""

import os
import json
import boto3
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import requests
import logging

# Configuration
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
EMAIL_SOURCE = os.getenv("EMAIL_SOURCE", "noreply@lurk.app")
SMS_SOURCE = os.getenv("SMS_SOURCE", "LURK")

# AWS SES for email
ses_client = boto3.client(
    'ses',
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

# AWS SNS for SMS and Push
sns_client = boto3.client(
    'sns',
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

# Fallback SMS service (Twilio/MessageBird)
SMS_API_KEY = os.getenv("SMS_API_KEY")
SMS_API_URL = os.getenv("SMS_API_URL")

logger = logging.getLogger(__name__)

class NotificationService:
    """Centralized notification service for Lurk"""

    def __init__(self):
        self.templates = self._load_templates()
        self.rate_limits = {
            "email": {"max_per_hour": 10, "prefix": "email_rate:"},
            "sms": {"max_per_hour": 5, "prefix": "sms_rate:"},
            "push": {"max_per_hour": 20, "prefix": "push_rate:"}
        }

    def _load_templates(self) -> Dict[str, Dict[str, str]]:
        """Load notification templates"""
        return {
            "email": {
                "welcome": {
                    "subject": "Welcome to Lurk - Never Pay Credit Card Interest Again!",
                    "body": """
Hi {first_name},

Welcome to Lurk! 🎉

Your credit card automation journey begins now. With Lurk, you'll:
✅ Never pay interest on your credit cards again
✅ Get automatic minimum payments before due dates
✅ Extend your interest-free credit period to 57-60 days
✅ Track your savings and financial progress

Next steps:
1. Add your credit cards
2. Set up automatic payments
3. Enjoy interest-free credit living!

Questions? Reply to this email - we're here to help.

Best regards,
Team Lurk
                    """.strip()
                },
                "payment_reminder": {
                    "subject": "Payment Reminder: {card_brand} card due in {hours} hours",
                    "body": """
Hi {first_name},

This is a friendly reminder that your {card_brand} card ending in {last4}
has a payment of {amount} due in {hours} hours.

Good news: Lurk has this covered! 🚀
We'll automatically pay the minimum due to prevent any interest charges.

Card Details:
• Card: {card_brand} ending in {last4}
• Amount Due: {amount}
• Due Date: {due_date}
• Automatic Payment: {auto_payment_status}

You can track all your payments and savings in the Lurk app.

Happy interest-free living! 💳

Team Lurk
                    """.strip()
                },
                "payment_successful": {
                    "subject": "Payment Successful: {card_brand} card - Interest Saved!",
                    "body": """
Hi {first_name},

Great news! Your payment was successful and you've saved on interest today! 🎉

Payment Details:
• Card: {card_brand} ending in {last4}
• Amount Paid: {amount}
• Payment Time: {payment_time}
• Interest Saved: {interest_saved}
• Late Fees Avoided: {late_fees_prevented}

Your total savings with Lurk: {total_savings}

You're officially beating the banks at their own game! 💪

Keep tracking your progress in the app.

Team Lurk
                    """.strip()
                },
                "kyc_verified": {
                    "subject": "KYC Verification Complete - Your Lurk Account is Ready!",
                    "body": """
Hi {first_name},

Congratulations! Your KYC verification is complete and your Lurk account is fully activated. ✅

What you can do now:
1. Add unlimited credit cards
2. Enable premium automation features
3. Access advanced analytics and insights
4. Get personalized financial recommendations

Your Verification Details:
• Aadhaar (Last 4): XXXX-XXXX-{aadhaar_last4}
• Verification Time: {verification_time}
• Status: Verified

Ready to start your interest-free journey? Open the Lurk app now!

Questions? We're here to help.

Best regards,
Team Lurk
                    """.strip()
                },
                "subscription_upgraded": {
                    "subject": "Welcome to {tier}! Your Lurk Experience Just Got Better",
                    "body": """
Hi {first_name},

Congratulations on upgrading to Lurk {tier}! 🚀

Your new {tier} benefits are now active:

{benefits_list}

Your subscription details:
• Plan: {tier}
• Next billing date: {next_billing_date}
• Monthly price: {monthly_price}

Thank you for choosing Lurk Premium. You're now on your way to maximum interest savings!

Team Lurk
                    """.strip()
                },
                "bank_bounty_earned": {
                    "subject": "Bank Partnership Reward: {amount} earned from {bank_name}",
                    "body": """
Hi {first_name},

Exciting news! You've earned a {amount} reward through our bank partnership program! 💰

Reward Details:
• Partner Bank: {bank_name}
• Reward Amount: {amount}
• Reward Type: {reward_type}
• Prevention Date: {prevention_date}
• Payment Date: {payment_date}

This reward is paid directly by {bank_name} for preventing missed payments
and maintaining good credit health.

Your total earnings from bank partnerships: {total_earnings}

The banks pay you because you're a responsible cardholder. Pretty neat, right? 😉

Team Lurk
                    """.strip()
                }
            },
            "sms": {
                "payment_reminder": "LURK: {card_brand} card ending in {last4} due in {hours}h. Auto-payment enabled. Reply STOP to unsubscribe.",
                "payment_successful": "LURK: Payment of {amount} successful! Interest saved: {interest_saved}. Total savings: {total_savings}. Reply STOP to unsubscribe.",
                "payment_failed": "LURK: Payment failed for {card_brand} card. Please check app. Reply STOP to unsubscribe.",
                "kyc_verified": "LURK: KYC verification successful! Your account is fully activated. Add cards now. Reply STOP to unsubscribe.",
                "subscription_upgraded": "LURK: Welcome to {tier}! Premium features now active. Enjoy enhanced automation. Reply STOP to unsubscribe."
            }
        }

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        template_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Send email using AWS SES"""
        try:
            # Apply template if provided
            if template_data:
                subject = subject.format(**template_data)
                body = body.format(**template_data)

            # Send email via SES
            response = ses_client.send_email(
                Source=EMAIL_SOURCE,
                Destination={
                    'ToAddresses': [to_email]
                },
                Message={
                    'Subject': {
                        'Data': subject,
                        'Charset': 'UTF-8'
                    },
                    'Body': {
                        'Text': {
                            'Data': body,
                            'Charset': 'UTF-8'
                        },
                        'Html': {
                            'Data': self._format_html_email(body),
                            'Charset': 'UTF-8'
                        }
                    }
                }
            )

            logger.info(f"Email sent to {to_email}: {response['MessageId']}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    async def send_sms(
        self,
        to_phone: str,
        message: str,
        template_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Send SMS using AWS SNS"""
        try:
            # Apply template if provided
            if template_data:
                message = message.format(**template_data)

            # Send SMS via SNS
            response = sns_client.publish(
                PhoneNumber=to_phone,
                Message=message,
                MessageAttributes={
                    'AWS.SNS.SMS.SenderID': {
                        'DataType': 'String',
                        'StringValue': SMS_SOURCE
                    },
                    'AWS.SNS.SMS.SMSType': {
                        'DataType': 'String',
                        'StringValue': 'Transactional'
                    }
                }
            )

            logger.info(f"SMS sent to {to_phone}: {response['MessageId']}")
            return True

        except Exception as e:
            logger.error(f"Failed to send SMS to {to_phone}: {e}")
            return False

    async def send_push_notification(
        self,
        device_token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        platform: str = "all"  # ios, android, all
    ) -> bool:
        """Send push notification using AWS SNS"""
        try:
            # Create message payload
            message_payload = {
                'GCM': json.dumps({  # Android
                    'notification': {
                        'title': title,
                        'body': body,
                        'sound': 'default',
                        'badge': 1
                    },
                    'data': data or {}
                }),
                'APNS': json.dumps({  # iOS
                    'aps': {
                        'alert': {
                            'title': title,
                            'body': body
                        },
                        'sound': 'default',
                        'badge': 1
                    },
                    'data': data or {}
                })
            }

            # Send push notification
            response = sns_client.publish(
                TargetArn=device_token,
                Message=json.dumps(message_payload),
                MessageStructure='json',
                MessageAttributes={
                    'AWS.SNS.MOBILE_PUSH.SMS': {
                        'DataType': 'String',
                        'StringValue': platform
                    }
                }
            )

            logger.info(f"Push notification sent to {device_token}: {response['MessageId']}")
            return True

        except Exception as e:
            logger.error(f"Failed to send push notification to {device_token}: {e}")
            return False

    async def send_bulk_email(
        self,
        recipients: list[str],
        subject: str,
        body: str,
        template_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Send bulk email to multiple recipients"""
        results = {
            "total": len(recipients),
            "successful": 0,
            "failed": 0,
            "failed_emails": []
        }

        for email in recipients:
            try:
                success = await self.send_email(email, subject, body, template_data)
                if success:
                    results["successful"] += 1
                else:
                    results["failed"] += 1
                    results["failed_emails"].append(email)

                # Rate limiting to avoid AWS SES limits
                await self._rate_limit_delay("email", len(recipients))

            except Exception as e:
                logger.error(f"Failed to send email to {email}: {e}")
                results["failed"] += 1
                results["failed_emails"].append(email)

        return results

    def _format_html_email(self, text_body: str) -> str:
        """Format plain text email as HTML"""
        # Simple HTML formatting - in production, use email templates
        lines = text_body.split('\n')
        html_lines = []

        for line in lines:
            if line.strip():
                html_lines.append(f'<p>{line}</p>')
            else:
                html_lines.append('<br>')

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Lurk Email</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4A90E2; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; padding: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💳 Lurk</h1>
                </div>
                <div class="content">
                    {''.join(html_lines)}
                </div>
                <div class="footer">
                    <p>Team Lurk | Never pay credit card interest again</p>
                    <p>This email was sent to {{recipient_email}}. Unsubscribe here.</p>
                </div>
            </div>
        </body>
        </html>
        """

    async def _rate_limit_delay(self, notification_type: str, batch_size: int):
        """Implement rate limiting delays"""
        # Simple delay for rate limiting
        # In production, use proper rate limiting with Redis
        if notification_type == "email" and batch_size > 10:
            import asyncio
            await asyncio.sleep(1)  # 1 second delay

# Template-based notification functions

async def send_email_verification(to_email: str, subject: str, verification_link: str):
    """Send email verification"""
    notification_service = NotificationService()

    await notification_service.send_email(
        to_email=to_email,
        subject=subject,
        body=f"""
Please click the link below to verify your email address:

{verification_link}

This link will expire in 24 hours.

If you didn't request this verification, please ignore this email.

Team Lurk
        """.strip()
    )

async def send_welcome_email(to_email: str, first_name: str):
    """Send welcome email"""
    notification_service = NotificationService()
    template = notification_service.templates["email"]["welcome"]

    await notification_service.send_email(
        to_email=to_email,
        subject=template["subject"],
        body=template["body"],
        template_data={"first_name": first_name or "there"}
    )

async def send_payment_reminder_email(
    to_email: str,
    first_name: str,
    card_brand: str,
    last4: str,
    amount: str,
    due_date: str,
    hours: int,
    auto_payment_enabled: bool
):
    """Send payment reminder email"""
    notification_service = NotificationService()
    template = notification_service.templates["email"]["payment_reminder"]

    await notification_service.send_email(
        to_email=to_email,
        subject=template["subject"],
        body=template["body"],
        template_data={
            "first_name": first_name or "there",
            "card_brand": card_brand,
            "last4": last4,
            "amount": amount,
            "due_date": due_date,
            "hours": hours,
            "auto_payment_status": "Enabled" if auto_payment_enabled else "Disabled"
        }
    )

async def send_payment_successful_sms(
    to_phone: str,
    card_brand: str,
    last4: str,
    amount: str,
    interest_saved: str,
    total_savings: str
):
    """Send payment successful SMS"""
    notification_service = NotificationService()
    template = notification_service.templates["sms"]["payment_successful"]

    await notification_service.send_sms(
        to_phone=to_phone,
        message=template,
        template_data={
            "card_brand": card_brand,
            "last4": last4,
            "amount": amount,
            "interest_saved": interest_saved,
            "total_savings": total_savings
        }
    )

async def send_push_notification_payment_alert(
    device_token: str,
    card_brand: str,
    last4: str,
    amount: str,
    payment_type: str
):
    """Send push notification for payment alert"""
    notification_service = NotificationService()

    await notification_service.send_push_notification(
        device_token=device_token,
        title=f"Lurk Payment Alert" if payment_type == "reminder" else "Payment Successful!",
        body=f"{card_brand} card ending in {last4}: {amount} due soon" if payment_type == "reminder"
              else f"Payment of {amount} successful!",
        data={
            "type": "payment_alert",
            "card_brand": card_brand,
            "last4": last4,
            "amount": amount,
            "payment_type": payment_type
        }
    )

# Convenience functions

async def send_email_notification(to_email: str, subject: str, body: str):
    """Simple email notification function"""
    notification_service = NotificationService()
    return await notification_service.send_email(to_email, subject, body)

async def send_sms_notification(to_phone: str, message: str):
    """Simple SMS notification function"""
    notification_service = NotificationService()
    return await notification_service.send_sms(to_phone, message)

async def send_push_notification_simple(
    device_token: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None
):
    """Simple push notification function"""
    notification_service = NotificationService()
    return await notification_service.send_push_notification(
        device_token, title, body, data
    )