"""
Payments API endpoints for Lurk - Credit Card Automation
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from decimal import Decimal

from app.database import get_db
from app.services.auth_service import auth_service, get_current_user, get_premium_user
from app.services.payment_engine import payment_engine
from app.services.card_monitor import card_monitor_service
from app.models.user import User
from app.models.credit_card import CreditCard
from app.models.payment import (
    Payment, PaymentCreate, PaymentUpdate, PaymentResponse,
    PaymentList, PaymentSummary, PaymentAnalytics,
    PaymentType, PaymentStatus, PaymentMethod,
    PaymentSchedule, PaymentScheduleCreate, PaymentScheduleResponse,
    AutomationSettings
)
from app.models.bank_bounty import BankBounty, BountyType, BountyStatus
from app.utils.notifications import (
    send_payment_reminder_email, send_payment_successful_sms,
    send_push_notification_payment_alert
)
from app.utils.audit import log_user_action
from app.utils.rate_limiter import RateLimiter

router = APIRouter()
rate_limiter = RateLimiter()

# Payment Operations

@router.post("/", response_model=PaymentResponse)
async def create_payment(
    payment_data: PaymentCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create/initiate payment for credit card"""
    try:
        # Get credit card
        card = db.query(CreditCard).filter(
            and_(
                CreditCard.id == payment_data.card_id,
                CreditCard.user_id == current_user.id
            )
        ).first()

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credit card not found"
            )

        # Check if payment is already being processed
        existing_payment = db.query(Payment).filter(
            and_(
                Payment.card_id == payment_data.card_id,
                Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.PROCESSING]),
                Payment.idempotency_key == payment_data.idempotency_key if payment_data.idempotency_key else None
            )
        ).first()

        if existing_payment:
            return PaymentResponse.from_orm(existing_payment)

        # Process payment
        payment_result = await payment_engine.process_minimum_payment(
            card,
            current_user,
            db,
            trigger_source="manual"
        )

        if not payment_result["success"]:
            error_code = payment_result.get("error_code", "PAYMENT_FAILED")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=payment_result.get("message", "Payment processing failed"),
                headers={"X-Error-Code": error_code}
            )

        # Get created payment
        payment = db.query(Payment).filter(
            Payment.id == payment_result["payment_id"]
        ).first()

        if not payment:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Payment created but not found"
            )

        # Schedule notification
        if payment.status == PaymentStatus.PENDING:
            background_tasks.add_task(
                schedule_payment_notifications,
                str(payment.id),
                str(current_user.id),
                str(card.id)
            )

        # Log payment creation
        await log_user_action(
            user_id=str(current_user.id),
            action="PAYMENT_CREATED",
            ip_address=None,
            details={
                "payment_id": str(payment.id),
                "card_id": str(card.id),
                "amount": float(payment.amount),
                "payment_type": payment.payment_type.value,
                "payment_method": payment.payment_method.value
            }
        )

        return PaymentResponse.from_orm(payment)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment processing failed"
        )

@router.get("/upcoming", response_model=List[PaymentResponse])
async def get_upcoming_payments(
    card_id: Optional[str] = Query(None),
    hours_ahead: int = Query(72, ge=1, le=168),  # 1 hour to 7 days
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get upcoming payments for user's cards"""
    try:
        # Calculate cutoff time
        cutoff_time = datetime.now(timezone.utc) + timedelta(hours=hours_ahead)

        # Build query
        query = db.query(Payment).filter(
            and_(
                Payment.user_id == current_user.id,
                Payment.scheduled_date <= cutoff_time,
                Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.SCHEDULED])
            )
        )

        if card_id:
            query = query.filter(Payment.card_id == card_id)

        # Order by scheduled date
        upcoming_payments = query.order_by(Payment.scheduled_date).all()

        return [PaymentResponse.from_orm(payment) for payment in upcoming_payments]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve upcoming payments"
        )

@router.get("/history", response_model=PaymentList)
async def get_payment_history(
    card_id: Optional[str] = Query(None),
    payment_type: Optional[PaymentType] = Query(None),
    status: Optional[PaymentStatus] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment history with filtering"""
    try:
        # Build query
        query = db.query(Payment).filter(Payment.user_id == current_user.id)

        # Apply filters
        if card_id:
            query = query.filter(Payment.card_id == card_id)

        if payment_type:
            query = query.filter(Payment.payment_type == payment_type)

        if status:
            query = query.filter(Payment.status == status)

        if start_date:
            query = query.filter(Payment.created_at >= start_date)

        if end_date:
            query = query.filter(Payment.created_at <= end_date)

        # Get total count for pagination
        total = query.count()

        # Apply pagination and ordering
        payments = query.order_by(desc(Payment.created_at)).offset(skip).limit(limit).all()

        payment_responses = [PaymentResponse.from_orm(payment) for payment in payments]

        return PaymentList(
            payments=payment_responses,
            total=total,
            page=skip // limit + 1,
            per_page=limit
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve payment history"
        )

@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific payment details"""
    try:
        payment = db.query(Payment).filter(
            and_(
                Payment.id == payment_id,
                Payment.user_id == current_user.id
            )
        ).first()

        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )

        return PaymentResponse.from_orm(payment)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve payment"
        )

