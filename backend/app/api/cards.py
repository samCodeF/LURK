"""
Credit Card API endpoints for Lurk - Credit Card Automation
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from decimal import Decimal

from app.database import get_db
from app.services.auth_service import auth_service, get_current_user, get_premium_user
from app.services.card_monitor import CardMonitorService
from app.services.payment_engine import PaymentEngine
from app.models.user import User, SubscriptionTier
from app.models.credit_card import (
    CreditCard, CreditCardCreate, CreditCardUpdate, CreditCardResponse,
    CardStatement, CardBalance, CardApiData, CardSyncResult,
    BankName, CardType, CardStatus, ApiStatus
)
from app.models.payment import Payment, PaymentType, PaymentStatus
from app.utils.notifications import (
    send_payment_reminder_email, send_payment_successful_sms,
    send_push_notification_payment_alert
)
from app.utils.audit import log_user_action
from app.utils.rate_limiter import RateLimiter

router = APIRouter()
card_monitor = CardMonitorService()
payment_engine = PaymentEngine()
rate_limiter = RateLimiter()

# Credit Card Management Endpoints

@router.get("/", response_model=List[CreditCardResponse])
async def get_user_cards(
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None),
    bank_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get user's credit cards"""
    try:
        # Build query
        query = db.query(CreditCard).filter(CreditCard.user_id == current_user.id)

        # Apply filters
        if status_filter:
            query = query.filter(CreditCard.card_status == status_filter)
        if bank_filter:
            query = query.filter(CreditCard.bank_name == bank_filter)

        # Apply pagination
        cards = query.offset(skip).limit(limit).all()

        # Log card listing
        await log_user_action(
            user_id=str(current_user.id),
            action="CARDS_LISTED",
            ip_address=None,
            details={
                "card_count": len(cards),
                "filters": {"status": status_filter, "bank": bank_filter}
            }
        )

        return [CreditCardResponse.from_orm(card) for card in cards]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve credit cards"
        )

@router.post("/", response_model=CreditCardResponse)
async def add_credit_card(
    card_data: CreditCardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add new credit card"""
    try:
        # Check card limits based on subscription
        await check_card_limits(current_user, db)

        # Check if card already exists
        existing_card = db.query(CreditCard).filter(
            and_(
                CreditCard.user_id == current_user.id,
                CreditCard.card_last4 == card_data.card_last4,
                CreditCard.bank_name == card_data.bank_name
            )
        ).first()

        if existing_card:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This card is already added to your account"
            )

        # Create new card record
        new_card = CreditCard(
            user_id=current_user.id,
            card_token=card_data.card_token,  # Tokenized from payment gateway
            card_last4=card_data.card_last4,
            card_brand=card_data.card_brand,
            card_name=card_data.card_name,
            bank_name=card_data.bank_name,
            expiry_month=card_data.expiry_month,
            expiry_year=card_data.expiry_year,
            billing_cycle_day=card_data.billing_cycle_day,
            due_date=card_data.due_date,
            credit_limit=Decimal(str(card_data.credit_limit)) if card_data.credit_limit else None,
            auto_payment_enabled=card_data.auto_payment_enabled,
            card_status=CardStatus.PENDING_VERIFICATION,
            api_status=ApiStatus.PENDING,
            minimum_due_percent=Decimal("5.0"),  # Default 5%
            late_fee_amount=Decimal("500.00"),  # Default late fee
            interest_rate=Decimal("42.0")  # Default interest rate
        )

        db.add(new_card)
        db.commit()
        db.refresh(new_card)

        # Log card addition
        await log_user_action(
            user_id=str(current_user.id),
            action="CARD_ADDED",
            ip_address=None,
            details={
                "card_last4": card_data.card_last4,
                "bank_name": card_data.bank_name,
                "card_brand": card_data.card_brand,
                "auto_payment_enabled": card_data.auto_payment_enabled
            }
        )

        return CreditCardResponse.from_orm(new_card)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add credit card"
        )

@router.get("/{card_id}", response_model=CreditCardResponse)
async def get_credit_card(
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific credit card details"""
    try:
        card = db.query(CreditCard).filter(
            and_(
                CreditCard.id == card_id,
                CreditCard.user_id == current_user.id
            )
        ).first()

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credit card not found"
            )

        return CreditCardResponse.from_orm(card)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve credit card"
        )

