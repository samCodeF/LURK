"""
AI Analytics Service for Lurk - Financial Insights and Recommendations
Spending analysis, credit score optimization, and behavioral insights
"""

import os
import json
import asyncio
from datetime import datetime, timedelta, timezone, date
from typing import Dict, Any, List, Optional, Tuple
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
import pandas as pd
import numpy as np

# AI/ML Libraries (in production, would use more sophisticated models)
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import pickle
import redis

from app.models.user import User, SubscriptionTier
from app.models.credit_card import CreditCard
from app.models.payment import Payment, PaymentType, PaymentStatus
from app.models.bank_bounty import BankBounty
from app.services.card_monitor import card_monitor_service
from app.utils.encryption import encrypt_sensitive_data, decrypt_sensitive_data

# Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

# Redis for caching analytics
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, decode_responses=True)

class AIAnalyticsService:
    """AI-powered financial analytics and insights"""

    def __init__(self):
        self.cache_prefix = "analytics:"
        self.model_prefix = "models:"
        self.insight_cache_ttl = 3600  # 1 hour
        self.model_cache_ttl = 86400  # 24 hours

    async def get_card_spending(
        self,
        card: CreditCard,
        start_date: date,
        end_date: date,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get spending data for specific card"""
        try:
            cache_key = f"{self.cache_prefix}card_spending:{card.id}:{start_date}:{end_date}:{category}"
            cached_data = await self._get_cached_data(cache_key)
            if cached_data:
                return cached_data

            # Get transactions from card monitoring service
            statement_data = await card_monitor_service.get_statement(card, start_date.month, start_date.year)

            if not statement_data:
                return {
                    "card_id": str(card.id),
                    "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
                    "total_spending": 0,
                    "transaction_count": 0,
                    "category_breakdown": {},
                    "daily_average": 0,
                    "merchant_insights": []
                }

            transactions = statement_data.get("transactions", [])

            # Filter by date range and category
            filtered_transactions = []
            for tx in transactions:
                tx_date = self._parse_date(tx.get("date"))
                if tx_date and start_date <= tx_date <= end_date:
                    if not category or tx.get("category") == category:
                        filtered_transactions.append(tx)

            # Process transactions
            total_spending = sum(abs(float(tx.get("amount", 0))) for tx in filtered_transactions)
            transaction_count = len(filtered_transactions)
            daily_average = total_spending / max(1, (end_date - start_date).days)

            # Category breakdown
            category_spending = {}
            merchant_spending = {}

            for tx in filtered_transactions:
                amount = abs(float(tx.get("amount", 0)))
                tx_category = tx.get("category", "other")
                merchant = tx.get("merchant", "Unknown")

                category_spending[tx_category] = category_spending.get(tx_category, 0) + amount
                merchant_spending[merchant] = merchant_spending.get(merchant, 0) + amount

            # Top merchants
            top_merchants = sorted(merchant_spending.items(), key=lambda x: x[1], reverse=True)[:10]

            result = {
                "card_id": str(card.id),
                "card_last4": card.card_last4,
                "bank_name": card.bank_name.value,
                "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
                "total_spending": round(total_spending, 2),
                "transaction_count": transaction_count,
                "daily_average": round(daily_average, 2),
                "category_breakdown": {k: round(v, 2) for k, v in category_spending.items()},
                "top_merchants": [{"merchant": m, "amount": round(a, 2)} for m, a in top_merchants],
                "transactions": filtered_transactions
            }

            # Cache result
            await self._cache_data(cache_key, result, timedelta(hours=1))

            return result

        except Exception as e:
            print(f"Error getting card spending: {e}")
            return {
                "card_id": str(card.id),
                "error": str(e),
                "total_spending": 0,
                "transaction_count": 0
            }

    async def get_monthly_spending(
        self,
        card: CreditCard,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Get monthly spending trends for card"""
        try:
            cache_key = f"{self.cache_prefix}monthly_spending:{card.id}:{start_date}:{end_date}"
            cached_data = await self._get_cached_data(cache_key)
            if cached_data:
                return cached_data

            # Get all statements for the period
            monthly_data = []
            current_date = start_date.replace(day=1)

            while current_date <= end_date:
                month_end = (current_date.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)

                # Get statement for this month
                statement_data = await card_monitor_service.get_statement(card, current_date.month, current_date.year)

                if statement_data:
                    transactions = statement_data.get("transactions", [])
                    month_transactions = [tx for tx in transactions if self._parse_date(tx.get("date")) and current_date <= self._parse_date(tx.get("date")) <= month_end]

                    month_spending = sum(abs(float(tx.get("amount", 0))) for tx in month_transactions)
                    transaction_count = len(month_transactions)

                    # Category breakdown
                    category_spending = {}
                    for tx in month_transactions:
                        amount = abs(float(tx.get("amount", 0)))
                        category = tx.get("category", "other")
                        category_spending[category] = category_spending.get(category, 0) + amount

                    monthly_data.append({
                        "month": current_date.strftime("%Y-%m"),
                        "month_name": current_date.strftime("%B %Y"),
                        "spending": round(month_spending, 2),
                        "transactions": transaction_count,
                        "average_transaction": round(month_spending / transaction_count, 2) if transaction_count > 0 else 0,
                        "category_breakdown": {k: round(v, 2) for k, v in category_spending.items()},
                        "top_categories": sorted(category_spending.items(), key=lambda x: x[1], reverse=True)[:5]
                    })

                current_date = (current_date + timedelta(days=32)).replace(day=1)

            # Calculate trends
            if len(monthly_data) > 1:
                spending_trend = self._calculate_trend([m["spending"] for m in monthly_data])
                transaction_trend = self._calculate_trend([m["transactions"] for m in monthly_data])
            else:
                spending_trend = 0
                transaction_trend = 0

            result = {
                "card_id": str(card.id),
                "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
                "monthly_spending": monthly_data,
                "total_spending": sum(m["spending"] for m in monthly_data),
                "average_monthly_spending": sum(m["spending"] for m in monthly_data) / len(monthly_data) if monthly_data else 0,
                "spending_trend": round(spending_trend, 2),
                "transaction_trend": round(transaction_trend, 2),
                "insights": self._generate_spending_insights(monthly_data)
            }

            # Cache result
            await self._cache_data(cache_key, result, timedelta(hours=2))

            return result

        except Exception as e:
            print(f"Error getting monthly spending: {e}")
            return {
                "card_id": str(card.id),
                "error": str(e),
                "monthly_spending": []
            }

    async def get_category_spending(
        self,
        card: CreditCard,
        start_date: date,
        end_date: date
    ) -> Dict[str, float]:
        """Get spending breakdown by category"""
        try:
            cache_key = f"{self.cache_prefix}category_spending:{card.id}:{start_date}:{end_date}"
            cached_data = await self._get_cached_data(cache_key)
            if cached_data:
                return cached_data

            # Get all transactions for the period
            category_spending = {}
            current_date = start_date.replace(day=1)

            while current_date <= end_date:
                statement_data = await card_monitor_service.get_statement(card, current_date.month, current_date.year)

                if statement_data:
                    transactions = statement_data.get("transactions", [])
                    month_transactions = [tx for tx in transactions if self._parse_date(tx.get("date")) and current_date <= self._parse_date(tx.get("date")) <= (current_date.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)]

                    for tx in month_transactions:
                        amount = abs(float(tx.get("amount", 0)))
                        category = tx.get("category", "other")
                        category_spending[category] = category_spending.get(category, 0) + amount

                current_date = (current_date + timedelta(days=32)).replace(day=1)

            # Cache result
            await self._cache_data(cache_key, category_spending, timedelta(hours=1))

            return {k: round(v, 2) for k, v in category_spending.items()}

        except Exception as e:
            print(f"Error getting category spending: {e}")
            return {}

    async def analyze_spending(
        self,
        spending_data: List[Dict[str, Any]],
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Analyze spending patterns and generate insights"""
        try:
            if not spending_data:
                return {
                    "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
                    "total_spending": 0,
                    "category_breakdown": {},
                    "monthly_trends": [],
                    "anomalies": [],
                    "recommendations": []
                }

            # Aggregate spending by category and month
            category_totals = {}
            month_totals = {}
            daily_spending = []

            for data in spending_data:
                card_id = data.get("card_id")
                if not card_id:
                    continue

                card_data = await self._get_cached_data(f"{self.cache_prefix}card_spending:{card_id}:{start_date}:{end_date}")

                if card_data:
                    # Add to category totals
                    for category, amount in card_data.get("category_breakdown", {}).items():
                        category_totals[category] = category_totals.get(category, 0) + amount

                    # Add to daily spending (simplified)
                    daily_spending.extend([data.get("total_spending", 0) / 30] * 30)

            # Calculate total spending
            total_spending = sum(category_totals.values())

            # Identify spending patterns
            spending_patterns = self._analyze_spending_patterns(spending_data)

            # Generate anomalies
            anomalies = self._detect_spending_anomalies(spending_data)

            # Generate recommendations
            recommendations = self._generate_spending_recommendations(category_totals, spending_patterns)

            result = {
                "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
                "total_spending": round(total_spending, 2),
                "category_breakdown": {k: round(v, 2) for k, v in category_totals.items()},
                "spending_patterns": spending_patterns,
                "anomalies": anomalies,
                "recommendations": recommendations,
                "insight_score": self._calculate_insight_score(category_totals, spending_patterns)
            }

            return result

        except Exception as e:
            print(f"Error analyzing spending: {e}")
            return {
                "error": str(e),
                "period": {"start": start_date.isoformat(), "end": end_date.isoformat()}
            }

    async def get_credit_score_analysis(
        self,
        user: User,
        db: Session
    ) -> Dict[str, Any]:
        """Get credit score analysis and recommendations"""
        try:
            cache_key = f"{self.cache_prefix}credit_score:{user.id}"
            cached_data = await self._get_cached_data(cache_key)
            if cached_data:
                return cached_data

            # Get user's payment history
            payments = db.query(Payment).filter(
                and_(
                    Payment.user_id == user.id,
                    Payment.status == PaymentStatus.COMPLETED,
                    Payment.created_at >= datetime.now(timezone.utc) - timedelta(days=365)
                )
            ).all()

            # Get user's credit cards
            cards = db.query(CreditCard).filter(CreditCard.user_id == user.id).all()

            # Get bank bounties (indicating good payment behavior)
            bounties = db.query(BankBounty).filter(
                and_(
                    BankBounty.user_id == user.id,
                    BankBounty.status == BountyStatus.PAID,
                    BankBounty.prevention_date >= datetime.now(timezone.utc) - timedelta(days=365)
                )
            ).all()

            # Calculate credit metrics
            credit_metrics = self._calculate_credit_metrics(payments, cards, bounties)

            # Generate credit score (simplified model)
            credit_score = self._calculate_credit_score(credit_metrics)

            # Generate recommendations
            recommendations = self._generate_credit_recommendations(credit_metrics, credit_score)

            result = {
                "user_id": str(user.id),
                "credit_score": credit_score,
                "score_range": self._get_score_range(credit_score),
                "credit_metrics": credit_metrics,
                "recommendations": recommendations,
                "factors_affecting_score": self._get_score_factors(credit_metrics),
                "improvement_suggestions": self._get_improvement_suggestions(credit_metrics),
                "next_score_update": (datetime.now(timezone.utc) + timedelta(days=30)).date().isoformat(),
                "score_trend": await self._get_score_trend(user, db),
                "analysis_date": datetime.now(timezone.utc).isoformat()
            }

            # Cache result (credit score changes slowly, so cache longer)
            await self._cache_data(cache_key, result, timedelta(hours=24))

            return result

        except Exception as e:
            print(f"Error in credit score analysis: {e}")
            return {
                "error": str(e),
                "credit_score": 0,
                "recommendations": []
            }

    async def generate_credit_recommendations(
        self,
        payments: List[Payment],
        cards: List[CreditCard]
    ) -> List[Dict[str, Any]]:
        """Generate AI-powered credit improvement recommendations"""
        try:
            recommendations = []

            # Analyze payment patterns
            payment_patterns = self._analyze_payment_patterns(payments)

            # Analyze card usage patterns
            card_usage = self._analyze_card_usage(cards, payments)

            # Generate recommendations based on patterns
            if payment_patterns.get("always_pays_minimum", False) and payment_patterns.get("has_balances", True):
                recommendations.append({
                    "type": "payment_strategy",
                    "title": "Consider paying more than minimum",
                    "description": "You're consistently paying minimum amounts. Paying more could reduce interest and improve your score.",
                    "potential_impact": "high",
                    "estimated_savings": self._estimate_payment_savings(payments),
                    "priority": "high"
                })

            if card_usage.get("high_utilization", False):
                recommendations.append({
                    "type": "credit_utilization",
                    "title": "Reduce credit card utilization",
                    "description": "Your credit utilization is high. Keep it below 30% to improve your credit score.",
                    "potential_impact": "medium",
                    "current_utilization": card_usage.get("average_utilization", 0),
                    "target_utilization": 30,
                    "priority": "high"
                })

            if len(cards) == 1 and payment_patterns.get("good_payment_history", True):
                recommendations.append({
                    "type": "credit_building",
                    "title": "Consider additional credit for better utilization",
                    "description": "Adding another credit card could help improve your credit utilization ratio.",
                    "potential_impact": "medium",
                    "priority": "medium"
                })

            if payment_patterns.get("missed_payments", False):
                recommendations.append({
                    "type": "automation",
                    "title": "Enable automatic payments",
                    "description": "Set up automatic minimum payments to avoid missed payments and improve your payment history.",
                    "potential_impact": "high",
                    "priority": "high"
                })

            # Add personalized insights based on spending patterns
            spending_insights = self._analyze_spending_patterns(payments)
            if spending_insights:
                recommendations.extend(spending_insights)

            # Sort by priority
            recommendations.sort(key=lambda x: {"high": 3, "medium": 2, "low": 1}.get(x.get("priority"), 1), reverse=True)

            return recommendations

        except Exception as e:
            print(f"Error generating credit recommendations: {e}")
            return []

    async def generate_savings_forecast(
        self,
        payments: List[Payment],
        active_cards: int,
        months: int
    ) -> Dict[str, Any]:
        """Generate savings forecast based on current patterns"""
        try:
            if not payments or months <= 0:
                return {
                    "forecast_months": [],
                    "projected_savings": 0,
                    "confidence_level": "low"
                }

            # Analyze historical savings patterns
            savings_pattern = self._analyze_savings_pattern(payments)

            # Generate monthly forecast
            forecast_months = []
            current_date = datetime.now(timezone.utc)
            base_savings = savings_pattern.get("average_monthly_savings", 0)

            for i in range(months):
                forecast_date = current_date + timedelta(days=30 * (i + 1))

                # Apply seasonal adjustments (simplified)
                seasonal_factor = self._get_seasonal_factor(forecast_date)
                monthly_forecast = base_savings * seasonal_factor

                # Add some randomness for realistic forecast
                import random
                variation = random.uniform(0.8, 1.2)  # ±20% variation
                monthly_forecast *= variation

                forecast_months.append({
                    "month": forecast_date.strftime("%Y-%m"),
                    "projected_savings": round(max(0, monthly_forecast), 2),
                    "confidence_level": "high" if i < 3 else "medium" if i < 6 else "low",
                    "factors": ["payment_pattern", "seasonal_trends", "active_cards"]
                })

            total_projected = sum(month["projected_savings"] for month in forecast_months)

            # Calculate confidence based on data quality
            confidence_level = self._calculate_forecast_confidence(payments, active_cards, months)

            return {
                "forecast_months": forecast_months,
                "projected_savings": round(total_projected, 2),
                "average_monthly_projection": round(total_projected / months, 2),
                "confidence_level": confidence_level,
                "based_on_period_days": min(180, len(payments) * 30),
                "assumptions": [
                    "Current payment patterns continue",
                    "Active cards remain enabled for automation",
                    "No major changes in spending habits"
                ]
            }

        except Exception as e:
            print(f"Error generating savings forecast: {e}")
            return {
                "error": str(e),
                "projected_savings": 0,
                "confidence_level": "low"
            }

    async def generate_financial_insights(
        self,
        cards: List[CreditCard],
        payments: List[Payment],
        bounties: List[BankBounty]
    ) -> List[Dict[str, Any]]:
        """Generate comprehensive financial insights"""
        try:
            insights = []

            # Card utilization insights
            utilization_insight = self._analyze_utilization_insights(cards)
            if utilization_insight:
                insights.append(utilization_insight)

            # Payment behavior insights
            payment_insights = self._analyze_payment_behavior(payments)
            insights.extend(payment_insights)

            # Savings insights
            savings_insight = self._analyze_savings_behavior(payments)
            if savings_insight:
                insights.append(savings_insight)

            # Bank partnership insights
            bounty_insight = self._analyze_bounty_earnings(bounties)
            if bounty_insight:
                insights.append(bounty_insight)

            # Credit optimization insights
            credit_insights = self._analyze_credit_optimization(cards, payments)
            insights.extend(credit_insights)

            # Seasonal spending insights
            seasonal_insights = self._analyze_seasonal_patterns(payments)
            insights.extend(seasonal_insights)

            # Sort by impact and relevance
            insights.sort(key=lambda x: (
                {"high": 3, "medium": 2, "low": 1}.get(x.get("impact"), 1),
                {"high": 3, "medium": 2, "low": 1}.get(x.get("relevance"), 1)
            ), reverse=True)

            return insights

        except Exception as e:
            print(f"Error generating financial insights: {e}")
            return []

    async def export_card_transactions(
        self,
        card: CreditCard,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """Export card transactions for analysis"""
        try:
            transactions = []

            # Get all statements for the period
            current_date = start_date.replace(day=1)

            while current_date <= end_date:
                statement_data = await card_monitor_service.get_statement(card, current_date.month, current_date.year)

                if statement_data:
                    month_transactions = statement_data.get("transactions", [])

                    for tx in month_transactions:
                        tx_date = self._parse_date(tx.get("date"))
                        if tx_date and start_date <= tx_date <= end_date:
                            transactions.append({
                                "date": tx_date.isoformat(),
                                "description": tx.get("description", ""),
                                "amount": float(tx.get("amount", 0)),
                                "category": tx.get("category", "other"),
                                "merchant": tx.get("merchant", ""),
                                "transaction_type": tx.get("type", "purchase"),
                                "card_id": str(card.id),
                                "card_last4": card.card_last4,
                                "bank_name": card.bank_name.value
                            })

                current_date = (current_date + timedelta(days=32)).replace(day=1)

            # Sort by date
            transactions.sort(key=lambda x: x["date"])

            return transactions

        except Exception as e:
            print(f"Error exporting card transactions: {e}")
            return []

    async def format_export_data(
        self,
        data: List[Dict[str, Any]],
        format_type: str
    ) -> Any:
        """Format export data for different formats"""
        try:
            if format_type == "csv":
                import io
                import csv

                output = io.StringIO()
                if data:
                    writer = csv.DictWriter(output, fieldnames=data[0].keys())
                    writer.writeheader()
                    writer.writerows(data)

                return output.getvalue()

            elif format_type == "json":
                return json.dumps(data, indent=2, default=str)

            elif format_type == "xlsx":
                # Would need openpyxl or similar
                return json.dumps({"error": "XLSX export not implemented yet"}, default=str)

            else:
                return data

        except Exception as e:
            print(f"Error formatting export data: {e}")
            return {"error": str(e)}

    # Private helper methods

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse date string from various formats"""
        if not date_str:
            return None

        formats = [
            "%Y-%m-%d",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ",
            "%d/%m/%Y",
            "%m/%d/%Y"
        ]

        for fmt in formats:
            try:
                parsed_date = datetime.strptime(date_str, fmt)
                if parsed_date.tzinfo is None:
                    parsed_date = pytz.utc.localize(parsed_date)
                return parsed_date
            except ValueError:
                continue

        return None

    def _calculate_trend(self, values: List[float]) -> float:
        """Calculate trend (percentage change)"""
        if len(values) < 2:
            return 0

        # Simple linear regression trend
        x = np.arange(len(values))
        y = np.array(values)

        try:
            slope = np.polyfit(x, y, 1)[0]
            avg_value = np.mean(values)
            return (slope / avg_value) * 100 if avg_value != 0 else 0
        except:
            return 0

    def _generate_spending_insights(self, monthly_data: List[Dict[str, Any]]) -> List[str]:
        """Generate insights from monthly spending data"""
        insights = []

        if len(monthly_data) < 2:
            return insights

        # Find spending trends
        spending_values = [m["spending"] for m in monthly_data]
        trend = self._calculate_trend(spending_values)

        if trend > 10:
            insights.append("Spending is increasing significantly (+{:.1f}%)".format(trend))
        elif trend < -10:
            insights.append("Spending is decreasing (-{:.1f}%)".format(abs(trend)))

        # Find highest spending categories
        all_categories = {}
        for month in monthly_data:
            for category, amount in month.get("category_breakdown", {}).items():
                all_categories[category] = all_categories.get(category, 0) + amount

        if all_categories:
            top_category = max(all_categories.items(), key=lambda x: x[1])
            insights.append("Highest spending category: {} (₹{:.2f})".format(top_category[0], top_category[1]))

        return insights

    def _analyze_spending_patterns(self, spending_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze spending patterns"""
        patterns = {
            "seasonal_variations": [],
            "recurring_expenses": [],
            "unusual_transactions": [],
            "spending_velocity": "normal"
        }

        # This would use more sophisticated pattern analysis
        # Simplified implementation for now

        return patterns

    def _detect_spending_anomalies(self, spending_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect anomalies in spending patterns"""
        anomalies = []

        # Simple anomaly detection based on spending deviations
        if len(spending_data) > 3:
            spending_values = [d.get("total_spending", 0) for d in spending_data]
            mean_spending = np.mean(spending_values)
            std_spending = np.std(spending_values)

            threshold = mean_spending + 2 * std_spending

            for data in spending_data:
                if data.get("total_spending", 0) > threshold:
                    anomalies.append({
                        "type": "high_spending",
                        "description": "Unusually high spending detected",
                        "value": data.get("total_spending", 0),
                        "threshold": threshold,
                        "severity": "high"
                    })

        return anomalies

    def _generate_spending_recommendations(
        self,
        category_totals: Dict[str, float],
        patterns: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate spending recommendations"""
        recommendations = []

        total_spending = sum(category_totals.values())

        if total_spending > 0:
            # Recommend budget optimization for high spending categories
            for category, amount in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)[:3]:
                percentage = (amount / total_spending) * 100
                if percentage > 30:
                    recommendations.append({
                        "type": "budget_optimization",
                        "category": category,
                        "current_spending": round(amount, 2),
                        "percentage": round(percentage, 1),
                        "recommendation": f"Consider reducing {category} spending or finding cheaper alternatives"
                    })

        return recommendations

    def _calculate_insight_score(self, category_totals: Dict[str, float], patterns: Dict[str, Any]) -> float:
        """Calculate insight quality score"""
        if not category_totals:
            return 0

        # Score based on data quality and pattern clarity
        data_score = min(1.0, len(category_totals) / 10)  # More categories = better data
        pattern_score = len([p for p in patterns.get("seasonal_variations", [])]) / 10

        return round((data_score + pattern_score) * 50, 2)  # Scale to 0-100

    # Credit analysis methods

    def _calculate_credit_metrics(self, payments: List[Payment], cards: List[CreditCard], bounties: List[BankBounty]) -> Dict[str, Any]:
        """Calculate comprehensive credit metrics"""
        return {
            "payment_history": {
                "total_payments": len(payments),
                "on_time_payments": len([p for p in payments if p.status == PaymentStatus.COMPLETED]),
                "missed_payments": len([p for p in payments if p.status == PaymentStatus.FAILED]),
                "average_payment_amount": sum(float(p.amount) for p in payments) / len(payments) if payments else 0
            },
            "credit_utilization": {
                "total_credit_limit": sum(float(card.credit_limit or 0) for card in cards),
                "total_balance": sum(float(card.current_balance or 0) for card in cards),
                "average_utilization": 0
            },
            "account_age": {
                "oldest_account": min([c.created_at for c in cards]) if cards else datetime.now(timezone.utc),
                "average_account_age": 0,
                "total_accounts": len(cards)
            },
            "bank_partnerships": {
                "total_bounties": len(bounties),
                "total_bounty_amount": sum(float(b.bounty_amount) for b in bounties),
                "prevention_rate": 0
            }
        }

    def _calculate_credit_score(self, metrics: Dict[str, Any]) -> int:
        """Calculate credit score (simplified model)"""
        score = 750  # Base score

        # Payment history (35% weight)
        payment_history = metrics.get("payment_history", {})
        if payment_history.get("total_payments", 0) > 0:
            on_time_rate = payment_history.get("on_time_payments", 0) / payment_history.get("total_payments", 1)
            score += (on_time_rate - 0.9) * 150

        # Credit utilization (30% weight)
        utilization = metrics.get("credit_utilization", {})
        total_limit = utilization.get("total_credit_limit", 1)
        if total_limit > 0:
            util_rate = utilization.get("total_balance", 0) / total_limit
            score += (0.3 - util_rate) * 100  # Optimal at 30%

        # Account age (15% weight)
        account_age = metrics.get("account_age", {})
        if account_age.get("oldest_account"):
            years = (datetime.now(timezone.utc) - account_age["oldest_account"]).days / 365
            score += min(50, years * 5)

        # Bank partnerships (20% weight)
        partnerships = metrics.get("bank_partnerships", {})
        if partnerships.get("total_bounties", 0) > 0:
            score += min(100, partnerships.get("total_bounty_amount", 0) / 100)

        return max(300, min(850, int(score)))

    def _get_score_range(self, score: int) -> str:
        """Get credit score range description"""
        if score >= 800:
            return "Excellent"
        elif score >= 750:
            return "Very Good"
        elif score >= 700:
            return "Good"
        elif score >= 650:
            return "Fair"
        else:
            return "Poor"

    def _generate_credit_recommendations(self, metrics: Dict[str, Any], score: int) -> List[Dict[str, Any]]:
        """Generate credit improvement recommendations"""
        recommendations = []

        if score < 700:
            recommendations.append({
                "type": "score_improvement",
                "title": "Focus on on-time payments",
                "description": "Payment history is the most important factor for your credit score.",
                "potential_score_increase": "50-100 points"
            })

        utilization = metrics.get("credit_utilization", {})
        total_limit = utilization.get("total_credit_limit", 1)
        if total_limit > 0:
            util_rate = utilization.get("total_balance", 0) / total_limit
            if util_rate > 0.3:
                recommendations.append({
                    "type": "utilization_reduction",
                    "title": "Reduce credit utilization",
                    "description": "Keep your credit utilization below 30% for optimal scoring.",
                    "current_utilization": round(util_rate * 100, 1),
                    "target_utilization": 30,
                    "potential_score_increase": "20-50 points"
                })

        return recommendations

    # Caching methods

    async def _get_cached_data(self, key: str) -> Any:
        """Get cached data"""
        try:
            cached_data = redis_client.get(key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            print(f"Cache get error: {e}")
        return None

    async def _cache_data(self, key: str, data: Any, ttl: timedelta):
        """Cache data with TTL"""
        try:
            redis_client.setex(key, int(ttl.total_seconds()), json.dumps(data, default=str))
        except Exception as e:
            print(f"Cache set error: {e}")

    # Additional helper methods would be implemented here...
    def _get_seasonal_factor(self, date: datetime) -> float:
        """Get seasonal adjustment factor"""
        # Simplified seasonal factors
        month = date.month
        seasonal_factors = {
            1: 1.2,   # January - post-holiday spending
            2: 0.8,   # February - recovery month
            3: 0.9,    # March - normal
            4: 0.9,    # April - normal
            5: 1.0,    # May - slight increase
            6: 1.0,    # June - vacation season
            7: 1.1,    # July - vacation season
            8: 1.0,    # August - back to normal
            9: 1.0,    # September - normal
            10: 1.1,   # October - festival season
            11: 1.2,   # November - holiday season
            12: 1.3    # December - peak spending
        }
        return seasonal_factors.get(month, 1.0)

    def _calculate_forecast_confidence(self, payments: List[Payment], active_cards: int, months: int) -> str:
        """Calculate forecast confidence level"""
        if len(payments) < 3:
            return "low"
        elif len(payments) < 6:
            return "medium"
        elif months <= 3:
            return "high"
        elif months <= 6:
            return "medium"
        else:
            return "low"


# Global analytics service instance
ai_analytics_service = AIAnalyticsService()

# Convenience functions
async def get_card_spending_analysis(card: CreditCard, start_date: date, end_date: date, category: Optional[str] = None) -> Dict[str, Any]:
    """Convenience function for card spending analysis"""
    return await ai_analytics_service.get_card_spending(card, start_date, end_date, category)

async def get_credit_score_insights(user: User, db: Session) -> Dict[str, Any]:
    """Convenience function for credit score analysis"""
    return await ai_analytics_service.get_credit_score_analysis(user, db)

async def generate_financial_insights(cards: List[CreditCard], payments: List[Payment], bounties: List[BankBounty]) -> List[Dict[str, Any]]:
    """Convenience function for financial insights"""
    return await ai_analytics_service.generate_financial_insights(cards, payments, bounties)

async def format_spending_export(transactions: List[Dict[str, Any]], format_type: str) -> Any:
    """Convenience function for spending export formatting"""
    return await ai_analytics_service.format_export_data(transactions, format_type)