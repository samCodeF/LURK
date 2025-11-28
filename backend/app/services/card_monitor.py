"""
Card Monitor Service for Lurk - Bank API Integration
Monitors credit cards, fetches statements, and tracks due dates
"""

import os
import asyncio
import json
import aiohttp
import logging
from datetime import datetime, timedelta, timezone, date
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import pytz
import redis
from decimal import Decimal

from app.models.credit_card import CreditCard, BankName, CardType, CardStatus, ApiStatus
from app.models.user import User
from app.utils.encryption import encrypt_sensitive_data, decrypt_sensitive_data
from app.utils.audit import log_system_event

# Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

# Bank API configurations (in production, these would be in secure storage)
BANK_API_CONFIGS = {
    BankName.HDFC: {
        "base_url": "https://api.hdfcbank.com",
        "auth_type": "oauth2",
        "timeout": 30,
        "retry_attempts": 3,
        "rate_limit": {"requests_per_minute": 30, "burst": 5}
    },
    BankName.ICICI: {
        "base_url": "https://api.icicibank.com",
        "auth_type": "api_key",
        "timeout": 25,
        "retry_attempts": 3,
        "rate_limit": {"requests_per_minute": 25, "burst": 3}
    },
    BankName.SBI: {
        "base_url": "https://api.sbicard.com",
        "auth_type": "oauth2",
        "timeout": 35,
        "retry_attempts": 4,
        "rate_limit": {"requests_per_minute": 20, "burst": 2}
    },
    BankName.AXIS: {
        "base_url": "https://api.axisbank.com",
        "auth_type": "oauth2",
        "timeout": 30,
        "retry_attempts": 3,
        "rate_limit": {"requests_per_minute": 30, "burst": 5}
    }
}

# Redis for caching and rate limiting
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, decode_responses=True)

logger = logging.getLogger(__name__)