@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: str,
    payment_update: PaymentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update payment (limited updates allowed)"""
    try:
        payment = db.query(Payment).filter(
            and_(
                Payment.id == payment_id,
                Payment.user_id == current_user.id
            )
        ).first()

        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )

        # Only allow certain updates on pending payments
        if payment.status not in [PaymentStatus.PENDING, PaymentStatus.SCHEDULED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot update processed payment"
            )

        # Apply allowed updates
        update_data = payment_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field in ["amount", "payment_method", "description"]:
                setattr(payment, field, value)

        db.commit()
        db.refresh(payment)

        # Log payment update
        await log_user_action(
            user_id=str(current_user.id),
            action="PAYMENT_UPDATED",
            ip_address=None,
            details={
                "payment_id": payment_id,
                "updated_fields": list(update_data.keys())
            }
        )

        return PaymentResponse.from_orm(payment)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update payment"
        )

@router.post("/{payment_id}/cancel")
async def cancel_payment(
    payment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel pending or scheduled payment"""
    try:
        payment = db.query(Payment).filter(
            and_(
                Payment.id == payment_id,
                Payment.user_id == current_user.id
            )
        ).first()

        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )

        if payment.status not in [PaymentStatus.PENDING, PaymentStatus.SCHEDULED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel processed payment"
            )

        # Update payment status
        payment.status = PaymentStatus.CANCELLED
        payment.completed_at = datetime.now(timezone.utc)
        db.commit()

        # Log payment cancellation
        await log_user_action(
            user_id=str(current_user.id),
            action="PAYMENT_CANCELLED",
            ip_address=None,
            details={
                "payment_id": payment_id,
                "original_amount": float(payment.amount),
                "payment_type": payment.payment_type.value
            }
        )

        return {"message": "Payment cancelled successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel payment"
        )

# Payment Scheduling

@router.post("/schedule", response_model=PaymentScheduleResponse)
async def schedule_payment(
    schedule_data: PaymentScheduleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Schedule payment for future date"""
    try:
        # Get credit card
        card = db.query(CreditCard).filter(
            and_(
                CreditCard.id == schedule_data.card_id,
                CreditCard.user_id == current_user.id
            )
        ).first()

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credit card not found"
            )

        # Validate scheduled date
        if schedule_data.scheduled_date <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scheduled date must be in the future"
            )

        # Validate amount
        if schedule_data.scheduled_amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scheduled amount must be greater than 0"
            )

        # Schedule payment
        schedule_result = await payment_engine.schedule_payment(
            card,
            current_user,
            schedule_data.scheduled_date,
            Decimal(str(schedule_data.scheduled_amount)),
            schedule_data.payment_type,
            db
        )

        if not schedule_result["success"]:
            error_code = schedule_result.get("error_code", "SCHEDULE_FAILED")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=schedule_result.get("message", "Payment scheduling failed"),
                headers={"X-Error-Code": error_code}
            )

        # Log payment scheduling
        await log_user_action(
            user_id=str(current_user.id),
            action="PAYMENT_SCHEDULED",
            ip_address=None,
            details={
                "card_id": str(card.id),
                "scheduled_date": schedule_data.scheduled_date.isoformat(),
                "scheduled_amount": float(schedule_data.scheduled_amount),
                "payment_type": schedule_data.payment_type.value,
                "is_recurring": schedule_data.is_recurring
            }
        )

        return {
            "id": schedule_result.get("schedule_id"),
            "card_id": str(card.id),
            "user_id": str(current_user.id),
            "scheduled_date": schedule_data.scheduled_date,
            "scheduled_amount": float(schedule_data.scheduled_amount),
            "payment_type": schedule_data.payment_type,
            "payment_method": "upi_autopay",
            "status": "scheduled",
            "is_recurring": schedule_data.is_recurring,
            "created_at": datetime.now(timezone.utc)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to schedule payment"
        )

@router.get("/scheduled", response_model=List[PaymentScheduleResponse])
async def get_scheduled_payments(
    card_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get scheduled payments for user"""
    try:
        # Get from database and Redis
        scheduled_payments = db.query(PaymentSchedule).filter(
            and_(
                PaymentSchedule.user_id == current_user.id,
                PaymentSchedule.status == "scheduled"
            )
        )

        if card_id:
            scheduled_payments = scheduled_payments.filter(PaymentSchedule.card_id == card_id)

        scheduled_payments = scheduled_payments.order_by(PaymentSchedule.scheduled_date).all()

        return [PaymentScheduleResponse.from_orm(schedule) for schedule in scheduled_payments]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve scheduled payments"
        )

