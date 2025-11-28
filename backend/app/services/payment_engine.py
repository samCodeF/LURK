"""
Payment Engine for Lurk - UPI AutoPay and Payment Gateway Integration
Handles automatic payments, scheduling, and bank bounty tracking
"""

import os
import asyncio
import json
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional, Union
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import aiohttp
import redis

# Razorpay Integration (Production would use official SDK)
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_1234567890")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "test_secret_1234567890")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "webhook_secret_123")

from app.models.user import User, SubscriptionTier
from app.models.credit_card import CreditCard, BankName
from app.models.payment import (
    Payment, PaymentType, PaymentStatus, PaymentMethod, PaymentGateway,
    PaymentSchedule, PaymentCreate, PaymentResponse
)
from app.models.bank_bounty import (
    BankBounty, BountyType, BountyStatus, BankName as BountyBankName
)
from app.utils.encryption import encrypt_sensitive_data, decrypt_sensitive_data
from app.utils.notifications import (
    send_payment_successful_email, send_payment_failed_sms,
    send_push_notification_payment_alert
)
from app.utils.audit import log_user_action, log_system_event
from app.utils.rate_limiter import RateLimiter

# Redis for payment processing and idempotency
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, decode_responses=True)

class PaymentEngine:
    """Payment processing engine for Lurk"""

    def __init__(self):
        self.razorpay_base_url = "https://api.razorpay.com/v1"
        self.webhook_handlers = {
            "payment.captured": self._handle_payment_captured,
            "payment.failed": self._handle_payment_failed,
            "refund.processed": self._handle_refund_processed,
            "subscription.charged": self._handle_subscription_charged,
            "mandate.created": self._handle_mandate_created,
            "mandate.revoked": self._handle_mandate_revoked
        }
        self.rate_limiter = RateLimiter(redis_client)

    async def create_upi_autopay_mandate(
        self,
        card: CreditCard,
        user: User,
        db: Session
    ) -> Dict[str, Any]:
        """Create UPI AutoPay mandate for card"""
        try:
            # Check rate limiting
            if await self.rate_limiter.check_payment_attempts(str(user.id)):
                return {
                    "success": False,
                    "message": "Too many payment attempts. Please try again later.",
                    "error_code": "RATE_LIMIT_EXCEEDED"
                }

            # Create Razorpay customer if not exists
            customer_id = await self._ensure_razorpay_customer(user, db)

            # Create UPI AutoPay subscription
            mandate_data = {
                "customer_id": customer_id,
                "amount": int(float(card.minimum_due) * 100),  # Convert to paise
                "currency": "INR",
                "frequency": "monthly",  # AutoPay for recurring payments
                "start_at": int((datetime.now(timezone.utc) + timedelta(days=1)).timestamp()),
                "expire_by": int((datetime.now(timezone.utc) + timedelta(days=365)).timestamp()),
                "notes": {
                    "card_id": str(card.id),
                    "user_id": str(user.id),
                    "card_last4": card.card_last4,
                    "bank_name": card.bank_name.value,
                    "mandate_type": "upi_autopay"
                },
                "notify_email": user.email,
                "notify_phone": user.phone,
                "auth_method": "mobile"  # Mobile authentication
            }

            # Create mandate via Razorpay API
            mandate_response = await self._make_razorpay_request(
                "/subscriptions",
                mandate_data,
                method="POST"
            )

            if not mandate_response or "id" not in mandate_response:
                return {
                    "success": False,
                    "message": "Failed to create UPI AutoPay mandate",
                    "error_code": "MANDATE_CREATION_FAILED"
                }

            # Store mandate details
            mandate_details = {
                "razorpay_subscription_id": mandate_response["id"],
                "customer_id": customer_id,
                "amount": mandate_data["amount"],
                "status": mandate_response.get("status", "created"),
                "short_url": mandate_response.get("short_url"),
                "notes": mandate_data["notes"]
            }

            # Encrypt and store mandate info
            encrypted_mandate = encrypt_sensitive_data(json.dumps(mandate_details))

            # Store in Redis for processing
            mandate_key = f"upi_mandate:{card.id}"
            await redis_client.setex(
                mandate_key,
                timedelta(days=365),  # 1 year validity
                encrypted_mandate
            )

            # Log mandate creation
            await log_user_action(
                user_id=str(user.id),
                action="UPI_AUTOPAY_MANDATE_CREATED",
                ip_address=None,
                details={
                    "card_id": str(card.id),
                    "mandate_id": mandate_response["id"],
                    "amount": mandate_data["amount"],
                    "frequency": "monthly"
                }
            )

            return {
                "success": True,
                "message": "UPI AutoPay mandate created successfully",
                "mandate_id": mandate_response["id"],
                "short_url": mandate_response.get("short_url"),
                "status": mandate_response.get("status")
            }

        except Exception as e:
            error_msg = f"UPI AutoPay mandate creation error: {str(e)}"
            await log_system_event(
                event_type="MANDATE_CREATION_ERROR",
                details={
                    "card_id": str(card.id),
                    "user_id": str(user.id),
                    "error": str(e)
                }
            )

            return {
                "success": False,
                "message": "Failed to create UPI AutoPay mandate",
                "error_code": "SYSTEM_ERROR"
            }

    async def process_minimum_payment(
        self,
        card: CreditCard,
        user: User,
        db: Session,
        trigger_source: str = "automatic",
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process minimum payment for card"""
        try:
            # Generate idempotency key if not provided
            if not idempotency_key:
                idempotency_key = f"payment_{card.id}_{int(datetime.now(timezone.utc).timestamp())}"

            # Check idempotency
            existing_payment = await redis_client.get(f"payment:{idempotency_key}")
            if existing_payment:
                payment_data = json.loads(existing_payment)
                return {
                    "success": True,
                    "message": "Payment already processed",
                    "payment_id": payment_data.get("payment_id"),
                    "status": "duplicate"
                }

            # Calculate payment amount
            payment_amount = self._calculate_payment_amount(card)

            if payment_amount <= 0:
                return {
                    "success": False,
                    "message": "No payment required",
                    "error_code": "NO_PAYMENT_REQUIRED"
                }

            # Check rate limiting
            if await self.rate_limiter.check_payment_attempts(str(user.id)):
                return {
                    "success": False,
                    "message": "Payment processing rate limit exceeded",
                    "error_code": "RATE_LIMIT_EXCEEDED"
                }

            # Create payment record
            payment = Payment(
                card_id=card.id,
                user_id=user.id,
                payment_type=PaymentType.AUTOMATIC if trigger_source == "automatic" else PaymentType.MANUAL,
                amount=payment_amount,
                payment_method=PaymentMethod.UPI_AUTOPAY,
                payment_preference=card.payment_preference,
                description=f"Minimum payment for {card.bank_name.value} card ending in {card.card_last4}",
                initiated_at=datetime.now(timezone.utc),
                payment_gateway=PaymentGateway.RAZORPAY,
                status=PaymentStatus.PENDING,
                triggered_by=trigger_source,
                trigger_date=card.payment_due_date,
                buffer_hours=card.payment_buffer_hours,
                idempotency_key=idempotency_key
            )

            db.add(payment)
            db.commit()
            db.refresh(payment)

            # Get UPI mandate details
            mandate_key = f"upi_mandate:{card.id}"
            mandate_data_encrypted = await redis_client.get(mandate_key)

            if not mandate_data_encrypted:
                # Create new mandate if not exists
                mandate_result = await self.create_upi_autopay_mandate(card, user, db)
                if not mandate_result["success"]:
                    return {
                        "success": False,
                        "message": "UPI AutoPay mandate required",
                        "error_code": "MANDATE_REQUIRED",
                        "mandate_data": mandate_result
                    }

                # Retry getting mandate
                mandate_data_encrypted = await redis_client.get(mandate_key)

            mandate_data = json.loads(decrypt_sensitive_data(mandate_data_encrypted))

            # Create Razorpay payment
            payment_data = {
                "amount": int(float(payment_amount) * 100),  # Convert to paise
                "currency": "INR",
                "email": user.email,
                "contact": user.phone,
                "subscription_id": mandate_data["razorpay_subscription_id"],
                "notes": {
                    "payment_id": str(payment.id),
                    "card_id": str(card.id),
                    "user_id": str(user.id),
                    "card_last4": card.card_last4,
                    "bank_name": card.bank_name.value,
                    "payment_type": "minimum_due",
                    "trigger_source": trigger_source,
                    "idempotency_key": idempotency_key
                }
            }

            # Create payment via Razorpay
            razorpay_response = await self._make_razorpay_request(
                "/payments",
                payment_data,
                method="POST"
            )

            if not razorpay_response or "id" not in razorpay_response:
                # Update payment status to failed
                payment.status = PaymentStatus.FAILED
                payment.failed_at = datetime.now(timezone.utc)
                payment.error_message = "Failed to create payment gateway transaction"
                db.commit()

                return {
                    "success": False,
                    "message": "Failed to process payment",
                    "error_code": "PAYMENT_GATEWAY_ERROR"
                }

            # Update payment with gateway details
            payment.transaction_id = razorpay_response["id"]
            payment.gateway_order_id = razorpay_response.get("order_id")
            payment.gateway_payment_id = razorpay_response["id"]
            payment.processed_at = datetime.now(timezone.utc)
            db.commit()

            # Store payment in Redis for idempotency
            payment_cache_data = {
                "payment_id": str(payment.id),
                "transaction_id": razorpay_response["id"],
                "amount": float(payment_amount),
                "status": "created"
            }
            await redis_client.setex(
                f"payment:{idempotency_key}",
                timedelta(hours=24),
                json.dumps(payment_cache_data)
            )

            # Log payment processing
            await log_user_action(
                user_id=str(user.id),
                action="PAYMENT_PROCESSED",
                ip_address=None,
                details={
                    "payment_id": str(payment.id),
                    "card_id": str(card.id),
                    "amount": float(payment_amount),
                    "payment_method": "upi_autopay",
                    "trigger_source": trigger_source
                }
            )

            return {
                "success": True,
                "message": "Payment processing initiated",
                "payment_id": str(payment.id),
                "transaction_id": razorpay_response["id"],
                "amount": float(payment_amount),
                "status": razorpay_response.get("status", "created")
            }

        except Exception as e:
            error_msg = f"Payment processing error: {str(e)}"
            await log_system_event(
                event_type="PAYMENT_PROCESSING_ERROR",
                details={
                    "card_id": str(card.id),
                    "user_id": str(user.id),
                    "error": str(e)
                }
            )

            return {
                "success": False,
                "message": "Payment processing failed",
                "error_code": "SYSTEM_ERROR"
            }

    async def schedule_payment(
        self,
        card: CreditCard,
        user: User,
        scheduled_date: datetime,
        scheduled_amount: Decimal,
        payment_type: PaymentType = PaymentType.AUTOMATIC,
        db: Session = None
    ) -> Dict[str, Any]:
        """Schedule payment for future date"""
        try:
            # Create payment schedule
            schedule = PaymentSchedule(
                card_id=card.id,
                user_id=user.id,
                scheduled_date=scheduled_date,
                scheduled_amount=scheduled_amount,
                payment_type=payment_type,
                payment_method=PaymentMethod.UPI_AUTOPAY,
                status="scheduled"
            )

            if db:
                db.add(schedule)
                db.commit()
                db.refresh(schedule)

            # Add to Redis queue for processing
            queue_key = "payment_scheduled"
            schedule_data = {
                "schedule_id": str(schedule.id) if db else None,
                "card_id": str(card.id),
                "user_id": str(user.id),
                "scheduled_date": scheduled_date.isoformat(),
                "scheduled_amount": float(scheduled_amount),
                "payment_type": payment_type.value
            }

            # Score by scheduled time for priority processing
            score = int(scheduled_date.timestamp())
            await redis_client.zadd(queue_key, {json.dumps(schedule_data): score})

            # Log payment scheduling
            await log_user_action(
                user_id=str(user.id),
                action="PAYMENT_SCHEDULED",
                ip_address=None,
                details={
                    "card_id": str(card.id),
                    "scheduled_date": scheduled_date.isoformat(),
                    "scheduled_amount": float(scheduled_amount),
                    "payment_type": payment_type.value
                }
            )

            return {
                "success": True,
                "message": "Payment scheduled successfully",
                "schedule_id": str(schedule.id) if db else None,
                "scheduled_date": scheduled_date.isoformat(),
                "scheduled_amount": float(scheduled_amount)
            }

        except Exception as e:
            await log_system_event(
                event_type="PAYMENT_SCHEDULING_ERROR",
                details={
                    "card_id": str(card.id),
                    "user_id": str(user.id),
                    "scheduled_date": scheduled_date.isoformat(),
                    "error": str(e)
                }
            )

            return {
                "success": False,
                "message": "Failed to schedule payment",
                "error_code": "SYSTEM_ERROR"
            }

    async def process_scheduled_payments(self, db: Session) -> Dict[str, Any]:
        """Process all scheduled payments that are due"""
        try:
            results = {
                "processed": 0,
                "successful": 0,
                "failed": 0,
                "skipped": 0,
                "payments_processed": []
            }

            # Get current time
            now = datetime.now(timezone.utc)

            # Get scheduled payments from Redis
            queue_key = "payment_scheduled"
            due_schedules = await redis_client.zrangebyscore(
                queue_key, 0, int(now.timestamp())
            )

            for schedule_data_str in due_schedules:
                try:
                    schedule_data = json.loads(schedule_data_str)

                    # Parse scheduled date
                    scheduled_date = datetime.fromisoformat(schedule_data["scheduled_date"])

                    # Skip if processed already
                    if scheduled_date > now:
                        results["skipped"] += 1
                        continue

                    # Get card and user
                    card = db.query(CreditCard).filter(CreditCard.id == schedule_data["card_id"]).first()
                    user = db.query(User).filter(User.id == schedule_data["user_id"]).first()

                    if not card or not user or not card.auto_payment_enabled:
                        # Remove invalid schedule
                        await redis_client.zrem(queue_key, schedule_data_str)
                        results["skipped"] += 1
                        continue

                    # Process payment
                    payment_result = await self.process_minimum_payment(
                        card, user, db, trigger_source="scheduled"
                    )

                    results["processed"] += 1

                    if payment_result["success"]:
                        results["successful"] += 1
                    else:
                        results["failed"] += 1

                    payment_info = {
                        "card_id": schedule_data["card_id"],
                        "user_id": schedule_data["user_id"],
                        "scheduled_date": scheduled_date.isoformat(),
                        "amount": schedule_data["scheduled_amount"],
                        "success": payment_result["success"],
                        "error": payment_result.get("error_code")
                    }
                    results["payments_processed"].append(payment_info)

                    # Remove from queue
                    await redis_client.zrem(queue_key, schedule_data_str)

                except Exception as e:
                    results["failed"] += 1
                    continue

            # Log batch processing
            await log_system_event(
                event_type="SCHEDULED_PAYMENTS_PROCESSED",
                details=results
            )

            return results

        except Exception as e:
            await log_system_event(
                event_type="SCHEDULED_PAYMENTS_ERROR",
                details={"error": str(e)}
            )

            return {"error": str(e)}

    async def cancel_scheduled_payments(self, card_id: str) -> Dict[str, Any]:
        """Cancel all scheduled payments for a card"""
        try:
            queue_key = "payment_scheduled"
            all_schedules = await redis_client.zrange(queue_key, 0, -1)

            cancelled_count = 0
            schedules_to_remove = []

            for schedule_data_str in all_schedules:
                try:
                    schedule_data = json.loads(schedule_data_str)
                    if schedule_data.get("card_id") == card_id:
                        schedules_to_remove.append(schedule_data_str)
                        cancelled_count += 1

                except:
                    continue

            # Remove schedules atomically
            if schedules_to_remove:
                await redis_client.zrem(queue_key, *schedules_to_remove)

            return {
                "success": True,
                "message": f"Cancelled {cancelled_count} scheduled payments",
                "cancelled_count": cancelled_count
            }

        except Exception as e:
            return {
                "success": False,
                "message": "Failed to cancel scheduled payments",
                "error_code": "SYSTEM_ERROR"
            }

    async def handle_webhook(
        self,
        webhook_data: Dict[str, Any],
        headers: Dict[str, str]
    ) -> Dict[str, Any]:
        """Handle Razorpay webhook events"""
        try:
            # Verify webhook signature
            if not self._verify_webhook_signature(webhook_data, headers):
                return {
                    "success": False,
                    "message": "Invalid webhook signature"
                }

            # Get event type
            event_type = webhook_data.get("event")
            if not event_type:
                return {
                    "success": False,
                    "message": "Missing event type"
                }

            # Handle specific event types
            handler = self.webhook_handlers.get(event_type)
            if handler:
                return await handler(webhook_data)
            else:
                return {
                    "success": True,
                    "message": f"Webhook received for event: {event_type}",
                    "event_type": event_type
                }

        except Exception as e:
            await log_system_event(
                event_type="WEBHOOK_PROCESSING_ERROR",
                details={
                    "error": str(e),
                    "event": webhook_data.get("event")
                }
            )

            return {
                "success": False,
                "message": "Webhook processing failed"
            }

    # Private helper methods

    async def _make_razorpay_request(
        self,
        endpoint: str,
        data: Dict[str, Any],
        method: str = "POST"
    ) -> Optional[Dict[str, Any]]:
        """Make request to Razorpay API"""
        try:
            url = f"{self.razorpay_base_url}{endpoint}"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Basic {self._get_basic_auth()}"
            }

            async with aiohttp.ClientSession() as session:
                async with session.request(method, url, headers=headers, json=data) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        error_text = await response.text()
                        print(f"Razorpay API error: {response.status} - {error_text}")
                        return None

        except Exception as e:
            print(f"Razorpay request error: {str(e)}")
            return None

    def _get_basic_auth(self) -> str:
        """Get Basic Auth header for Razorpay"""
        import base64
        auth_string = f"{RAZORPAY_KEY_ID}:{RAZORPAY_KEY_SECRET}"
        return base64.b64encode(auth_string.encode()).decode()

    def _verify_webhook_signature(
        self,
        webhook_data: Dict[str, Any],
        headers: Dict[str, str]
    ) -> bool:
        """Verify Razorpay webhook signature"""
        try:
            signature = headers.get("X-Razorpay-Signature")
            if not signature:
                return False

            # Compute expected signature
            webhook_body = json.dumps(webhook_data, separators=(',', ':'))
            expected_signature = hashlib.hmac(
                RAZORPAY_WEBHOOK_SECRET.encode(),
                webhook_body.encode(),
                hashlib.sha256
            ).hexdigest()

            return signature == expected_signature

        except:
            return False

    async def _ensure_razorpay_customer(self, user: User, db: Session) -> str:
        """Ensure Razorpay customer exists"""
        try:
            # Check if customer already exists
            customer_key = f"razorpay_customer:{user.id}"
            customer_id = await redis_client.get(customer_key)

            if customer_id:
                return customer_id

            # Create new customer
            customer_data = {
                "name": f"{user.first_name or ''} {user.last_name or ''}".strip(),
                "email": user.email,
                "contact": user.phone,
                "fail_existing": "0",
                "notes": {
                    "user_id": str(user.id),
                    "subscription_tier": user.subscription_tier.value,
                    "created_via": "lurk_api"
                }
            }

            customer_response = await self._make_razorpay_request(
                "/customers",
                customer_data,
                method="POST"
            )

            if not customer_response or "id" not in customer_response:
                raise Exception("Failed to create Razorpay customer")

            customer_id = customer_response["id"]

            # Cache customer ID
            await redis_client.setex(
                customer_key,
                timedelta(days=365),
                customer_id
            )

            return customer_id

        except Exception as e:
            print(f"Error ensuring Razorpay customer: {str(e)}")
            raise

    def _calculate_payment_amount(self, card: CreditCard) -> Decimal:
        """Calculate payment amount based on card preferences"""
        if card.payment_preference == "full_amount":
            return card.total_due
        elif card.payment_preference == "custom" and card.custom_payment_amount:
            return card.custom_payment_amount
        else:  # minimum_due
            return card.minimum_due

    async def _handle_payment_captured(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle payment.captured webhook event"""
        try:
            # This would update payment status in database and notify user
            payment_entity = webhook_data.get("payload", {}).get("payment", {}).get("entity", {})

            if not payment_entity:
                return {"success": False, "message": "Invalid payment data"}

            # Get payment details from notes
            notes = payment_entity.get("notes", {})
            payment_id = notes.get("payment_id")
            card_id = notes.get("card_id")
            user_id = notes.get("user_id")
            amount_paid = payment_entity.get("amount", 0) / 100  # Convert from paise to INR

            # Update payment status (would need DB session)
            # This is a simplified version
            await log_system_event(
                event_type="PAYMENT_CAPTURED",
                details={
                    "payment_id": payment_id,
                    "card_id": card_id,
                    "user_id": user_id,
                    "amount_paid": amount_paid,
                    "razorpay_id": payment_entity.get("id")
                }
            )

            # Send notifications
            # await send_payment_successful_email(user_id, card_id, amount_paid)

            return {"success": True, "message": "Payment captured successfully"}

        except Exception as e:
            return {"success": False, "message": f"Error handling payment captured: {str(e)}"}

    async def _handle_payment_failed(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle payment.failed webhook event"""
        try:
            payment_entity = webhook_data.get("payload", {}).get("payment", {}).get("entity", {})
            notes = payment_entity.get("notes", {})

            await log_system_event(
                event_type="PAYMENT_FAILED_WEBHOOK",
                details={
                    "payment_id": notes.get("payment_id"),
                    "card_id": notes.get("card_id"),
                    "user_id": notes.get("user_id"),
                    "error": payment_entity.get("error_description"),
                    "razorpay_id": payment_entity.get("id")
                }
            )

            return {"success": True, "message": "Payment failure handled"}

        except Exception as e:
            return {"success": False, "message": f"Error handling payment failed: {str(e)}"}

    async def _handle_refund_processed(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle refund.processed webhook event"""
        return {"success": True, "message": "Refund processed"}

    async def _handle_subscription_charged(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle subscription.charged webhook event"""
        return {"success": True, "message": "Subscription charged"}

    async def _handle_mandate_created(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle mandate.created webhook event"""
        return {"success": True, "message": "Mandate created"}

    async def _handle_mandate_revoked(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle mandate.revoked webhook event"""
        return {"success": True, "message": "Mandate revoked"}


# Global payment engine instance
payment_engine = PaymentEngine()

# Convenience functions
async def process_minimum_payment(
    card: CreditCard, user: User, db: Session, trigger_source: str = "automatic"
) -> Dict[str, Any]:
    """Convenience function for processing minimum payment"""
    return await payment_engine.process_minimum_payment(card, user, db, trigger_source)

async def schedule_payment(
    card: CreditCard, user: User, scheduled_date: datetime, scheduled_amount: Decimal, db: Session = None
) -> Dict[str, Any]:
    """Convenience function for scheduling payment"""
    return await payment_engine.schedule_payment(card, user, scheduled_date, scheduled_amount, db)

async def handle_payment_webhook(webhook_data: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
    """Convenience function for handling payment webhook"""
    return await payment_engine.handle_webhook(webhook_data, headers)