class CardMonitorService:
    """Service for monitoring credit cards via bank APIs"""

    def __init__(self):
        self.session = None
        self.cache_prefix = "card_cache:"
        self.rate_limit_prefix = "bank_rate:"
        self.api_errors_prefix = "api_errors:"

    async def __aenter__(self):
        """Initialize aiohttp session"""
        timeout = aiohttp.ClientTimeout(total=30)
        connector = aiohttp.TCPConnector(limit=100, limit_per_host=20)
        self.session = aiohttp.ClientSession(
            timeout=timeout,
            connector=connector,
            headers={
                "User-Agent": "Lurk/1.0",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Clean up aiohttp session"""
        if self.session:
            await self.session.close()

    async def sync_card(self, card: CreditCard, db: Session) -> Dict[str, Any]:
        """Sync individual card with bank API"""
        try:
            if not self.session:
                await self.__aenter__()

            # Check rate limiting
            if await self._is_rate_limited(card.bank_name.value):
                return {
                    "success": False,
                    "message": "Rate limit exceeded. Please try again later.",
                    "error_code": "RATE_LIMIT_EXCEEDED"
                }

            # Get bank config
            bank_config = BANK_API_CONFIGS.get(card.bank_name)
            if not bank_config:
                return {
                    "success": False,
                    "message": f"Bank {card.bank_name.value} not supported",
                    "error_code": "BANK_NOT_SUPPORTED"
                }

            # Prepare API request
            api_url = f"{bank_config['base_url']}/cards/{card.card_token}/statement"
            headers, params = await self._prepare_request(card, bank_config)

            # Make API call with retry logic
            card_data = await self._make_api_request(
                api_url, headers, params, bank_config["retry_attempts"]
            )

            if not card_data:
                return {
                    "success": False,
                    "message": "Failed to fetch card data from bank API",
                    "error_code": "API_FAILURE"
                }

            # Validate and process card data
            processed_data = await self._process_card_data(card_data, card)

            if processed_data:
                # Update card with new data
                await self._update_card_from_api(card, processed_data, db)

                # Cache the data
                await self._cache_card_data(str(card.id), processed_data)

                # Log successful sync
                await log_system_event(
                    event_type="CARD_SYNC_SUCCESS",
                    details={
                        "card_id": str(card.id),
                        "bank": card.bank_name.value,
                        "last4": card.card_last4,
                        "data_points": len(processed_data.get("transactions", []))
                    }
                )

                return {
                    "success": True,
                    "message": "Card synced successfully",
                    "data": processed_data,
                    "error_code": None
                }

        except Exception as e:
            error_msg = f"Card sync error: {str(e)}"
            logger.error(error_msg)

            # Log error
            await log_system_event(
                event_type="CARD_SYNC_ERROR",
                details={
                    "card_id": str(card.id),
                    "bank": card.bank_name.value,
                    "error": str(e)
                }
            )

            # Track error for monitoring
            await self._track_api_error(card.bank_name.value, str(e))

            return {
                "success": False,
                "message": "Card sync failed due to system error",
                "error_code": "SYSTEM_ERROR"
            }

    async def get_statement(
        self, card: CreditCard, month: Optional[int] = None, year: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get credit card statement for specific month"""
        try:
            if not self.session:
                await self.__aenter__()

            # Default to current month
            now = datetime.now(timezone.utc)
            target_month = month or now.month
            target_year = year or now.year

            # Check cache first
            cache_key = f"{self.cache_prefix}statement:{card.id}:{target_year}:{target_month}"
            cached_statement = await self._get_cached_data(cache_key)
            if cached_statement:
                return cached_statement

            # Get bank config
            bank_config = BANK_API_CONFIGS.get(card.bank_name)
            if not bank_config:
                return None

            # Prepare API request for statement
            api_url = f"{bank_config['base_url']}/cards/{card.card_token}/statement"
            headers, params = await self._prepare_request(card, bank_config)

            # Add month/year parameters
            params["month"] = target_month
            params["year"] = target_year

            # Make API call
            statement_data = await self._make_api_request(
                api_url, headers, params, bank_config["retry_attempts"]
            )

            if statement_data:
                # Process statement data
                processed_statement = await self._process_statement_data(
                    statement_data, card, target_month, target_year
                )

                # Cache for 24 hours
                await self._cache_data(cache_key, processed_statement, timedelta(hours=24))

                return processed_statement

        except Exception as e:
            logger.error(f"Statement fetch error: {str(e)}")
            await log_system_event(
                event_type="STATEMENT_FETCH_ERROR",
                details={
                    "card_id": str(card.id),
                    "month": target_month,
                    "year": target_year,
                    "error": str(e)
                }
            )

        return None

    async def get_balance(self, card: CreditCard) -> Dict[str, Any]:
        """Get current balance and available credit"""
        try:
            if not self.session:
                await self.__aenter__()

            # Check cache first (shorter cache for balance)
            cache_key = f"{self.cache_prefix}balance:{card.id}"
            cached_balance = await self._get_cached_data(cache_key)
            if cached_balance:
                return cached_balance

            # Get bank config
            bank_config = BANK_API_CONFIGS.get(card.bank_name)
            if not bank_config:
                return None

            # Prepare API request for balance
            api_url = f"{bank_config['base_url']}/cards/{card.card_token}/balance"
            headers, params = await self._prepare_request(card, bank_config)

            # Make API call
            balance_data = await self._make_api_request(
                api_url, headers, params, bank_config["retry_attempts"]
            )

            if balance_data:
                # Process balance data
                processed_balance = {
                    "current_balance": Decimal(str(balance_data.get("current_balance", 0))),
                    "available_credit": Decimal(str(balance_data.get("available_credit", 0))),
                    "credit_limit": Decimal(str(balance_data.get("credit_limit", 0))),
                    "minimum_due": Decimal(str(balance_data.get("minimum_due", 0))),
                    "total_due": Decimal(str(balance_data.get("total_due", 0))),
                    "payment_due_date": self._parse_date(balance_data.get("payment_due_date")),
                    "last_updated": datetime.now(timezone.utc)
                }

                # Cache for 5 minutes
                await self._cache_data(cache_key, processed_balance, timedelta(minutes=5))

                return processed_balance

        except Exception as e:
            logger.error(f"Balance fetch error: {str(e)}")
            await log_system_event(
                event_type="BALANCE_FETCH_ERROR",
                details={
                    "card_id": str(card.id),
                    "error": str(e)
                }
            )

        return None

    async def monitor_all_cards(self, db: Session) -> Dict[str, Any]:
        """Monitor all active cards for payment reminders"""
        try:
            # Get all active cards with auto-payment enabled
            cards_to_monitor = db.query(CreditCard).filter(
                and_(
                    CreditCard.card_status == CardStatus.ACTIVE,
                    CreditCard.auto_payment_enabled == True,
                    CreditCard.api_connected == True,
                    or_(
                        CreditCard.payment_due_date <= datetime.now(timezone.utc) + timedelta(hours=48),
                        CreditCard.minimum_due > 0
                    )
                )
            ).all()

            results = {
                "monitored": 0,
                "payments_needed": 0,
                "errors": 0,
                "cards_processed": []
            }

            for card in cards_to_monitor:
                try:
                    # Get latest balance and due info
                    balance_data = await self.get_balance(card)

                    if balance_data:
                        # Check if payment is needed
                        if (balance_data["minimum_due"] > 0 and
                            balance_data["payment_due_date"] and
                            balance_data["payment_due_date"] <= datetime.now(timezone.utc) + timedelta(hours=card.payment_buffer_hours)):

                            results["payments_needed"] += 1
                            card_info = {
                                "card_id": str(card.id),
                                "bank": card.bank_name.value,
                                "last4": card.card_last4,
                                "minimum_due": float(balance_data["minimum_due"]),
                                "payment_due_date": balance_data["payment_due_date"].isoformat(),
                                "hours_until_due": self._calculate_hours_until_due(balance_data["payment_due_date"])
                            }
                            results["cards_processed"].append(card_info)

                    results["monitored"] += 1

                except Exception as e:
                    results["errors"] += 1
                    logger.error(f"Error monitoring card {card.id}: {str(e)}")

            # Log monitoring results
            await log_system_event(
                event_type="CARD_MONITORING_COMPLETED",
                details={
                    "cards_monitored": results["monitored"],
                    "payments_needed": results["payments_needed"],
                    "errors": results["errors"],
                    "processing_time": datetime.now(timezone.utc).isoformat()
                }
            )

            return results

        except Exception as e:
            logger.error(f"Card monitoring error: {str(e)}")
            await log_system_event(
                event_type="CARD_MONITORING_ERROR",
                details={"error": str(e)}
            )

            return {"error": str(e)}

    # Private helper methods

    async def _prepare_request(
        self, card: CreditCard, bank_config: Dict[str, Any]
    ) -> tuple[Dict[str, str], Dict[str, Any]]:
        """Prepare API request headers and parameters"""
        headers = {
            "User-Agent": "Lurk/1.0",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        params = {}

        # Add authentication based on bank
        if bank_config["auth_type"] == "oauth2":
            # Get OAuth token (in production, this would be from secure storage)
            token = await self._get_oauth_token(card.bank_name.value)
            if token:
                headers["Authorization"] = f"Bearer {token}"

        elif bank_config["auth_type"] == "api_key":
            # Get API key (in production, this would be from secure storage)
            api_key = await self._get_api_key(card.bank_name.value)
            if api_key:
                headers["X-API-Key"] = api_key

        return headers, params

    async def _make_api_request(
        self, url: str, headers: Dict[str, str], params: Dict[str, Any], retry_attempts: int = 3
    ) -> Optional[Dict[str, Any]]:
        """Make API request with retry logic"""
        for attempt in range(retry_attempts):
            try:
                async with self.session.get(url, headers=headers, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data
                    elif response.status == 429:
                        # Rate limited - wait and retry
                        retry_after = int(response.headers.get("Retry-After", 60))
                        await asyncio.sleep(retry_after)
                        continue
                    elif response.status in [401, 403]:
                        # Authentication error
                        logger.warning(f"Authentication error for {url}: {response.status}")
                        return None
                    else:
                        # Other error - log and continue
                        logger.warning(f"API error for {url}: {response.status}")
                        if attempt == retry_attempts - 1:
                            return None
                        await asyncio.sleep(2 ** attempt)  # Exponential backoff

            except asyncio.TimeoutError:
                if attempt == retry_attempts - 1:
                    logger.error(f"Timeout error for {url} after {retry_attempts} attempts")
                    return None
                await asyncio.sleep(2 ** attempt)

            except Exception as e:
                logger.error(f"Request error for {url}: {str(e)}")
                if attempt == retry_attempts - 1:
                    return None
                await asyncio.sleep(2 ** attempt)

        return None

    async def _process_card_data(self, raw_data: Dict[str, Any], card: CreditCard) -> Dict[str, Any]:
        """Process and validate raw card data from API"""
        try:
            # Map API response to standardized format
            processed_data = {
                "statement_date": self._parse_date(raw_data.get("statement_date")),
                "due_date": self._parse_date(raw_data.get("due_date")),
                "minimum_amount": Decimal(str(raw_data.get("minimum_due", 0))),
                "total_amount": Decimal(str(raw_data.get("total_due", 0))),
                "current_balance": Decimal(str(raw_data.get("current_balance", 0))),
                "available_credit": Decimal(str(raw_data.get("available_credit", 0))),
                "credit_limit": Decimal(str(raw_data.get("credit_limit", 0))),
                "transactions": await self._process_transactions(
                    raw_data.get("transactions", [])
                )
            }

            # Validate data integrity
            if not processed_data["statement_date"] or not processed_data["due_date"]:
                raise ValueError("Missing required date fields")

            if processed_data["minimum_amount"] < 0 or processed_data["total_amount"] < 0:
                raise ValueError("Invalid amounts")

            return processed_data

        except Exception as e:
            logger.error(f"Error processing card data: {str(e)}")
            return None

    async def _process_transactions(self, raw_transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process transaction list from API"""
        processed_transactions = []

        for tx in raw_transactions:
            try:
                processed_tx = {
                    "transaction_id": str(tx.get("id", "")),
                    "date": self._parse_date(tx.get("date")),
                    "description": tx.get("description", ""),
                    "amount": Decimal(str(tx.get("amount", 0))),
                    "category": tx.get("category", "other"),
                    "merchant": tx.get("merchant", ""),
                    "type": tx.get("type", "purchase")  # purchase, cash_advance, payment, etc.
                }

                processed_transactions.append(processed_tx)

            except Exception as e:
                logger.warning(f"Error processing transaction: {str(e)}")
                continue

        return processed_transactions

    async def _process_statement_data(
        self, raw_data: Dict[str, Any], card: CreditCard, month: int, year: int
    ) -> Dict[str, Any]:
        """Process statement data from API"""
        return {
            "statement_date": date(year, month, 1),
            "payment_due_date": self._parse_date(raw_data.get("due_date")),
            "opening_balance": Decimal(str(raw_data.get("opening_balance", 0))),
            "closing_balance": Decimal(str(raw_data.get("closing_balance", 0))),
            "minimum_due": Decimal(str(raw_data.get("minimum_due", 0))),
            "total_due": Decimal(str(raw_data.get("total_due", 0))),
            "transactions": await self._process_transactions(
                raw_data.get("transactions", [])
            )
        }

    async def _update_card_from_api(
        self, card: CreditCard, data: Dict[str, Any], db: Session
    ):
        """Update card record with API data"""
        card.current_balance = data["current_balance"]
        card.available_credit = data["available_credit"]
        card.minimum_due = data["minimum_amount"]
        card.total_due = data["total_amount"]
        card.payment_due_date = data["due_date"]
        card.api_status = ApiStatus.CONNECTED
        card.last_sync = datetime.now(timezone.utc)
        card.sync_error = None

        db.commit()

    async def _is_rate_limited(self, bank_name: str) -> bool:
        """Check if bank API is rate limited"""
        rate_key = f"{self.rate_limit_prefix}{bank_name}"
        current_requests = await self._get_cached_data(rate_key) or 0

        bank_config = BANK_API_CONFIGS.get(BankName(bank_name), {})
        rate_limit = bank_config.get("rate_limit", {})
        max_requests = rate_limit.get("requests_per_minute", 30)

        return current_requests >= max_requests

    async def _cache_card_data(self, card_id: str, data: Dict[str, Any]):
        """Cache card data"""
        cache_key = f"{self.cache_prefix}card:{card_id}"
        await self._cache_data(cache_key, data, timedelta(minutes=10))

    async def _cache_data(self, key: str, data: Any, ttl: timedelta):
        """Cache data with TTL"""
        try:
            await redis_client.setex(
                key,
                int(ttl.total_seconds()),
                json.dumps(data, default=str)
            )
        except Exception as e:
            logger.error(f"Cache error: {str(e)}")

    async def _get_cached_data(self, key: str) -> Any:
        """Get cached data"""
        try:
            cached_data = await redis_client.get(key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.error(f"Cache get error: {str(e)}")
        return None

    async def _track_api_error(self, bank_name: str, error: str):
        """Track API errors for monitoring"""
        error_key = f"{self.api_errors_prefix}{bank_name}"
        try:
            await redis_client.lpush(error_key, json.dumps({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": error
            }))
            await redis_client.expire(error_key, timedelta(hours=24))
        except Exception as e:
            logger.error(f"Error tracking failed: {str(e)}")

    async def _get_oauth_token(self, bank_name: str) -> Optional[str]:
        """Get OAuth token for bank (mock implementation)"""
        # In production, this would securely retrieve stored tokens
        token_key = f"oauth_token:{bank_name}"
        return await redis_client.get(token_key)

    async def _get_api_key(self, bank_name: str) -> Optional[str]:
        """Get API key for bank (mock implementation)"""
        # In production, this would securely retrieve stored keys
        api_key_key = f"api_key:{bank_name}"
        return await redis_client.get(api_key_key)

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse date string from various formats"""
        if not date_str:
            return None

        formats = [
            "%Y-%m-%d",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S.%fZ",
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

        logger.warning(f"Could not parse date: {date_str}")
        return None

    def _calculate_hours_until_due(self, due_date: datetime) -> int:
        """Calculate hours until due date"""
        now = datetime.now(timezone.utc)
        if due_date <= now:
            return 0
        return int((due_date - now).total_seconds() / 3600)


# Global service instance
card_monitor_service = CardMonitorService()

# Convenience functions
async def monitor_all_cards(db: Session) -> Dict[str, Any]:
    """Convenience function for monitoring all cards"""
    async with card_monitor_service as monitor:
        return await monitor.monitor_all_cards(db)

async def sync_single_card(card: CreditCard, db: Session) -> Dict[str, Any]:
    """Convenience function for syncing single card"""
    async with card_monitor_service as monitor:
        return await monitor.sync_card(card, db)

async def get_card_balance(card: CreditCard) -> Dict[str, Any]:
    """Convenience function for getting card balance"""
    async with card_monitor_service as monitor:
        return await monitor.get_balance(card)

async def get_card_statement(
    card: CreditCard, month: Optional[int] = None, year: Optional[int] = None
) -> Dict[str, Any]:
    """Convenience function for getting card statement"""
    async with card_monitor_service as monitor:
        return await monitor.get_statement(card, month, year)