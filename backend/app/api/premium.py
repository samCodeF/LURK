"""
Premium API endpoints for Lurk - Subscription and Premium Features
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from decimal import Decimal

from app.database import get_db
from app.services.auth_service import auth_service, get_current_user
from app.services.stripe_service import StripeService
from app.models.user import User, SubscriptionTier
from app.models.credit_card import CreditCard
from app.models.payment import Payment, PaymentStatus
from app.models.bank_bounty import BankBounty, BountyType, BountyStatus
from app.utils.notifications import send_subscription_upgrade_email
from app.utils.audit import log_user_action

router = APIRouter()
stripe_service = StripeService()

# Subscription Management

@router.get("/subscription", response_model=Dict[str, Any])
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current subscription status and details"""
    try:
        # Calculate subscription metrics
        total_saved = db.query(func.sum(Payment.interest_saved + Payment.late_fee_prevented)).filter(
            and_(
                Payment.user_id == current_user.id,
                Payment.status == PaymentStatus.COMPLETED,
                Payment.created_at >= datetime.now(timezone.utc) - timedelta(days=30)
            )
        ).scalar() or 0

        active_cards = db.query(func.count(CreditCard.id)).filter(
            and_(
                CreditCard.user_id == current_user.id,
                CreditCard.auto_payment_enabled == True
            )
        ).scalar() or 0

        total_cards = db.query(func.count(CreditCard.id)).filter(
            CreditCard.user_id == current_user.id
        ).scalar() or 0

        # Calculate current period stats
        current_period_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        payments_this_month = db.query(func.count(Payment.id)).filter(
            and_(
                Payment.user_id == current_user.id,
                Payment.status == PaymentStatus.COMPLETED,
                Payment.created_at >= current_period_start
            )
        ).scalar() or 0

        # Get next billing date
        next_billing_date = current_user.subscription_expires or (current_period_start + timedelta(days=30))

        # Get available features for current tier
        current_features = _get_tier_features(current_user.subscription_tier)
        next_tier_features = _get_next_tier_features(current_user.subscription_tier)

        return {
            "current_tier": current_user.subscription_tier.value,
            "subscription_expires": current_user.subscription_expires.isoformat() if current_user.subscription_expires else None,
            "is_active": current_user.subscription_tier != SubscriptionTier.FREE,
            "next_billing_date": next_billing_date.isoformat(),
            "current_period": {
                "start": current_period_start.isoformat(),
                "end": (current_period_start + timedelta(days=30) - timedelta(seconds=1)).isoformat()
            },
            "usage_metrics": {
                "total_saved_month": round(float(total_saved), 2),
                "active_cards": active_cards,
                "total_cards": total_cards,
                "payments_processed_month": payments_this_month
            },
            "current_features": current_features,
            "upgrade_available": current_user.subscription_tier != SubscriptionTier.PLATINUM,
            "next_tier": _get_next_tier(current_user.subscription_tier).value if current_user.subscription_tier != SubscriptionTier.PLATINUM else None,
            "next_tier_features": next_tier_features,
            "stripe_customer_id": current_user.stripe_customer_id
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve subscription status"
        )

