"""
Analytics API endpoints for Lurk - Credit Card Automation
Spending insights, savings tracking, and financial analytics
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from datetime import datetime, timedelta, timezone, date
from typing import List, Optional, Dict, Any
from decimal import Decimal

from app.database import get_db
from app.services.auth_service import auth_service, get_current_user, get_premium_user
from app.services.ai_analytics import AIAnalyticsService
from app.models.user import User, SubscriptionTier
from app.models.credit_card import CreditCard, BankName
from app.models.payment import Payment, PaymentType, PaymentStatus
from app.models.bank_bounty import BankBounty, BountyType, BountyStatus
from app.utils.audit import log_user_action

router = APIRouter()
ai_analytics = AIAnalyticsService()

# Spending Analytics

@router.get("/spending")
async def get_spending_analytics(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    card_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get spending analytics with filters"""
    try:
        # Set default date range (last 6 months)
        if not start_date:
            end_date_obj = datetime.now(timezone.utc).date()
            start_date_obj = end_date_obj - timedelta(days=180)
        else:
            start_date_obj = start_date
            end_date_obj = end_date or datetime.now(timezone.utc).date()

        # Get user's credit cards
        card_query = db.query(CreditCard).filter(CreditCard.user_id == current_user.id)
        if card_id:
            card_query = card_query.filter(CreditCard.id == card_id)

        user_cards = card_query.all()

        if not user_cards:
            return {
                "period": {"start": start_date_obj.isoformat(), "end": end_date_obj.isoformat()},
                "total_spending": 0,
                "category_breakdown": {},
                "monthly_trends": [],
                "card_breakdown": {},
                "merchant_insights": []
            }

        # Get transactions from card monitoring service
        spending_data = []
        for card in user_cards:
            card_transactions = await ai_analytics.get_card_spending(
                card, start_date_obj, end_date_obj, category
            )
            spending_data.extend(card_transactions)

        # Process spending analytics
        analytics_result = await ai_analytics.analyze_spending(
            spending_data, start_date_obj, end_date_obj
        )

        # Log analytics access
        await log_user_action(
            user_id=str(current_user.id),
            action="SPENDING_ANALYTICS_ACCESSED",
            ip_address=None,
            details={
                "start_date": start_date_obj.isoformat(),
                "end_date": end_date_obj.isoformat(),
                "card_id": card_id,
                "category": category,
                "transactions_analyzed": len(spending_data)
            }
        )

        return {
            "period": {"start": start_date_obj.isoformat(), "end": end_date_obj.isoformat()},
            **analytics_result
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve spending analytics"
        )

