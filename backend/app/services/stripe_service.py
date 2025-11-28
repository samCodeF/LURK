"""
Stripe Service for Lurk - Payment Processing and Subscription Management
"""

import os
import json
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from decimal import Decimal

import stripe
from fastapi import HTTPException, status

from app.models.user import User, SubscriptionTier
from app.utils.encryption import encrypt_sensitive_data, decrypt_sensitive_data
from app.utils.audit import log_system_event

# Stripe Configuration
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "sk_test_1234567890")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "pk_test_1234567890")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_test_1234567890")

# Initialize Stripe
stripe.api_key = STRIPE_SECRET_KEY

# Product and Price configurations
LURK_PRODUCTS = {
    "silver": {
        "product_id": "prod_silver_monthly",
        "name": "Lurk Silver",
        "description": "Up to 3 credit cards with advanced automation",
        "prices": {
            "monthly": "price_silver_monthly",
            "annual": "price_silver_annual"
        }
    },
    "gold": {
        "product_id": "prod_gold_monthly",
        "name": "Lurk Gold",
        "description": "Up to 5 credit cards with AI-powered insights",
        "prices": {
            "monthly": "price_gold_monthly",
            "annual": "price_gold_annual"
        }
    },
    "platinum": {
        "product_id": "prod_platinum_monthly",
        "name": "Lurk Platinum",
        "description": "Unlimited cards with premium features",
        "prices": {
            "monthly": "price_platinum_monthly",
            "annual": "price_platinum_annual"
        }
    }
}

LURK_PRICES = {
    "silver_monthly": {"amount": 9900, "currency": "inr", "interval": "month"},
    "silver_annual": {"amount": 99900, "currency": "inr", "interval": "year"},
    "gold_monthly": {"amount": 29900, "currency": "inr", "interval": "month"},
    "gold_annual": {"amount": 299900, "currency": "inr", "interval": "year"},
    "platinum_monthly": {"amount": 59900, "currency": "inr", "interval": "month"},
    "platinum_annual": {"amount": 599900, "currency": "inr", "interval": "year"}
}