@router.post("/upgrade", response_model=Dict[str, Any])
async def upgrade_subscription(
    tier: str = Query(..., regex="^(silver|gold|platinum)$"),
    payment_method_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upgrade subscription tier"""
    try:
        # Validate tier
        new_tier = SubscriptionTier(tier)

        # Check if upgrade is valid
        if not _is_valid_upgrade(current_user.subscription_tier, new_tier):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid upgrade path"
            )

        # Get pricing for new tier
        tier_pricing = _get_tier_pricing(new_tier)

        # Create Stripe subscription
        stripe_result = await stripe_service.create_subscription(
            current_user,
            new_tier,
            payment_method_id,
            tier_pricing
        )

        if not stripe_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=stripe_result.get("message", "Failed to create subscription"),
                headers={"X-Stripe-Error": stripe_result.get("error_code", "STRIPE_ERROR")}
            )

        # Update user subscription
        current_user.subscription_tier = new_tier
        current_user.subscription_expires = datetime.now(timezone.utc) + timedelta(days=30)
        current_user.stripe_customer_id = stripe_result.get("customer_id")
        db.commit()

        # Log subscription upgrade
        await log_user_action(
            user_id=str(current_user.id),
            action="SUBSCRIPTION_UPGRADED",
            ip_address=None,
            details={
                "previous_tier": current_user.subscription_tier.value,
                "new_tier": new_tier.value,
                "price_id": stripe_result.get("price_id"),
                "subscription_id": stripe_result.get("subscription_id")
            }
        )

        # Send confirmation email
        await send_subscription_upgrade_email(
            current_user.email,
            current_user.first_name or "User",
            new_tier.value,
            tier_pricing["price"],
            stripe_result.get("subscription_id")
        )

        return {
            "success": True,
            "message": f"Successfully upgraded to {tier} tier",
            "new_tier": new_tier.value,
            "subscription_id": stripe_result.get("subscription_id"),
            "next_billing_date": current_user.subscription_expires.isoformat(),
            "features": _get_tier_features(new_tier),
            "client_secret": stripe_result.get("client_secret")  # For payment confirmation
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upgrade subscription"
        )

@router.post("/downgrade")
async def downgrade_subscription(
    tier: str = Query(..., regex="^(free|silver|gold)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Downgrade subscription tier"""
    try:
        # Validate tier
        new_tier = SubscriptionTier(tier)

        # Check if downgrade is valid
        if not _is_valid_downgrade(current_user.subscription_tier, new_tier):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid downgrade path"
            )

        # Cancel current Stripe subscription
        if current_user.stripe_customer_id:
            stripe_result = await stripe_service.cancel_subscription(current_user.stripe_customer_id)

            if not stripe_result["success"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=stripe_result.get("message", "Failed to cancel current subscription")
                )

        # Update user subscription (effective at end of current period)
        current_period_end = current_user.subscription_expires or datetime.now(timezone.utc)

        # For immediate downgrade to free tier
        if new_tier == SubscriptionTier.FREE:
            current_user.subscription_tier = new_tier
            current_user.subscription_expires = None
        else:
            # Schedule downgrade for end of current period
            # In production, this would be handled by webhooks
            pass

        db.commit()

        # Log subscription downgrade
        await log_user_action(
            user_id=str(current_user.id),
            action="SUBSCRIPTION_DOWNGRADED",
            ip_address=None,
            details={
                "previous_tier": current_user.subscription_tier.value,
                "new_tier": new_tier.value,
                "effective_date": current_period_end.isoformat()
            }
        )

        return {
            "success": True,
            "message": f"Subscription will downgrade to {tier} at end of current period",
            "current_tier": current_user.subscription_tier.value,
            "new_tier": new_tier.value,
            "effective_date": current_period_end.isoformat(),
            "remaining_days": (current_period_end - datetime.now(timezone.utc)).days
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to downgrade subscription"
        )