@router.delete("/scheduled/{schedule_id}")
async def cancel_scheduled_payment(
    schedule_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel scheduled payment"""
    try:
        schedule = db.query(PaymentSchedule).filter(
            and_(
                PaymentSchedule.id == schedule_id,
                PaymentSchedule.user_id == current_user.id
            )
        ).first()

        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scheduled payment not found"
            )

        # Cancel schedule
        schedule.status = "cancelled"
        schedule.updated_at = datetime.now(timezone.utc)
        db.commit()

        # Remove from payment queue
        await payment_engine.cancel_scheduled_payments(schedule.card_id)

        # Log schedule cancellation
        await log_user_action(
            user_id=str(current_user.id),
            action="PAYMENT_SCHEDULE_CANCELLED",
            ip_address=None,
            details={
                "schedule_id": schedule_id,
                "card_id": str(schedule.card_id),
                "original_amount": float(schedule.scheduled_amount),
                "scheduled_date": schedule.scheduled_date.isoformat()
            }
        )

        return {"message": "Scheduled payment cancelled successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel scheduled payment"
        )

# Payment Analytics and Insights

@router.get("/summary", response_model=PaymentSummary)
async def get_payment_summary(
    card_id: Optional[str] = Query(None),
    months: int = Query(6, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment summary and savings"""
    try:
        # Calculate date range
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=months * 30)

        # Build query
        query = db.query(Payment).filter(
            and_(
                Payment.user_id == current_user.id,
                Payment.created_at >= start_date,
                Payment.created_at <= end_date,
                Payment.status == PaymentStatus.COMPLETED
            )
        )

        if card_id:
            query = query.filter(Payment.card_id == card_id)

        # Get payments
        payments = query.all()

        # Calculate summary metrics
        total_saved = sum(float(payment.interest_saved or 0) for payment in payments)
        total_fees_prevented = sum(float(payment.late_fee_prevented or 0) for payment in payments)
        total_amount_automated = sum(float(payment.amount) for payment in payments)
        total_payments = len(payments)

        # Success rate
        total_payment_attempts = db.query(Payment).filter(
            and_(
                Payment.user_id == current_user.id,
                Payment.created_at >= start_date,
                Payment.created_at <= end_date
            )
        ).count()

        success_rate = (total_payments / total_payment_attempts * 100) if total_payment_attempts > 0 else 0

        # Average monthly savings
        average_savings_per_month = total_saved / months if months > 0 else 0

        return PaymentSummary(
            total_saved=round(total_saved, 2),
            total_fees_prevented=round(total_fees_prevented, 2),
            total_payments=total_payments,
            total_amount_automated=round(total_amount_automated, 2),
            average_savings_per_month=round(average_savings_per_month, 2),
            success_rate=round(success_rate, 2)
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve payment summary"
        )

