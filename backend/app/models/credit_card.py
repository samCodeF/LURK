"""
Credit Card model for Lurk app - Credit Card Automation
"""

from sqlalchemy import Column, String, Boolean, Integer, DateTime, Enum, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pydantic import BaseModel, validator
from enum import Enum as PydanticEnum
from datetime import datetime, date
import uuid

# Enums
class CardType(str, PydanticEnum):
    VISA = "visa"
    MASTERCARD = "mastercard"
    AMEX = "amex"
    RUPAY = "rupay"
    DISCOVER = "discover"
    DINERS = "diners"
    JCB = "jcb"

class BankName(str, PydanticEnum):
    HDFC = "hdfc"
    ICICI = "icici"
    SBI = "sbi"
    AXIS = "axis"
    KOTAK = "kotak"
    YES_BANK = "yes_bank"
    PNB = "pnb"
    BOB = "bob"
    CBI = "cbi"
    CANARA = "canara"
    OTHER = "other"

class CardStatus(str, PydanticEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLOCKED = "blocked"
    EXPIRED = "expired"
    PENDING_VERIFICATION = "pending_verification"

class ApiStatus(str, PydanticEnum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    PENDING = "pending"

# SQLAlchemy Credit Card Model
class CreditCard(Base):
    __tablename__ = "credit_cards"

    # Primary Keys
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Card Information (Tokenized - never store full PAN)
    card_token = Column(String(255), nullable=True)  # Razorpay/PG token
    card_last4 = Column(String(4), nullable=False)
    card_brand = Column(Enum(CardType), nullable=False)
    card_name = Column(String(100), nullable=True)  # User's custom name
    bank_name = Column(Enum(BankName), nullable=False)

    # Card Details (Non-sensitive)
    expiry_month = Column(Integer, nullable=False)
    expiry_year = Column(Integer, nullable=False)
    is_virtual = Column(Boolean, default=False)

    # Credit Limits and Balances
    credit_limit = Column(Numeric(12, 2), nullable=True)
    current_balance = Column(Numeric(12, 2), default=0)
    available_credit = Column(Numeric(12, 2), nullable=True)
    minimum_due_percent = Column(Numeric(5, 2), default=5.0)  # Usually 5%

    # Billing Cycle Information
    billing_cycle_day = Column(Integer, nullable=False)  # Day of month (1-31)
    due_date = Column(Integer, nullable=False)  # Days after statement date
    statement_date = Column(Integer, nullable=True)  # Day of month for statement
    minimum_due = Column(Numeric(12, 2), default=0)
    total_due = Column(Numeric(12, 2), default=0)
    payment_due_date = Column(DateTime(timezone=True), nullable=True)

    # Interest Rates and Fees
    interest_rate = Column(Numeric(5, 2), default=42.0)  # Annual percentage rate
    late_fee_amount = Column(Numeric(8, 2), default=500)  # Default late fee
    cash_advance_fee = Column(Numeric(5, 2), default=3.0)  # Percentage

    # Status and Integration
    card_status = Column(Enum(CardStatus), default=CardStatus.ACTIVE)
    api_status = Column(Enum(ApiStatus), default=ApiStatus.PENDING)
    api_connected = Column(Boolean, default=False)
    last_sync = Column(DateTime(timezone=True), nullable=True)
    sync_error = Column(Text, nullable=True)

    # Automation Settings
    auto_payment_enabled = Column(Boolean, default=True)
    payment_preference = Column(String(50), default="minimum_due")  # minimum_due, full_amount, custom
    custom_payment_amount = Column(Numeric(12, 2), nullable=True)
    payment_buffer_hours = Column(Integer, default=24)  # Hours before due date

    # Rewards and Cashback
    rewards_enabled = Column(Boolean, default=True)
    rewards_points = Column(Numeric(10, 2), default=0)
    cashback_rate = Column(Numeric(5, 2), default=0.0)

    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_payment = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="credit_cards")
    payments = relationship("Payment", back_populates="credit_card")
    bank_bounties = relationship("BankBounty", back_populates="credit_card")

    def __repr__(self):
        return f"<CreditCard(last4={self.card_last4}, bank={self.bank_name}, status={self.card_status})>"

# Pydantic Schemas
class CreditCardBase(BaseModel):
    card_last4: str
    card_brand: CardType
    bank_name: BankName
    card_name: str | None = None
    expiry_month: int
    expiry_year: int
    billing_cycle_day: int
    due_date: int
    credit_limit: float | None = None
    auto_payment_enabled: bool = True

    @validator('card_last4')
    def validate_last4(cls, v):
        if not v.isdigit() or len(v) != 4:
            raise ValueError('card_last4 must be exactly 4 digits')
        return v

    @validator('expiry_month')
    def validate_expiry_month(cls, v):
        if not 1 <= v <= 12:
            raise ValueError('expiry_month must be between 1 and 12')
        return v

    @validator('expiry_year')
    def validate_expiry_year(cls, v):
        current_year = datetime.now().year
        if v < current_year or v > current_year + 20:
            raise ValueError(f'expiry_year must be between {current_year} and {current_year + 20}')
        return v

    @validator('billing_cycle_day')
    def validate_billing_cycle_day(cls, v):
        if not 1 <= v <= 31:
            raise ValueError('billing_cycle_day must be between 1 and 31')
        return v

    @validator('due_date')
    def validate_due_date(cls, v):
        if not 10 <= v <= 60:  # Typical credit card due periods
            raise ValueError('due_date must be between 10 and 60 days')
        return v

class CreditCardCreate(CreditCardBase):
    card_token: str | None = None

class CreditCardUpdate(BaseModel):
    card_name: str | None = None
    auto_payment_enabled: bool | None = None
    payment_preference: str | None = None
    custom_payment_amount: float | None = None
    payment_buffer_hours: int | None = None
    rewards_enabled: bool | None = None

class CreditCardResponse(CreditCardBase):
    id: str
    user_id: str
    current_balance: float
    available_credit: float | None
    minimum_due: float
    total_due: float
    payment_due_date: datetime | None
    interest_rate: float
    late_fee_amount: float
    card_status: CardStatus
    api_status: ApiStatus
    api_connected: bool
    last_sync: datetime | None
    created_at: datetime
    rewards_points: float | None = None

    class Config:
        from_attributes = True

class CardStatement(BaseModel):
    statement_date: date
    payment_due_date: date
    opening_balance: float
    closing_balance: float
    minimum_due: float
    total_due: float
    transactions: list[dict] = []

class CardBalance(BaseModel):
    current_balance: float
    available_credit: float
    credit_limit: float | None
    utilization_percent: float
    minimum_due: float
    payment_due_date: datetime | None

class CardApiData(BaseModel):
    statement_date: date
    due_date: date
    minimum_amount: float
    total_amount: float
    transactions: list[dict]
    current_balance: float
    available_credit: float

# Bank Integration Schemas
class BankApiConnection(BaseModel):
    bank_name: BankName
    customer_id: str | None = None
    api_key: str | None = None
    webhooks_enabled: bool = True

class CardSyncResult(BaseModel):
    card_id: str
    success: bool
    message: str
    data: CardApiData | None = None
    error_code: str | None = None