@router.put("/{card_id}", response_model=CreditCardResponse)
async def update_credit_card(
    card_id: str,
    card_data: CreditCardUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update credit card details"""
    try:
        card = db.query(CreditCard).filter(
            and_(
                CreditCard.id == card_id,
                CreditCard.user_id == current_user.id
            )
        ).first()

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credit card not found"
            )

        # Update fields
        update_data = card_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(card, field, value)

        card.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(card)

        # Log card update
        await log_user_action(
            user_id=str(current_user.id),
            action="CARD_UPDATED",
            ip_address=None,
            details={
                "card_id": card_id,
                "updated_fields": list(update_data.keys())
            }
        )

        return CreditCardResponse.from_orm(card)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update credit card"
        )

@router.delete("/{card_id}")
async def delete_credit_card(
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete credit card"""
    try:
        card = db.query(CreditCard).filter(
            and_(
                CreditCard.id == card_id,
                CreditCard.user_id == current_user.id
            )
        ).first()

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credit card not found"
            )

        # Check if there are pending payments
        pending_payments = db.query(Payment).filter(
            and_(
                Payment.card_id == card_id,
                Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.PROCESSING])
            )
        ).count()

        if pending_payments > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete card with pending payments"
            )

        # Store card info for logging
        card_info = {
            "card_last4": card.card_last4,
            "bank_name": card.bank_name,
            "card_brand": card.card_brand
        }

        # Delete card
        db.delete(card)
        db.commit()

        # Log card deletion
        await log_user_action(
            user_id=str(current_user.id),
            action="CARD_REMOVED",
            ip_address=None,
            details=card_info
        )

        return {"message": "Credit card deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete credit card"
        )

# Card Synchronization and Statement

@router.post("/{card_id}/sync", response_model=CardSyncResult)
async def sync_credit_card(
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync credit card with bank API"""
    try:
        card = db.query(CreditCard).filter(
            and_(
                CreditCard.id == card_id,
                CreditCard.user_id == current_user.id
            )
        ).first()

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credit card not found"
            )

        # Check rate limiting for sync operations
        if await rate_limiter.check_api_calls(str(current_user.id), current_user.subscription_tier.value):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many sync attempts. Please try again later."
            )

        # Sync with bank API
        sync_result = await card_monitor.sync_card(card, db)

        # Update card status
        card.api_status = ApiStatus.CONNECTED if sync_result.success else ApiStatus.ERROR
        card.last_sync = datetime.now(timezone.utc) if sync_result.success else None
        card.sync_error = None if sync_result.success else sync_result.error_code

        if sync_result.data:
            card.current_balance = Decimal(str(sync_result.data["current_balance"]))
            card.minimum_due = Decimal(str(sync_result.data["minimum_amount"]))
            card.total_due = Decimal(str(sync_result.data["total_amount"]))
            card.payment_due_date = sync_result.data["due_date"]
            card.available_credit = Decimal(str(sync_result.data["available_credit"]))

        db.commit()

        # Log sync operation
        await log_user_action(
            user_id=str(current_user.id),
            action="CARD_SYNCED",
            ip_address=None,
            details={
                "card_id": card_id,
                "success": sync_result.success,
                "error": sync_result.error_code,
                "has_data": sync_result.data is not None
            }
        )

        return CardSyncResult(
            card_id=card_id,
            success=sync_result.success,
            message=sync_result.message,
            data=sync_result.data,
            error_code=sync_result.error_code
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync credit card"
        )

@router.get("/{card_id}/statement", response_model=CardStatement)
async def get_card_statement(
    card_id: str,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2030),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get credit card statement"""
    try:
        card = db.query(CreditCard).filter(
            and_(
                CreditCard.id == card_id,
                CreditCard.user_id == current_user.id
            )
        ).first()

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credit card not found"
            )

        # Get statement data from bank API
        statement = await card_monitor.get_statement(card, month, year)

        if not statement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Statement not available"
            )

        # Log statement access
        await log_user_action(
            user_id=str(current_user.id),
            action="STATEMENT_ACCESSED",
            ip_address=None,
            details={
                "card_id": card_id,
                "month": month,
                "year": year
            }
        )

        return CardStatement(**statement)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve card statement"
        )