class StripeService:
    """Stripe integration service for Lurk"""

    def __init__(self):
        self.webhook_handlers = {
            "customer.subscription.created": self._handle_subscription_created,
            "customer.subscription.updated": self._handle_subscription_updated,
            "customer.subscription.deleted": self._handle_subscription_deleted,
            "invoice.payment_succeeded": self._handle_payment_succeeded,
            "invoice.payment_failed": self._handle_payment_failed,
            "invoice.finalized": self._handle_invoice_finalized,
            "payment_method.attached": self._handle_payment_method_attached,
            "payment_method.card_updated": self._handle_payment_method_updated,
            "payment_method.detached": self._handle_payment_method_detached
        }

    async def create_customer(self, user: User) -> Dict[str, Any]:
        """Create or get Stripe customer"""
        try:
            # Check if user already has Stripe customer
            if user.stripe_customer_id:
                customer = stripe.Customer.retrieve(user.stripe_customer_id)
                return {
                    "success": True,
                    "customer_id": customer.id,
                    "email": customer.email,
                    "phone": customer.phone,
                    "created": False
                }

            # Create new customer
            customer_data = {
                "email": user.email,
                "phone": user.phone,
                "name": f"{user.first_name or ''} {user.last_name or ''}".strip(),
                "metadata": {
                    "user_id": str(user.id),
                    "app_source": "lurk_api",
                    "subscription_tier": user.subscription_tier.value,
                    "created_at": user.created_at.isoformat() if user.created_at else datetime.now(timezone.utc).isoformat()
                },
                "description": f"Lurk {user.subscription_tier.value} user"
            }

            customer = stripe.Customer.create(**customer_data)

            await log_system_event(
                event_type="STRIPE_CUSTOMER_CREATED",
                details={
                    "stripe_customer_id": customer.id,
                    "user_id": str(user.id),
                    "email": user.email
                }
            )

            return {
                "success": True,
                "customer_id": customer.id,
                "email": customer.email,
                "phone": customer.phone,
                "created": True
            }

        except stripe.error.StripeError as e:
            await log_system_event(
                event_type="STRIPE_CUSTOMER_CREATE_ERROR",
                details={
                    "user_id": str(user.id),
                    "error": str(e),
                    "error_type": e.error_type
                }
            )

            return {
                "success": False,
                "error": str(e),
                "error_type": e.error_type,
                "error_code": "STRIPE_CUSTOMER_ERROR"
            }
        except Exception as e:
            await log_system_event(
                event_type="STRIPE_CUSTOMER_SYSTEM_ERROR",
                details={
                    "user_id": str(user.id),
                    "error": str(e)
                }
            )

            return {
                "success": False,
                "error": str(e),
                "error_code": "SYSTEM_ERROR"
            }

    async def create_subscription(
        self,
        user: User,
        tier: str,
        payment_method_id: str,
        pricing: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create Stripe subscription"""
        try:
            # Get or create customer
            customer_result = await self.create_customer(user)
            if not customer_result["success"]:
                return customer_result

            customer_id = customer_result["customer_id"]

            # Get price ID for tier and billing cycle
            price_id = pricing["price_id"]

            # Create subscription
            subscription_data = {
                "customer": customer_id,
                "items": [{
                    "price": price_id,
                }],
                "payment_behavior": "default_incomplete",
                "payment_settings": {
                    "payment_method_types": ["card"],
                    "save_default_payment_method": "on_subscription"
                },
                "expand": ["latest_invoice.payment_intent"],
                "metadata": {
                    "user_id": str(user.id),
                    "tier": tier,
                    "billing_cycle": pricing.get("interval", "month"),
                    "app_source": "lurk_api"
                },
                "description": f"Lurk {tier.upper()} Subscription"
            }

            # Add payment method if provided
            if payment_method_id:
                subscription_data["default_payment_method"] = payment_method_id

            subscription = stripe.Subscription.create(**subscription_data)

            # Check if subscription requires action
            requires_action = subscription.latest_invoice and subscription.latest_invoice.payment_intent
            status = "requires_action" if requires_action else "active"

            await log_system_event(
                event_type="STRIPE_SUBSCRIPTION_CREATED",
                details={
                    "subscription_id": subscription.id,
                    "customer_id": customer_id,
                    "user_id": str(user.id),
                    "tier": tier,
                    "price_id": price_id,
                    "status": status
                }
            )

            return {
                "success": True,
                "subscription_id": subscription.id,
                "customer_id": customer_id,
                "status": status,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "latest_invoice": subscription.latest_invoice.id if subscription.latest_invoice else None,
                "payment_intent": subscription.latest_invoice.payment_intent.id if subscription.latest_invoice and subscription.latest_invoice.payment_intent else None,
                "requires_action": requires_action,
                "client_secret": subscription.latest_invoice.payment_intent.client_secret if requires_action else None
            }

        except stripe.error.StripeError as e:
            await log_system_event(
                event_type="STRIPE_SUBSCRIPTION_CREATE_ERROR",
                details={
                    "user_id": str(user.id),
                    "tier": tier,
                    "error": str(e),
                    "error_type": e.error_type
                }
            )

            return {
                "success": False,
                "error": str(e),
                "error_type": e.error_type,
                "error_code": "STRIPE_SUBSCRIPTION_ERROR"
            }
        except Exception as e:
            await log_system_event(
                event_type="STRIPE_SUBSCRIPTION_SYSTEM_ERROR",
                details={
                    "user_id": str(user.id),
                    "tier": tier,
                    "error": str(e)
                }
            )

            return {
                "success": False,
                "error": str(e),
                "error_code": "SYSTEM_ERROR"
            }

    async def update_subscription(
        self,
        subscription_id: str,
        new_price_id: str
    ) -> Dict[str, Any]:
        """Update existing subscription"""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)

            # Create new subscription item with updated price
            updated_subscription = stripe.Subscription.modify(
                subscription_id,
                items=[{
                    "id": subscription["items"]["data"][0].id,
                    "price": new_price_id,
                }],
                "proration_behavior": "create_prorations"
            )

            await log_system_event(
                event_type="STRIPE_SUBSCRIPTION_UPDATED",
                details={
                    "subscription_id": subscription_id,
                    "new_price_id": new_price_id,
                    "status": updated_subscription.status
                }
            )

            return {
                "success": True,
                "subscription_id": updated_subscription.id,
                "status": updated_subscription.status,
                "current_period_start": updated_subscription.current_period_start,
                "current_period_end": updated_subscription.current_period_end
            }

        except stripe.error.StripeError as e:
            await log_system_event(
                event_type="STRIPE_SUBSCRIPTION_UPDATE_ERROR",
                details={
                    "subscription_id": subscription_id,
                    "new_price_id": new_price_id,
                    "error": str(e),
                    "error_type": e.error_type
                }
            )

            return {
                "success": False,
                "error": str(e),
                "error_type": e.error_type,
                "error_code": "STRIPE_SUBSCRIPTION_UPDATE_ERROR"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "error_code": "SYSTEM_ERROR"
            }

    async def cancel_subscription(
        self,
        customer_id: str,
        at_period_end: bool = True
    ) -> Dict[str, Any]:
        """Cancel Stripe subscription"""
        try:
            # Get active subscriptions for customer
            subscriptions = stripe.Subscription.list(
                customer=customer_id,
                status="active",
                limit=1
            )

            if not subscriptions.data:
                return {
                    "success": False,
                    "error": "No active subscription found",
                    "error_code": "NO_SUBSCRIPTION"
                }

            subscription = subscriptions.data[0]

            # Cancel subscription
            deleted_subscription = stripe.Subscription.delete(
                subscription.id,
                at_period_end=at_period_end
            )

            await log_system_event(
                event_type="STRIPE_SUBSCRIPTION_CANCELLED",
                details={
                    "subscription_id": subscription.id,
                    "customer_id": customer_id,
                    "at_period_end": at_period_end,
                    "canceled_at": datetime.now(timezone.utc).isoformat()
                }
            )

            return {
                "success": True,
                "subscription_id": deleted_subscription.id,
                "status": "canceled",
                "at_period_end": at_period_end,
                "canceled_at": datetime.now(timezone.utc).isoformat()
            }

        except stripe.error.StripeError as e:
            await log_system_event(
                event_type="STRIPE_SUBSCRIPTION_CANCEL_ERROR",
                details={
                    "customer_id": customer_id,
                    "error": str(e),
                    "error_type": e.error_type
                }
            )

            return {
                "success": False,
                "error": str(e),
                "error_type": e.error_type,
                "error_code": "STRIPE_SUBSCRIPTION_CANCEL_ERROR"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "error_code": "SYSTEM_ERROR"
            }

    async def get_payment_methods(self, customer_id: str) -> List[Dict[str, Any]]:
        """Get payment methods for customer"""
        try:
            payment_methods = stripe.PaymentMethod.list(
                customer=customer_id,
                type="card",
                limit=10
            )

            methods = []
            for method in payment_methods.data:
                if method.type == "card":
                    card = method.card
                    methods.append({
                        "id": method.id,
                        "type": method.type,
                        "card": {
                            "brand": card.brand,
                            "last4": card.last4,
                            "exp_month": card.exp_month,
                            "exp_year": card.exp_year,
                            "fingerprint": card.fingerprint
                        },
                        "billing_details": {
                            "name": method.billing_details.name,
                            "email": method.billing_details.email,
                            "phone": method.billing_details.phone
                        },
                        "created": method.created,
                        "is_default": method.metadata.get("is_default", False) if method.metadata else False
                    })

            return methods

        except stripe.error.StripeError as e:
            await log_system_event(
                event_type="STRIPE_PAYMENT_METHODS_ERROR",
                details={
                    "customer_id": customer_id,
                    "error": str(e),
                    "error_type": e.error_type
                }
            )
            return []
        except Exception as e:
            return []

    async def add_payment_method(
        self,
        customer_id: str,
        payment_method_token: str,
        set_as_default: bool = False
    ) -> Dict[str, Any]:
        """Add payment method to customer"""
        try:
            payment_method = stripe.PaymentMethod.create(
                type="card",
                card={"token": payment_method_token},
                customer=customer_id,
                metadata={
                    "app_source": "lurk_api",
                    "is_default": str(set_as_default)
                }
            )

            # Set as default if requested
            if set_as_default:
                stripe.Customer.modify(
                    customer_id,
                    invoice_settings={"default_payment_method": payment_method.id}
                )

            await log_system_event(
                event_type="STRIPE_PAYMENT_METHOD_ADDED",
                details={
                    "payment_method_id": payment_method.id,
                    "customer_id": customer_id,
                    "set_as_default": set_as_default,
                    "card_last4": payment_method.card.last4 if payment_method.card else None
                }
            )

            return {
                "success": True,
                "payment_method_id": payment_method.id,
                "card_last4": payment_method.card.last4 if payment_method.card else None,
                "brand": payment_method.card.brand if payment_method.card else None,
                "is_default": set_as_default
            }

        except stripe.error.StripeError as e:
            await log_system_event(
                event_type="STRIPE_PAYMENT_METHOD_ADD_ERROR",
                details={
                    "customer_id": customer_id,
                    "error": str(e),
                    "error_type": e.error_type
                }
            )

            return {
                "success": False,
                "error": str(e),
                "error_type": e.error_type,
                "error_code": "STRIPE_PAYMENT_METHOD_ADD_ERROR"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "error_code": "SYSTEM_ERROR"
            }

    async def delete_payment_method(
        self,
        payment_method_id: str
    ) -> Dict[str, Any]:
        """Detach payment method"""
        try:
            payment_method = stripe.PaymentMethod.detach(payment_method_id)

            await log_system_event(
                event_type="STRIPE_PAYMENT_METHOD_DETACHED",
                details={
                    "payment_method_id": payment_method_id
                }
            )

            return {
                "success": True,
                "payment_method_id": payment_method_id
            }

        except stripe.error.StripeError as e:
            await log_system_event(
                event_type="STRIPE_PAYMENT_METHOD_DETACH_ERROR",
                details={
                    "payment_method_id": payment_method_id,
                    "error": str(e),
                    "error_type": e.error_type
                }
            )

            return {
                "success": False,
                "error": str(e),
                "error_type": e.error_type,
                "error_code": "STRIPE_PAYMENT_METHOD_DETACH_ERROR"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "error_code": "SYSTEM_ERROR"
            }

    async def get_billing_history(
        self,
        customer_id: str,
        limit: int = 12
    ) -> List[Dict[str, Any]]:
        """Get billing history for customer"""
        try:
            invoices = stripe.Invoice.list(
                customer=customer_id,
                limit=limit,
                order="desc"
            )

            history = []
            for invoice in invoices.data:
                history.append({
                    "id": invoice.id,
                    "created": invoice.created,
                    "status": invoice.status,
                    "amount": invoice.total / 100,  # Convert from cents
                    "currency": invoice.currency.upper(),
                    "description": invoice.description,
                    "due_date": invoice.due_date,
                    "paid_at": invoice.status_transitions.get("finalized_at") if invoice.status_transitions else None,
                    "receipt_url": invoice.hosted_invoice_url,
                    "invoice_url": invoice.invoice_pdf,
                    "payment_intent": invoice.payment_intent.id if invoice.payment_intent else None,
                    "subscription": invoice.subscription.id if invoice.subscription else None,
                    "metadata": invoice.metadata
                })

            return history

        except stripe.error.StripeError as e:
            await log_system_event(
                event_type="STRIPE_BILLING_HISTORY_ERROR",
                details={
                    "customer_id": customer_id,
                    "limit": limit,
                    "error": str(e),
                    "error_type": e.error_type
                }
            )
            return []
        except Exception as e:
            return []

    async def create_payment_intent(
        self,
        customer_id: str,
        amount: int,
        currency: str = "inr",
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create payment intent for one-time payment"""
        try:
            payment_intent_data = {
                "customer": customer_id,
                "amount": amount,  # Amount in cents
                "currency": currency,
                "description": description or "Lurk one-time payment",
                "metadata": {
                    "app_source": "lurk_api"
                },
                "automatic_payment_methods": {
                    "enabled": True,
                    "allow_redirects": "never"
                }
            }

            payment_intent = stripe.PaymentIntent.create(**payment_intent_data)

            await log_system_event(
                event_type="STRIPE_PAYMENT_INTENT_CREATED",
                details={
                    "payment_intent_id": payment_intent.id,
                    "customer_id": customer_id,
                    "amount": amount,
                    "currency": currency,
                    "status": payment_intent.status
                }
            )

            return {
                "success": True,
                "payment_intent_id": payment_intent.id,
                "client_secret": payment_intent.client_secret,
                "amount": amount / 100,
                "currency": currency,
                "status": payment_intent.status
            }

        except stripe.error.StripeError as e:
            await log_system_event(
                event_type="STRIPE_PAYMENT_INTENT_CREATE_ERROR",
                details={
                    "customer_id": customer_id,
                    "amount": amount,
                    "error": str(e),
                    "error_type": e.error_type
                }
            )

            return {
                "success": False,
                "error": str(e),
                "error_type": e.error_type,
                "error_code": "STRIPE_PAYMENT_INTENT_ERROR"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "error_code": "SYSTEM_ERROR"
            }

    async def handle_webhook(self, webhook_data: Dict[str, Any], stripe_signature: str) -> Dict[str, Any]:
        """Handle Stripe webhook events"""
        try:
            # Verify webhook signature
            event = stripe.Webhook.construct_event(
                webhook_data, stripe_signature, STRIPE_WEBHOOK_SECRET
            )

            # Get event type handler
            handler = self.webhook_handlers.get(event.type)
            if handler:
                result = await handler(event)
                return {
                    "success": True,
                    "processed": True,
                    "event_type": event.type,
                    "result": result
                }
            else:
                return {
                    "success": True,
                    "processed": False,
                    "event_type": event.type,
                    "message": f"No handler for event type: {event.type}"
                }

        except stripe.error.SignatureVerificationError:
            await log_system_event(
                event_type="STRIPE_WEBHOOK_SIGNATURE_ERROR",
                details={
                    "error": "Invalid signature"
                }
            )

            return {
                "success": False,
                "error": "Invalid webhook signature",
                "error_code": "SIGNATURE_ERROR"
            }
        except Exception as e:
            await log_system_event(
                event_type="STRIPE_WEBHOOK_PROCESSING_ERROR",
                details={
                    "error": str(e),
                    "event_type": webhook_data.get("type", "unknown")
                }
            )

            return {
                "success": False,
                "error": str(e),
                "error_code": "WEBHOOK_PROCESSING_ERROR"
            }

    # Webhook event handlers

    async def _handle_subscription_created(self, event: stripe.Event) -> Dict[str, Any]:
        """Handle customer.subscription.created event"""
        subscription = event.data.object

        await log_system_event(
            event_type="STRIPE_WEBHOOK_SUBSCRIPTION_CREATED",
            details={
                "subscription_id": subscription.id,
                "customer_id": subscription.customer,
                "status": subscription.status,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "items": [
                    {
                        "price_id": item.price.id,
                        "quantity": item.quantity,
                        "amount": item.price.unit_amount / 100
                    }
                    for item in subscription.get('items', {}).get('data', [])
                ]
            }
        )

        return {
            "processed": True,
            "action": "subscription_created"
        }

    async def _handle_subscription_updated(self, event: stripe.Event) -> Dict[str, Any]:
        """Handle customer.subscription.updated event"""
        subscription = event.data.object

        await log_system_event(
            event_type="STRIPE_WEBHOOK_SUBSCRIPTION_UPDATED",
            details={
                "subscription_id": subscription.id,
                "customer_id": subscription.customer,
                "status": subscription.status,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "cancel_at_period_end": subscription.cancel_at_period_end
            }
        )

        return {
            "processed": True,
            "action": "subscription_updated"
        }

    async def _handle_subscription_deleted(self, event: stripe.Event) -> Dict[str, Any]:
        """Handle customer.subscription.deleted event"""
        subscription = event.data.object

        await log_system_event(
            event_type="STRIPE_WEBHOOK_SUBSCRIPTION_DELETED",
            details={
                "subscription_id": subscription.id,
                "customer_id": subscription.customer,
                "canceled_at": subscription.canceled_at
            }
        )

        return {
            "processed": True,
            "action": "subscription_deleted"
        }

    async def _handle_payment_succeeded(self, event: stripe.Event) -> Dict[str, Any]:
        """Handle invoice.payment_succeeded event"""
        invoice = event.data.object

        await log_system_event(
            event_type="STRIPE_WEBHOOK_PAYMENT_SUCCEEDED",
            details={
                "invoice_id": invoice.id,
                "customer_id": invoice.customer,
                "subscription_id": invoice.subscription,
                "amount": invoice.total / 100,
                "currency": invoice.currency,
                "paid_at": invoice.status_transitions.get("paid_at")
            }
        )

        return {
            "processed": True,
            "action": "payment_succeeded"
        }

    async def _handle_payment_failed(self, event: stripe.Event) -> Dict[str, Any]:
        """Handle invoice.payment_failed event"""
        invoice = event.data.object

        await log_system_event(
            event_type="STRIPE_WEBHOOK_PAYMENT_FAILED",
            details={
                "invoice_id": invoice.id,
                "customer_id": invoice.customer,
                "subscription_id": invoice.subscription,
                "amount": invoice.total / 100,
                "currency": invoice.currency,
                "attempt_count": invoice.attempt_count,
                "next_payment_attempt": invoice.next_payment_attempt
            }
        )

        return {
            "processed": True,
            "action": "payment_failed"
        }

    async def _handle_invoice_finalized(self, event: stripe.Event) -> Dict[str, Any]:
        """Handle invoice.finalized event"""
        invoice = event.data.object

        await log_system_event(
            event_type="STRIPE_WEBHOOK_INVOICE_FINALIZED",
            details={
                "invoice_id": invoice.id,
                "customer_id": invoice.customer,
                "subscription_id": invoice.subscription,
                "amount": invoice.total / 100,
                "currency": invoice.currency,
                "due_date": invoice.due_date
            }
        )

        return {
            "processed": True,
            "action": "invoice_finalized"
        }

    async def _handle_payment_method_attached(self, event: stripe.Event) -> Dict[str, Any]:
        """Handle payment_method.attached event"""
        payment_method = event.data.object

        await log_system_event(
            event_type="STRIPE_WEBHOOK_PAYMENT_METHOD_ATTACHED",
            details={
                "payment_method_id": payment_method.id,
                "customer_id": payment_method.customer,
                "type": payment_method.type
            }
        )

        return {
            "processed": True,
            "action": "payment_method_attached"
        }

    async def _handle_payment_method_updated(self, event: stripe.Event) -> Dict[str, Any]:
        """Handle payment_method.card_updated event"""
        payment_method = event.data.object

        await log_system_event(
            event_type="STRIPE_WEBHOOK_PAYMENT_METHOD_UPDATED",
            details={
                "payment_method_id": payment_method.id,
                "customer_id": payment_method.customer
            }
        )

        return {
            "processed": True,
            "action": "payment_method_updated"
        }

    async def _handle_payment_method_detached(self, event: stripe.Event) -> Dict[str, Any]:
        """Handle payment_method.detached event"""
        payment_method = event.data.object

        await log_system_event(
            event_type="STRIPE_WEBHOOK_PAYMENT_METHOD_DETACHED",
            details={
                "payment_method_id": payment_method.id,
                "customer_id": payment_method.customer
            }
        )

        return {
            "processed": True,
            "action": "payment_method_detached"
        }


# Global Stripe service instance
stripe_service = StripeService()

# Convenience functions
async def create_stripe_customer(user: User) -> Dict[str, Any]:
    """Convenience function for creating Stripe customer"""
    return await stripe_service.create_customer(user)

async def create_stripe_subscription(
    user: User,
    tier: str,
    payment_method_id: str,
    pricing: Dict[str, Any]
) -> Dict[str, Any]:
    """Convenience function for creating Stripe subscription"""
    return await stripe_service.create_subscription(user, tier, payment_method_id, pricing)

async def handle_stripe_webhook(webhook_data: Dict[str, Any], stripe_signature: str) -> Dict[str, Any]:
    """Convenience function for handling Stripe webhook"""
    return await stripe_service.handle_webhook(webhook_data, stripe_signature)