@router.get("/spending/monthly")
async def get_monthly_spending(
    months: int = Query(12, ge=1, le=24),
    card_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get monthly spending trends"""
    try:
        # Calculate date range
        end_date = datetime.now(timezone.utc).date()
        start_date = end_date - timedelta(days=months * 30)

        # Get user's cards
        card_query = db.query(CreditCard).filter(CreditCard.user_id == current_user.id)
        if card_id:
            card_query = card_query.filter(CreditCard.id == card_id)

        user_cards = card_query.all()

        # Get monthly spending data
        monthly_spending = []
        for i in range(months):
            month_start = end_date - timedelta(days=30 * (i + 1))
            month_end = end_date - timedelta(days=30 * i)

            month_spending = 0
            month_transactions = 0

            for card in user_cards:
                card_month_data = await ai_analytics.get_monthly_spending(
                    card, month_start, month_end
                )
                month_spending += card_month_data.get("total_spending", 0)
                month_transactions += card_month_data.get("transaction_count", 0)

            monthly_spending.append({
                "month": month_start.strftime("%Y-%m"),
                "spending": round(float(month_spending), 2),
                "transactions": month_transactions,
                "average_transaction": round(float(month_spending / month_transactions), 2) if month_transactions > 0 else 0
            })

        return {
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "monthly_spending": list(reversed(monthly_spending)),
            "average_monthly_spending": round(sum(item["spending"] for item in monthly_spending) / len(monthly_spending), 2),
            "total_transactions": sum(item["transactions"] for item in monthly_spending)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve monthly spending"
        )

@router.get("/spending/categories")
async def get_category_spending(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_premium_user),  # Premium feature
    db: Session = Depends(get_db)
):
    """Get spending breakdown by category"""
    try:
        if not start_date:
            end_date_obj = datetime.now(timezone.utc).date()
            start_date_obj = end_date_obj - timedelta(days=90)  # Last 3 months
        else:
            start_date_obj = start_date
            end_date_obj = end_date or datetime.now(timezone.utc).date()

        # Get user's cards
        user_cards = db.query(CreditCard).filter(CreditCard.user_id == current_user.id).all()

        # Get category spending
        category_spending = {}
        total_spending = 0

        for card in user_cards:
            card_categories = await ai_analytics.get_category_spending(
                card, start_date_obj, end_date_obj
            )

            for category, amount in card_categories.items():
                category_spending[category] = category_spending.get(category, 0) + amount
                total_spending += amount

        # Calculate percentages
        category_breakdown = []
        for category, amount in sorted(category_spending.items(), key=lambda x: x[1], reverse=True):
            percentage = (amount / total_spending * 100) if total_spending > 0 else 0
            category_breakdown.append({
                "category": category,
                "amount": round(float(amount), 2),
                "percentage": round(percentage, 2)
            })

        return {
            "period": {"start": start_date_obj.isoformat(), "end": end_date_obj.isoformat()},
            "total_spending": round(float(total_spending), 2),
            "category_breakdown": category_breakdown,
            "unique_categories": len(category_breakdown)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve category spending"
        )

# Savings Analytics

@router.get("/savings")
async def get_savings_analytics(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    card_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get savings analytics from Lurk automation"""
    try:
        if not start_date:
            end_date_obj = datetime.now(timezone.utc).date()
            start_date_obj = end_date_obj - timedelta(days=365)  # Last year
        else:
            start_date_obj = start_date
            end_date_obj = end_date or datetime.now(timezone.utc).date()

        # Build payment query
        payment_query = db.query(Payment).filter(
            and_(
                Payment.user_id == current_user.id,
                Payment.status == PaymentStatus.COMPLETED,
                Payment.created_at >= datetime.combine(start_date_obj, datetime.min.time()).replace(tzinfo=timezone.utc),
                Payment.created_at <= datetime.combine(end_date_obj, datetime.max.time()).replace(tzinfo=timezone.utc)
            )
        )

        if card_id:
            payment_query = payment_query.filter(Payment.card_id == card_id)

        # Get payments
        payments = payment_query.all()

        # Calculate savings
        total_interest_saved = sum(float(payment.interest_saved or 0) for payment in payments)
        total_late_fees_prevented = sum(float(payment.late_fee_prevented or 0) for payment in payments)
        total_savings = total_interest_saved + total_late_fees_prevented

        # Monthly savings breakdown
        monthly_savings = {}
        for payment in payments:
            month_key = payment.created_at.strftime("%Y-%m")
            if month_key not in monthly_savings:
                monthly_savings[month_key] = {"interest_saved": 0, "late_fees_prevented": 0, "total_saved": 0}

            monthly_savings[month_key]["interest_saved"] += float(payment.interest_saved or 0)
            monthly_savings[month_key]["late_fees_prevented"] += float(payment.late_fee_prevented or 0)
            monthly_savings[month_key]["total_saved"] += float(payment.interest_saved or 0) + float(payment.late_fee_prevented or 0)

        # Format monthly breakdown
        monthly_breakdown = []
        for month in sorted(monthly_savings.keys()):
            data = monthly_savings[month]
            monthly_breakdown.append({
                "month": month,
                "interest_saved": round(data["interest_saved"], 2),
                "late_fees_prevented": round(data["late_fees_prevented"], 2),
                "total_saved": round(data["total_saved"], 2)
            })

        return {
            "period": {"start": start_date_obj.isoformat(), "end": end_date_obj.isoformat()},
            "total_interest_saved": round(total_interest_saved, 2),
            "total_late_fees_prevented": round(total_late_fees_prevented, 2),
            "total_savings": round(total_savings, 2),
            "total_payments_processed": len(payments),
            "average_savings_per_payment": round(total_savings / len(payments), 2) if payments else 0,
            "monthly_breakdown": monthly_breakdown
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve savings analytics"
        )

@router.get("/savings/summary")
async def get_savings_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get savings summary dashboard"""
    try:
        # Get all completed payments
        payments = db.query(Payment).filter(
            and_(
                Payment.user_id == current_user.id,
                Payment.status == PaymentStatus.COMPLETED
            )
        ).all()

        if not payments:
            return {
                "lifetime_savings": 0,
                "interest_saved": 0,
                "late_fees_prevented": 0,
                "payments_processed": 0,
                "cards_protected": 0,
                "average_monthly_savings": 0,
                "best_month": {"month": "N/A", "savings": 0}
            }

        # Calculate totals
        total_interest_saved = sum(float(payment.interest_saved or 0) for payment in payments)
        total_late_fees_prevented = sum(float(payment.late_fee_prevented or 0) for payment in payments)
        total_savings = total_interest_saved + total_late_fees_prevented

        # Get unique cards
        cards_protected = len(set(payment.card_id for payment in payments))

        # Calculate monthly breakdown
        monthly_savings = {}
        for payment in payments:
            month_key = payment.created_at.strftime("%Y-%m")
            month_savings = float(payment.interest_saved or 0) + float(payment.late_fee_prevented or 0)
            monthly_savings[month_key] = monthly_savings.get(month_key, 0) + month_savings

        # Find best month
        best_month = max(monthly_savings.items(), key=lambda x: x[1]) if monthly_savings else ("N/A", 0)

        # Calculate average monthly savings
        months_covered = len(monthly_savings)
        average_monthly_savings = total_savings / months_covered if months_covered > 0 else 0

        return {
            "lifetime_savings": round(total_savings, 2),
            "interest_saved": round(total_interest_saved, 2),
            "late_fees_prevented": round(total_late_fees_prevented, 2),
            "payments_processed": len(payments),
            "cards_protected": cards_protected,
            "average_monthly_savings": round(average_monthly_savings, 2),
            "best_month": {"month": best_month[0], "savings": round(best_month[1], 2)},
            "months_covered": months_covered
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve savings summary"
        )

@router.get("/savings/forecast")
async def get_savings_forecast(
    months: int = Query(6, ge=1, le=12),
    current_user: User = Depends(get_premium_user),  # Premium feature
    db: Session = Depends(get_db)
):
    """Get savings forecast based on current patterns"""
    try:
        # Get historical payments for analysis
        payments = db.query(Payment).filter(
            and_(
                Payment.user_id == current_user.id,
                Payment.status == PaymentStatus.COMPLETED,
                Payment.created_at >= datetime.now(timezone.utc) - timedelta(days=90)  # Last 3 months
            )
        ).all()

        if not payments:
            return {
                "forecast_months": [],
                "projected_savings": 0,
                "confidence_level": "low"
            }

        # Get user's active cards
        active_cards = db.query(CreditCard).filter(
            and_(
                CreditCard.user_id == current_user.id,
                CreditCard.auto_payment_enabled == True
            )
        ).count()

        # Generate forecast
        forecast = await ai_analytics.generate_savings_forecast(
            payments, active_cards, months
        )

        # Log forecast access
        await log_user_action(
            user_id=str(current_user.id),
            action="SAVINGS_FORECAST_ACCESSED",
            ip_address=None,
            details={
                "forecast_months": months,
                "active_cards": active_cards,
                "confidence_level": forecast.get("confidence_level", "medium")
            }
        )

        return forecast

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate savings forecast"
        )

# Credit Score Analytics

@router.get("/credit-score")
async def get_credit_score_analytics(
    current_user: User = Depends(get_premium_user),  # Premium feature
    db: Session = Depends(get_db)
):
    """Get credit score tracking and recommendations"""
    try:
        # Get credit score data from AI service
        credit_score_data = await ai_analytics.get_credit_score_analysis(current_user, db)

        # Log credit score access
        await log_user_action(
            user_id=str(current_user.id),
            action="CREDIT_SCORE_ACCESSED",
            ip_address=None,
            details={
                "score_provided": credit_score_data.get("score") is not None,
                "recommendations_count": len(credit_score_data.get("recommendations", []))
            }
        )

        return credit_score_data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve credit score analytics"
        )

@router.get("/credit-score/recommendations")
async def get_credit_recommendations(
    current_user: User = Depends(get_premium_user),
    db: Session = Depends(get_db)
):
    """Get AI-powered credit improvement recommendations"""
    try:
        # Get user's payment and card data
        payments = db.query(Payment).filter(
            and_(
                Payment.user_id == current_user.id,
                Payment.status == PaymentStatus.COMPLETED,
                Payment.created_at >= datetime.now(timezone.utc) - timedelta(days=180)
            )
        ).all()

        cards = db.query(CreditCard).filter(CreditCard.user_id == current_user.id).all()

        # Generate recommendations
        recommendations = await ai_analytics.generate_credit_recommendations(payments, cards)

        # Log recommendations access
        await log_user_action(
            user_id=str(current_user.id),
            action="CREDIT_RECOMMENDATIONS_ACCESSED",
            ip_address=None,
            details={
                "recommendations_count": len(recommendations),
                "cards_analyzed": len(cards),
                "payments_analyzed": len(payments)
            }
        )

        return {
            "recommendations": recommendations,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "data_period_days": 180
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate credit recommendations"
        )

# Financial Insights

@router.get("/insights")
async def get_financial_insights(
    current_user: User = Depends(get_premium_user),
    db: Session = Depends(get_db)
):
    """Get AI-powered financial insights"""
    try:
        # Get comprehensive user data
        cards = db.query(CreditCard).filter(CreditCard.user_id == current_user.id).all()
        payments = db.query(Payment).filter(
            and_(
                Payment.user_id == current_user.id,
                Payment.status == PaymentStatus.COMPLETED,
                Payment.created_at >= datetime.now(timezone.utc) - timedelta(days=180)
            )
        ).all()

        bounties = db.query(BankBounty).filter(
            and_(
                BankBounty.user_id == current_user.id,
                BankBounty.status == BountyStatus.PAID,
                BankBounty.prevention_date >= datetime.now(timezone.utc) - timedelta(days=365)
            )
        ).all()

        # Generate insights
        insights = await ai_analytics.generate_financial_insights(cards, payments, bounties)

        # Log insights access
        await log_user_action(
            user_id=str(current_user.id),
            action="FINANCIAL_INSIGHTS_ACCESSED",
            ip_address=None,
            details={
                "insights_count": len(insights),
                "data_analyzed": {
                    "cards": len(cards),
                    "payments": len(payments),
                    "bounties": len(bounties)
                }
            }
        )

        return {
            "insights": insights,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "data_analyzed": {
                "cards_count": len(cards),
                "payments_count": len(payments),
                "bounties_count": len(bounties),
                "analysis_period_days": 180
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate financial insights"
        )

# Export and Reports

@router.get("/export/spending")
async def export_spending_data(
    format: str = Query("csv", regex="^(csv|json|xlsx)$"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    card_id: Optional[str] = Query(None),
    current_user: User = Depends(get_premium_user),
    db: Session = Depends(get_db)
):
    """Export spending data in various formats"""
    try:
        if not start_date:
            end_date_obj = datetime.now(timezone.utc).date()
            start_date_obj = end_date_obj - timedelta(days=365)
        else:
            start_date_obj = start_date
            end_date_obj = end_date or datetime.now(timezone.utc).date()

        # Get user's cards
        card_query = db.query(CreditCard).filter(CreditCard.user_id == current_user.id)
        if card_id:
            card_query = card_query.filter(CreditCard.id == card_id)

        user_cards = card_query.all()

        # Get transaction data
        export_data = []
        for card in user_cards:
            card_transactions = await ai_analytics.export_card_transactions(
                card, start_date_obj, end_date_obj
            )
            export_data.extend(card_transactions)

        # Format data for export
        formatted_data = await ai_analytics.format_export_data(export_data, format)

        # Log export
        await log_user_action(
            user_id=str(current_user.id),
            action="SPENDING_DATA_EXPORTED",
            ip_address=None,
            details={
                "format": format,
                "start_date": start_date_obj.isoformat(),
                "end_date": end_date_obj.isoformat(),
                "transactions_exported": len(export_data),
                "card_id": card_id
            }
        )

        return {
            "data": formatted_data,
            "format": format,
            "filename": f"lurk_spending_export_{start_date_obj}_to_{end_date_obj}.{format}",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "transaction_count": len(export_data)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export spending data"
        )

@router.get("/dashboard")
async def get_analytics_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive analytics dashboard"""
    try:
        # Get basic stats
        cards = db.query(CreditCard).filter(CreditCard.user_id == current_user.id).all()
        active_cards = len([c for c in cards if c.auto_payment_enabled])

        # Get recent payments
        recent_payments = db.query(Payment).filter(
            and_(
                Payment.user_id == current_user.id,
                Payment.status == PaymentStatus.COMPLETED
            )
        ).order_by(desc(Payment.created_at)).limit(10).all()

        # Get savings
        total_savings = db.query(func.sum(Payment.interest_saved + Payment.late_fee_prevented)).filter(
            and_(
                Payment.user_id == current_user.id,
                Payment.status == PaymentStatus.COMPLETED
            )
        ).scalar() or 0

        # Get upcoming payments
        upcoming_cards = db.query(CreditCard).filter(
            and_(
                CreditCard.user_id == current_user.id,
                CreditCard.auto_payment_enabled == True,
                CreditCard.payment_due_date <= datetime.now(timezone.utc) + timedelta(days=7),
                CreditCard.minimum_due > 0
            )
        ).all()

        return {
            "overview": {
                "total_cards": len(cards),
                "active_cards": active_cards,
                "upcoming_payments": len(upcoming_cards),
                "total_savings": round(float(total_savings), 2),
                "recent_payments_count": len(recent_payments)
            },
            "recent_payments": [
                {
                    "id": str(payment.id),
                    "amount": float(payment.amount),
                    "interest_saved": float(payment.interest_saved or 0),
                    "payment_date": payment.completed_at.isoformat() if payment.completed_at else None,
                    "card_last4": next((c.card_last4 for c in cards if c.id == payment.card_id), "Unknown")
                }
                for payment in recent_payments
            ],
            "upcoming_payments": [
                {
                    "card_id": str(card.id),
                    "card_last4": card.card_last4,
                    "bank_name": card.bank_name.value,
                    "minimum_due": float(card.minimum_due),
                    "due_date": card.payment_due_date.isoformat() if card.payment_due_date else None,
                    "days_until_due": max(0, (card.payment_due_date - datetime.now(timezone.utc)).days) if card.payment_due_date else 0
                }
                for card in upcoming_cards
            ],
            "card_breakdown": [
                {
                    "card_id": str(card.id),
                    "card_last4": card.card_last4,
                    "bank_name": card.bank_name.value,
                    "credit_limit": float(card.credit_limit) if card.credit_limit else 0,
                    "current_balance": float(card.current_balance),
                    "utilization_percent": round((float(card.current_balance) / float(card.credit_limit) * 100), 2) if card.credit_limit else 0,
                    "auto_payment_enabled": card.auto_payment_enabled,
                    "status": card.card_status.value
                }
                for card in cards
            ]
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve analytics dashboard"
        )