@router.post("/cancel")
async def cancel_subscription(
    reason: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel subscription (move to free tier)"""
    try:
        # Cancel Stripe subscription
        stripe_result = None
        if current_user.stripe_customer_id:
            stripe_result = await stripe_service.cancel_subscription(current_user.stripe_customer_id)

            if not stripe_result["success"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=stripe_result.get("message", "Failed to cancel subscription")
                )

        # Update user subscription
        current_user.subscription_tier = SubscriptionTier.FREE
        current_user.subscription_expires = None

        db.commit()

        # Log subscription cancellation
        await log_user_action(
            user_id=str(current_user.id),
            action="SUBSCRIPTION_CANCELLED",
            ip_address=None,
            details={
                "previous_tier": current_user.subscription_tier.value,
                "reason": reason,
                "stripe_cancellation_id": stripe_result.get("cancellation_id") if stripe_result else None
            }
        )

        return {
            "success": True,
            "message": "Subscription cancelled successfully",
            "previous_tier": current_user.subscription_tier.value,
            "effective_immediately": True,
            "retained_features": _get_free_tier_features(),
            "can_reactivate": True
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )

@router.get("/pricing", response_model=Dict[str, Any])
async def get_pricing_plans(
    current_user: User = Depends(get_current_user)
):
    """Get available pricing plans"""
    try:
        plans = []

        for tier in [SubscriptionTier.FREE, SubscriptionTier.SILVER, SubscriptionTier.GOLD, SubscriptionTier.PLATINUM]:
            pricing = _get_tier_pricing(tier)
            features = _get_tier_features(tier)

            plans.append({
                "tier": tier.value,
                "name": _get_tier_display_name(tier),
                "price": pricing["price"],
                "currency": pricing["currency"],
                "billing_period": pricing["billing_period"],
                "features": features,
                "popular": tier == SubscriptionTier.GOLD,
                "current": tier == current_user.subscription_tier,
                "upgrade_discount": _calculate_upgrade_discount(current_user.subscription_tier, tier)
            })

        return {
            "plans": plans,
            "current_tier": current_user.subscription_tier.value,
            "recommended_plan": _get_recommended_plan(current_user),
            "annual_discount": 20,  # 20% discount for annual plans
            "currency": "INR",
            "billing_cycles": ["monthly", "annual"]
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve pricing plans"
        )

# Premium Features

@router.get("/ai-assistant", response_model=Dict[str, Any])
async def get_ai_assistant_insights(
    current_user: User = Depends(get_premium_user),  # Premium feature
    db: Session = Depends(get_db)
):
    """Get AI-powered financial insights"""
    try:
        # Get user's data for analysis
        cards = db.query(CreditCard).filter(CreditCard.user_id == current_user.id).all()
        payments = db.query(Payment).filter(
            and_(
                Payment.user_id == current_user.id,
                Payment.status == PaymentStatus.COMPLETED,
                Payment.created_at >= datetime.now(timezone.utc) - timedelta(days=90)
            )
        ).all()

        bounties = db.query(BankBounty).filter(
            and_(
                BankBounty.user_id == current_user.id,
                BankBounty.status == BountyStatus.PAID
            )
        ).all()

        # Generate AI insights
        insights = await _generate_premium_insights(cards, payments, bounties)

        return {
            "insights": insights,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "data_period_days": 90,
            "confidence_score": _calculate_insights_confidence(cards, payments, bounties)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI insights"
        )

@router.get("/exclusive-offers", response_model=List[Dict[str, Any]])
async def get_exclusive_offers(
    current_user: User = Depends(get_premium_user),  # Premium feature
    db: Session = Depends(get_db)
):
    """Get exclusive offers for premium users"""
    try:
        # Generate personalized offers based on user profile
        offers = await _generate_personalized_offers(current_user, db)

        return offers

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve exclusive offers"
        )

@router.get("/enhanced-analytics", response_model=Dict[str, Any])
async def get_enhanced_analytics(
    months: int = Query(12, ge=1, le=24),
    current_user: User = Depends(get_premium_user),  # Premium feature
    db: Session = Depends(get_db)
):
    """Get enhanced analytics for premium users"""
    try:
        # Get comprehensive analytics data
        analytics_data = await _get_premium_analytics(current_user, db, months)

        return analytics_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve enhanced analytics"
        )

@router.post("/feature-flags")
async def update_feature_flags(
    feature_flags: Dict[str, bool],
    current_user: User = Depends(get_premium_user),  # Premium feature
    db: Session = Depends(get_db)
):
    """Update user feature flags (beta features)"""
    try:
        # Validate feature flags
        valid_flags = _get_valid_feature_flags()
        user_flags = {}

        for flag, value in feature_flags.items():
            if flag in valid_flags:
                user_flags[flag] = value

        # Update user's feature flags
        if current_user.feature_flags:
            existing_flags = json.loads(current_user.feature_flags)
            existing_flags.update(user_flags)
            current_user.feature_flags = json.dumps(existing_flags)
        else:
            current_user.feature_flags = json.dumps(user_flags)

        db.commit()

        # Log feature flag updates
        await log_user_action(
            user_id=str(current_user.id),
            action="FEATURE_FLAGS_UPDATED",
            ip_address=None,
            details={
                "updated_flags": user_flags,
                "total_flags": len(existing_flags) if current_user.feature_flags else len(user_flags)
            }
        )

        return {
            "success": True,
            "message": "Feature flags updated successfully",
            "updated_flags": user_flags,
            "all_flags": json.loads(current_user.feature_flags) if current_user.feature_flags else {}
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update feature flags"
        )

# Billing and Payment Methods

@router.get("/billing/history")
async def get_billing_history(
    limit: int = Query(12, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get billing and payment history"""
    try:
        billing_history = []

        if current_user.stripe_customer_id:
            # Get billing history from Stripe
            stripe_history = await stripe_service.get_billing_history(current_user.stripe_customer_id, limit)

            for item in stripe_history:
                billing_history.append({
                    "id": item.get("id"),
                    "date": item.get("created"),
                    "amount": item.get("amount") / 100,  # Convert from cents
                    "currency": item.get("currency"),
                    "status": item.get("status"),
                    "description": item.get("description"),
                    "type": item.get("type"),  # charge, refund, etc.
                    "receipt_url": item.get("receipt_url")
                })

        return {
            "billing_history": billing_history,
            "total_items": len(billing_history)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve billing history"
        )

@router.get("/payment-methods")
async def get_payment_methods(
    current_user: User = Depends(get_current_user)
):
    """Get saved payment methods"""
    try:
        payment_methods = []

        if current_user.stripe_customer_id:
            # Get payment methods from Stripe
            stripe_methods = await stripe_service.get_payment_methods(current_user.stripe_customer_id)

            for method in stripe_methods:
                payment_methods.append({
                    "id": method.get("id"),
                    "type": method.get("type"),
                    "last4": method.get("last4"),
                    "brand": method.get("brand"),
                    "expiry_month": method.get("exp_month"),
                    "expiry_year": method.get("exp_year"),
                    "is_default": method.get("is_default"),
                    "created_at": method.get("created")
                })

        return {
            "payment_methods": payment_methods,
            "has_methods": len(payment_methods) > 0
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve payment methods"
        )

@router.post("/payment-methods")
async def add_payment_method(
    payment_method_token: str,
    set_as_default: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add new payment method"""
    try:
        # Create Stripe customer if not exists
        if not current_user.stripe_customer_id:
            customer_result = await stripe_service.create_customer(current_user)
            if not customer_result["success"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to create payment customer"
                )

            current_user.stripe_customer_id = customer_result.get("customer_id")
            db.commit()

        # Add payment method to Stripe
        stripe_result = await stripe_service.add_payment_method(
            current_user.stripe_customer_id,
            payment_method_token,
            set_as_default
        )

        if not stripe_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=stripe_result.get("message", "Failed to add payment method")
            )

        # Log payment method addition
        await log_user_action(
            user_id=str(current_user.id),
            action="PAYMENT_METHOD_ADDED",
            ip_address=None,
            details={
                "method_id": stripe_result.get("method_id"),
                "set_as_default": set_as_default
            }
        )

        return {
            "success": True,
            "message": "Payment method added successfully",
            "method_id": stripe_result.get("method_id")
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add payment method"
        )

# Helper functions

def _get_tier_features(tier: SubscriptionTier) -> Dict[str, Any]:
    """Get features available for subscription tier"""
    features = {
        SubscriptionTier.FREE: {
            "max_cards": 1,
            "automatic_payments": True,
            "payment_reminders": True,
            "basic_analytics": True,
            "ai_insights": False,
            "credit_monitoring": False,
            "priority_support": False,
            "exclusive_offers": False,
            "enhanced_analytics": False,
            "api_access": False
        },
        SubscriptionTier.SILVER: {
            "max_cards": 3,
            "automatic_payments": True,
            "payment_reminders": True,
            "basic_analytics": True,
            "ai_insights": True,
            "credit_monitoring": True,
            "priority_support": False,
            "exclusive_offers": False,
            "enhanced_analytics": False,
            "api_access": False
        },
        SubscriptionTier.GOLD: {
            "max_cards": 5,
            "automatic_payments": True,
            "payment_reminders": True,
            "basic_analytics": True,
            "ai_insights": True,
            "credit_monitoring": True,
            "priority_support": True,
            "exclusive_offers": True,
            "enhanced_analytics": True,
            "api_access": True
        },
        SubscriptionTier.PLATINUM: {
            "max_cards": float('inf'),
            "automatic_payments": True,
            "payment_reminders": True,
            "basic_analytics": True,
            "ai_insights": True,
            "credit_monitoring": True,
            "priority_support": True,
            "exclusive_offers": True,
            "enhanced_analytics": True,
            "api_access": True,
            "unlimited_api_calls": True
        }
    }

    return features.get(tier, features[SubscriptionTier.FREE])

def _get_next_tier(current_tier: SubscriptionTier) -> SubscriptionTier:
    """Get next upgrade tier"""
    tier_order = [SubscriptionTier.FREE, SubscriptionTier.SILVER, SubscriptionTier.GOLD, SubscriptionTier.PLATINUM]
    current_index = tier_order.index(current_tier)

    if current_index < len(tier_order) - 1:
        return tier_order[current_index + 1]
    return current_tier  # Already at highest tier

def _get_next_tier_features(current_tier: SubscriptionTier) -> Dict[str, Any]:
    """Get features of next tier"""
    next_tier = _get_next_tier(current_tier)
    return _get_tier_features(next_tier)

def _get_tier_pricing(tier: SubscriptionTier) -> Dict[str, Any]:
    """Get pricing for subscription tier"""
    pricing = {
        SubscriptionTier.FREE: {"price": 0, "currency": "INR", "billing_period": "monthly"},
        SubscriptionTier.SILVER: {"price": 99, "currency": "INR", "billing_period": "monthly"},
        SubscriptionTier.GOLD: {"price": 299, "currency": "INR", "billing_period": "monthly"},
        SubscriptionTier.PLATINUM: {"price": 599, "currency": "INR", "billing_period": "monthly"}
    }

    return pricing.get(tier, pricing[SubscriptionTier.FREE])

def _get_tier_display_name(tier: SubscriptionTier) -> str:
    """Get display name for tier"""
    names = {
        SubscriptionTier.FREE: "Free",
        SubscriptionTier.SILVER: "Silver",
        SubscriptionTier.GOLD: "Gold",
        SubscriptionTier.PLATINUM: "Platinum"
    }
    return names.get(tier, "Free")

def _is_valid_upgrade(current_tier: SubscriptionTier, new_tier: SubscriptionTier) -> bool:
    """Check if upgrade path is valid"""
    tier_order = [SubscriptionTier.FREE, SubscriptionTier.SILVER, SubscriptionTier.GOLD, SubscriptionTier.PLATINUM]
    current_index = tier_order.index(current_tier)
    new_index = tier_order.index(new_tier)

    return new_index > current_index

def _is_valid_downgrade(current_tier: SubscriptionTier, new_tier: SubscriptionTier) -> bool:
    """Check if downgrade path is valid"""
    tier_order = [SubscriptionTier.FREE, SubscriptionTier.SILVER, SubscriptionTier.GOLD, SubscriptionTier.PLATINUM]
    current_index = tier_order.index(current_tier)
    new_index = tier_order.index(new_tier)

    return new_index < current_index

def _get_free_tier_features() -> Dict[str, Any]:
    """Get features available in free tier"""
    return _get_tier_features(SubscriptionTier.FREE)

def _calculate_upgrade_discount(current_tier: SubscriptionTier, new_tier: SubscriptionTier) -> int:
    """Calculate upgrade discount percentage"""
    # This would implement upgrade discount logic
    return 0

def _get_recommended_plan(user: User) -> SubscriptionTier:
    """Get recommended plan based on user usage"""
    # Simple logic - in production would use ML models
    if user.subscription_tier == SubscriptionTier.FREE:
        # Check user activity to recommend upgrade
        # For now, recommend Gold as middle tier
        return SubscriptionTier.GOLD
    elif user.subscription_tier == SubscriptionTier.SILVER:
        return SubscriptionTier.GOLD
    elif user.subscription_tier == SubscriptionTier.GOLD:
        return SubscriptionTier.PLATINUM
    else:
        return SubscriptionTier.PLATINUM

async def _generate_premium_insights(cards: List[CreditCard], payments: List[Payment], bounties: List[BankBounty]) -> List[Dict[str, Any]]:
    """Generate premium AI insights"""
    # This would integrate with the AI analytics service
    # For now, return sample insights
    return [
        {
            "type": "optimization",
            "title": "Payment Timing Optimization",
            "description": "Based on your spending patterns, we recommend setting payments 3 days before due date for maximum savings.",
            "potential_savings": 1500,
            "confidence": 85
        },
        {
            "type": "credit_building",
            "title": "Credit Score Improvement",
            "description": "Your payment history is excellent. Consider increasing your credit limit to improve utilization ratio.",
            "potential_score_increase": 45,
            "confidence": 92
        }
    ]

async def _generate_personalized_offers(user: User, db: Session) -> List[Dict[str, Any]]:
    """Generate personalized offers for user"""
    # This would integrate with bank partners
    return [
        {
            "id": "offer_1",
            "title": "15% cashback on dining",
            "description": "Get 15% cashback on all dining expenses this month",
            "partner": "Partner Bank",
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "terms": "Minimum spend of ₹2000 required",
            "type": "cashback"
        }
    ]

async def _get_premium_analytics(user: User, db: Session, months: int) -> Dict[str, Any]:
    """Get enhanced analytics for premium users"""
    # This would provide more detailed analytics
    return {
        "spending_forecast": {
            "next_month": 25000,
            "next_quarter": 75000,
            "confidence": 85
        },
        "credit_score_trend": {
            "current": 750,
            "projected_3_months": 780,
            "factors": ["payment_history", "credit_utilization"]
        },
        "optimization_opportunities": [
            {
                "type": "balance_transfer",
                "potential_savings": 5000,
                "description": "Transfer high-interest balance to 0% card"
            }
        ]
    }

def _get_valid_feature_flags() -> List[str]:
    """Get list of valid feature flags"""
    return [
        "beta_analytics",
        "enhanced_insights",
        "experimental_features",
        "early_access"
    ]

def _calculate_insights_confidence(cards: List[CreditCard], payments: List[Payment], bounties: List[BankBounty]) -> float:
    """Calculate confidence score for insights"""
    # Simple confidence calculation based on data availability
    confidence = 0

    if len(cards) > 0:
        confidence += 25
    if len(payments) > 5:
        confidence += 25
    if len(payments) > 20:
        confidence += 25
    if len(bounties) > 0:
        confidence += 25

    return min(100, confidence)