@router.get("/{card_id}/balance", response_model=CardBalance)
async def get_card_balance(
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current card balance and utilization"""
    try:
        card = db.query(CreditCard).filter(
            and_(
                CreditCard.id == card_id,
                CreditCard.user_id == current_user.id
            )
        ).first()

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credit card not found"
            )

        # Get real-time balance from bank API
        balance_data = await card_monitor.get_balance(card)

        # Calculate utilization
        utilization_percent = 0
        if balance_data["credit_limit"] > 0:
            utilization_percent = (balance_data["current_balance"] / balance_data["credit_limit"]) * 100

        return CardBalance(
            current_balance=balance_data["current_balance"],
            available_credit=balance_data["available_credit"],
            credit_limit=balance_data["credit_limit"],
            utilization_percent=round(utilization_percent, 2),
            minimum_due=balance_data["minimum_due"],
            payment_due_date=balance_data["payment_due_date"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve card balance"
        )

# Card Automation Settings

@router.post("/{card_id}/enable-automation")
async def enable_card_automation(
    card_id: str,
    payment_preference: str = Query("minimum_due", regex="^(minimum_due|full_amount|custom)$"),
    custom_amount: Optional[float] = Query(None),
    buffer_hours: int = Query(24, ge=1, le=72),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enable automatic payments for card"""
    try:
        card = db.query(CreditCard).filter(
            and_(
                CreditCard.id == card_id,
                CreditCard.user_id == current_user.id
            )
        ).first()

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credit card not found"
            )

        # Validate custom amount
        if payment_preference == "custom" and (not custom_amount or custom_amount <= 0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Custom payment amount must be greater than 0"
            )

        # Update automation settings
        card.auto_payment_enabled = True
        card.payment_preference = payment_preference
        card.custom_payment_amount = Decimal(str(custom_amount)) if custom_amount else None
        card.payment_buffer_hours = buffer_hours
        card.updated_at = datetime.now(timezone.utc)

        db.commit()

        # Log automation enable
        await log_user_action(
            user_id=str(current_user.id),
            action="AUTOMATION_ENABLED",
            ip_address=None,
            details={
                "card_id": card_id,
                "payment_preference": payment_preference,
                "custom_amount": custom_amount,
                "buffer_hours": buffer_hours
            }
        )

        return {
            "message": "Automatic payments enabled successfully",
            "card_id": card_id,
            "payment_preference": payment_preference,
            "custom_amount": custom_amount,
            "buffer_hours": buffer_hours
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to enable automation"
        )

@router.post("/{card_id}/disable-automation")
async def disable_card_automation(
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable automatic payments for card"""
    try:
        card = db.query(CreditCard).filter(
            and_(
                CreditCard.id == card_id,
                CreditCard.user_id == current_user.id
            )
        ).first()

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credit card not found"
            )

        # Cancel any pending scheduled payments
        await payment_engine.cancel_scheduled_payments(card_id)

        # Update automation settings
        card.auto_payment_enabled = False
        card.updated_at = datetime.now(timezone.utc)

        db.commit()

        # Log automation disable
        await log_user_action(
            user_id=str(current_user.id),
            action="AUTOMATION_DISABLED",
            ip_address=None,
            details={
                "card_id": card_id
            }
        )

        return {
            "message": "Automatic payments disabled successfully",
            "card_id": card_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable automation"
        )

# Helper functions

async def check_card_limits(user: User, db: Session):
    """Check if user can add more cards based on subscription"""
    current_cards = db.query(CreditCard).filter(CreditCard.user_id == user.id).count()

    card_limits = {
        SubscriptionTier.FREE: 1,
        SubscriptionTier.SILVER: 3,
        SubscriptionTier.GOLD: 5,
        SubscriptionTier.PLATINUM: float('inf')  # Unlimited
    }

    max_cards = card_limits.get(user.subscription_tier, 1)

    if current_cards >= max_cards:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Card limit reached ({max_cards}) for {user.subscription_tier.value} tier"
        )