@router.get("/analytics", response_model=PaymentAnalytics)
async def get_payment_analytics(
    months: int = Query(12, ge=1, le=24),
    card_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed payment analytics"""
    try:
        # Calculate date range
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=months * 30)

        # Build query
        query = db.query(Payment).filter(
            and_(
                Payment.user_id == current_user.id,
                Payment.created_at >= start_date,
                Payment.created_at <= end_date
            )
        )

        if card_id:
            query = query.filter(Payment.card_id == card_id)

        payments = query.all()

        # Process analytics
        analytics = await _process_payment_analytics(payments, start_date, end_date)

        return PaymentAnalytics(**analytics)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve payment analytics"
        )

# Payment Automation Settings

@router.get("/automation/settings", response_model=AutomationSettings)
async def get_automation_settings(
    current_user: User = Depends(get_current_user)
):
    """Get global automation settings"""
    # This would be stored in user preferences or a separate settings table
    # For now, return default settings based on user subscription tier
    default_settings = {
        "auto_payment_enabled": True,
        "default_payment_method": "upi_autopay",
        "buffer_hours": 24,
        "maximum_payment_amount": 100000.00,
        "retry_attempts": 3,
        "failure_notification": True
    }

    # Adjust based on subscription tier
    if current_user.subscription_tier in ["gold", "platinum"]:
        default_settings["buffer_hours"] = 48
        default_settings["retry_attempts"] = 5
        default_settings["maximum_payment_amount"] = 500000.00

    return AutomationSettings(**default_settings)

@router.put("/automation/settings")
async def update_automation_settings(
    settings: AutomationSettings,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update global automation settings"""
    try:
        # This would update user preferences in database
        # For now, just log the update

        # Validate settings
        if settings.buffer_hours < 1 or settings.buffer_hours > 72:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Buffer hours must be between 1 and 72"
            )

        if settings.maximum_payment_amount <= 0 or settings.maximum_payment_amount > 1000000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum payment amount must be between 0 and 10,00,000"
            )

        # Log settings update
        await log_user_action(
            user_id=str(current_user.id),
            action="AUTOMATION_SETTINGS_UPDATED",
            ip_address=None,
            details={
                "auto_payment_enabled": settings.auto_payment_enabled,
                "default_payment_method": settings.default_payment_method,
                "buffer_hours": settings.buffer_hours,
                "maximum_payment_amount": settings.maximum_payment_amount,
                "retry_attempts": settings.retry_attempts,
                "failure_notification": settings.failure_notification
            }
        )

        return {"message": "Automation settings updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update automation settings"
        )

# Webhook handler

@router.post("/webhook/razorpay")
async def razorpay_webhook(
    webhook_data: Dict[str, Any],
    request: dict
):
    """Handle Razorpay webhook for payment events"""
    try:
        # Get headers
        headers = request.get("headers", {})

        # Process webhook
        webhook_result = await payment_engine.handle_webhook(webhook_data, headers)

        if webhook_result.get("success"):
            return {
                "status": "success",
                "message": "Webhook processed successfully"
            }
        else:
            return {
                "status": "error",
                "message": webhook_result.get("message", "Webhook processing failed")
            }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Webhook processing failed: {str(e)}"
        }

# Helper functions

async def _process_payment_analytics(payments: List[Payment], start_date: datetime, end_date: datetime) -> Dict[str, Any]:
    """Process payments into analytics data"""
    # Monthly savings
    monthly_savings = []
    current_date = start_date
    while current_date < end_date:
        month_end = current_date.replace(day=1) + timedelta(days=32)
        month_end = month_end.replace(day=1) - timedelta(days=1)

        month_payments = [p for p in payments if p.created_at.month == current_date.month and p.created_at.year == current_date.year]
        month_savings = sum(float(p.interest_saved or 0) for p in month_payments)

        monthly_savings.append({
            "month": current_date.strftime("%Y-%m"),
            "savings": round(month_savings, 2),
            "payments": len(month_payments)
        })

        current_date = month_end + timedelta(days=1)

    # Payment types breakdown
    payment_types = {}
    for payment_type in PaymentType:
        payment_types[payment_type] = len([p for p in payments if p.payment_type == payment_type])

    # Success rate
    successful_payments = len([p for p in payments if p.status == PaymentStatus.COMPLETED])
    success_rate = (successful_payments / len(payments) * 100) if payments else 0

    # Average processing time
    processing_times = []
    for payment in payments:
        if payment.completed_at and payment.initiated_at:
            processing_hours = (payment.completed_at - payment.initiated_at).total_seconds() / 3600
            processing_times.append(processing_hours)

    average_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0

    # Most saved month
    most_saved_month = max(monthly_savings, key=lambda x: x["savings"]) if monthly_savings else {"month": "N/A", "savings": 0}

    # Lifetime savings
    lifetime_savings = sum(float(p.interest_saved or 0) for p in payments)

    # Cards automated
    cards_automated = len(set(p.card_id for p in payments))

    return {
        "monthly_savings": monthly_savings,
        "payment_types": payment_types,
        "success_rate": round(success_rate, 2),
        "average_processing_time": round(average_processing_time, 2),
        "most_saved_month": most_saved_month,
        "lifetime_savings": round(lifetime_savings, 2),
        "cards_automated": cards_automated
    }

async def schedule_payment_notifications(payment_id: str, user_id: str, card_id: str):
    """Schedule payment notifications in background"""
    try:
        # This would schedule push notifications and emails for payment reminders
        # Implementation would use a task queue like Celery or Redis queue
        pass
    except Exception as e:
        print(f"Failed to schedule payment notifications: {e}")