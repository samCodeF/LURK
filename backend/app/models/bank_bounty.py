"""
Bank Bounty model for Lurk app - Credit Card Automation
Banks pay bounties for preventing NPA (Non-Performing Assets)
"""

from sqlalchemy import Column, String, Boolean, DateTime, Enum, Numeric, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pydantic import BaseModel, validator
from enum import Enum as PydanticEnum
from datetime import datetime, date
import uuid

# Enums
class BountyType(str, PydanticEnum):
    PREVENTION = "prevention"        # Prevented missed payment
    RECOVERY = "recovery"           # Recovered outstanding payment
    ENGAGEMENT = "engagement"       # High user engagement
    REFERRAL = "referral"           # User referral from bank
    DATA_INSIGHT = "data_insight"   # Anonymized behavioral data
    FEATURE_USAGE = "feature_usage" # Premium feature usage

class BountyStatus(str, PydanticEnum):
    PENDING = "pending"
    APPROVED = "approved"
    PROCESSED = "processed"
    PAID = "paid"
    REJECTED = "rejected"
    DISPUTED = "disputed"

class BountyFrequency(str, PydanticEnum):
    ONE_TIME = "one_time"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    PER_PREVENTION = "per_prevention"
    PER_USER = "per_user"

class PaymentPartner(str, PydanticEnum):
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
    RAZORPAY = "razorpay"
    PAYU = "payu"
    CASHFREE = "cashfree"

# SQLAlchemy Bank Bounty Model
class BankBounty(Base):
    __tablename__ = "bank_bounties"

    # Primary Keys
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    card_id = Column(UUID(as_uuid=True), ForeignKey("credit_cards.id"), nullable=True, index=True)

    # Bounty Information
    bounty_type = Column(Enum(BountyType), nullable=False)
    bank_name = Column(String(100), nullable=False)
    payment_partner = Column(Enum(PaymentPartner), nullable=True)
    bounty_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="INR")

    # Prevention Details
    original_due_amount = Column(Numeric(12, 2), nullable=True)  # Original amount that was due
    original_due_date = Column(DateTime(timezone=True), nullable=True)  # Original due date
    days_late = Column(Integer, default=0)  # How many days late it would have been
    interest_prevented = Column(Numeric(12, 2), default=0)  # Interest saved by user
    late_fee_prevented = Column(Numeric(8, 2), default=0)  # Late fee saved by user

    # Bounty Calculation
    base_rate = Column(Numeric(8, 2), nullable=True)  # Base bounty rate
    multiplier = Column(Numeric(5, 2), default=1.0)  # Multiplier based on user tier
    calculated_amount = Column(Numeric(10, 2), nullable=False)
    calculation_method = Column(String(100), nullable=True)

    # Status and Tracking
    status = Column(Enum(BountyStatus), default=BountyStatus.PENDING)
    prevention_date = Column(DateTime(timezone=True), nullable=False)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    paid_date = Column(DateTime(timezone=True), nullable=True)
    payment_reference = Column(String(255), nullable=True)

    # Payment Details
    payment_method = Column(String(50), nullable=True)  # NEFT, IMPS, etc.
    bank_account_number = Column(String(30), nullable=True)  # Account for bounty payment
    payout_reference = Column(String(255), nullable=True)

    # Quality Metrics
    user_tier = Column(String(20), nullable=True)  # free, silver, gold, platinum
    subscription_status = Column(String(20), nullable=True)
    engagement_score = Column(Numeric(5, 2), default=0)  # User engagement score
    risk_score = Column(Numeric(5, 2), default=0)  # User risk assessment

    # Audit and Documentation
    approved_by = Column(String(100), nullable=True)  # Who approved the bounty
    rejection_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    supporting_documents = Column(Text, nullable=True)  # JSON array of document URLs
    internal_reference = Column(String(100), nullable=True)  # Internal bank reference

    # Contract Information
    contract_id = Column(String(100), nullable=True)  # Bank partnership contract
    contract_rate = Column(Numeric(8, 2), nullable=True)  # Contracted rate
    is_premium_partner = Column(Boolean, default=False)

    # Relationships
    payment = relationship("Payment", back_populates="bank_bounty")
    user = relationship("User", back_populates="bank_bounties")
    credit_card = relationship("CreditCard", back_populates="bank_bounties")

    def __repr__(self):
        return f"<BankBounty(id={self.id}, bank={self.bank_name}, amount={self.bounty_amount}, status={self.status})>"

# Bounty Contract Model (for bank partnerships)
class BountyContract(Base):
    __tablename__ = "bounty_contracts"

    # Primary Keys
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bank_name = Column(String(100), nullable=False, unique=True)
    payment_partner = Column(Enum(PaymentPartner), nullable=True)

    # Contract Details
    contract_start_date = Column(DateTime(timezone=True), nullable=False)
    contract_end_date = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    auto_renew = Column(Boolean, default=False)

    # Bounty Rates (in INR)
    base_bounty_rate = Column(Numeric(8, 2), default=150.00)  # Base rate per prevention
    premium_bounty_rate = Column(Numeric(8, 2), default=400.00)  # Premium rate
    engagement_bonus_rate = Column(Numeric(8, 2), default=50.00)  # Bonus for high engagement
    referral_bounty_rate = Column(Numeric(8, 2), default=1000.00)  # Per successful referral

    # Multipliers
    free_user_multiplier = Column(Numeric(5, 2), default=1.0)
    silver_user_multiplier = Column(Numeric(5, 2), default=1.5)
    gold_user_multiplier = Column(Numeric(5, 2), default=2.0)
    platinum_user_multiplier = Column(Numeric(5, 2), default=3.0)

    # Contract Terms
    monthly_minimum = Column(Numeric(10, 2), nullable=True)  # Minimum monthly guarantee
    monthly_maximum = Column(Numeric(10, 2), nullable=True)  # Maximum monthly cap
    payment_terms = Column(String(50), default="NET_30")  # Payment terms
    reporting_frequency = Column(String(20), default="monthly")

    # Integration Details
    api_endpoint = Column(String(255), nullable=True)
    webhook_url = Column(String(255), nullable=True)
    authentication_method = Column(String(50), nullable=True)
    api_credentials = Column(Text, nullable=True)  # Encrypted credentials

    # Contact Information
    primary_contact_name = Column(String(100), nullable=True)
    primary_contact_email = Column(String(255), nullable=True)
    primary_contact_phone = Column(String(20), nullable=True)
    billing_contact_name = Column(String(100), nullable=True)
    billing_contact_email = Column(String(255), nullable=True)

    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(100), nullable=True)
    last_modified_by = Column(String(100), nullable=True)

    def __repr__(self):
        return f"<BountyContract(bank={self.bank_name}, base_rate={self.base_bounty_rate}, active={self.is_active})>"

# Pydantic Schemas
class BankBountyBase(BaseModel):
    bounty_type: BountyType
    bank_name: str
    bounty_amount: float
    prevention_date: datetime

    @validator('bounty_amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('bounty_amount must be greater than 0')
        if v > 100000:  # Reasonable upper limit for single bounty
            raise ValueError('bounty_amount exceeds maximum limit')
        return v

class BankBountyCreate(BankBountyBase):
    payment_id: str | None = None
    user_id: str
    card_id: str | None = None
    payment_partner: PaymentPartner | None = None
    original_due_amount: float | None = None
    original_due_date: datetime | None = None
    days_late: int = 0
    interest_prevented: float = 0
    late_fee_prevented: float = 0

class BankBountyUpdate(BaseModel):
    status: BountyStatus | None = None
    approved_at: datetime | None = None
    processed_at: datetime | None = None
    paid_date: datetime | None = None
    payment_reference: str | None = None
    payment_method: str | None = None
    rejection_reason: str | None = None
    notes: str | None = None

class BankBountyResponse(BankBountyBase):
    id: str
    payment_id: str | None
    user_id: str
    card_id: str | None
    payment_partner: PaymentPartner | None
    status: BountyStatus
    calculated_amount: float
    base_rate: float | None
    multiplier: float
    user_tier: str | None
    subscription_status: str | None
    engagement_score: float
    approved_at: datetime | None
    processed_at: datetime | None
    paid_date: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True

class BountySummary(BaseModel):
    total_bounties: int
    total_amount: float
    pending_bounties: int
    approved_bounties: int
    paid_bounties: int
    monthly_average: float
    top_bank: str
    average_bounty_amount: float

class BountyAnalytics(BaseModel):
    monthly_bounties: list[dict]  # Monthly bounty amounts and counts
    bank_breakdown: dict[str, float]  # Bounty amounts by bank
    bounty_types: dict[BountyType, int]  # Count by bounty type
    user_tier_impact: dict[str, float]  # Bounty amounts by user tier
    payment_trends: list[dict]  # Payment timing and status trends
    projected_monthly: float  # Projected bounty for current month

class BountyContractBase(BaseModel):
    bank_name: str
    base_bounty_rate: float = 150.00
    premium_bounty_rate: float = 400.00
    contract_start_date: datetime
    contract_end_date: datetime | None = None
    monthly_minimum: float | None = None
    monthly_maximum: float | None = None

class BountyContractCreate(BountyContractBase):
    payment_partner: PaymentPartner | None = None
    engagement_bonus_rate: float = 50.00
    referral_bounty_rate: float = 1000.00
    free_user_multiplier: float = 1.0
    silver_user_multiplier: float = 1.5
    gold_user_multiplier: float = 2.0
    platinum_user_multiplier: float = 3.0

class BountyContractResponse(BountyContractBase):
    id: str
    payment_partner: PaymentPartner | None
    engagement_bonus_rate: float
    referral_bounty_rate: float
    free_user_multiplier: float
    silver_user_multiplier: float
    gold_user_multiplier: float
    platinum_user_multiplier: float
    is_active: bool
    auto_renew: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Bank Integration Schemas
class BankApiCredential(BaseModel):
    bank_name: str
    api_key: str
    api_secret: str
    webhook_secret: str
    environment: str  # sandbox, production

class BountyCalculation(BaseModel):
    bank_name: str
    user_tier: str
    bounty_type: BountyType
    original_amount: float
    days_late: int
    interest_prevented: float
    late_fee_prevented: float
    base_rate: float
    multiplier: float
    final_amount: float
    calculation_method: str

class BountyInvoice(BaseModel):
    invoice_number: str
    bank_name: str
    period_start: date
    period_end: date
    total_bounties: int
    total_amount: float
    line_items: list[dict]
    due_date: date
    status: str

class BankPayout(BaseModel):
    bank_name: str
    payout_amount: float
    payout_method: str
    payout_reference: str
    payout_date: datetime
    status: str
    supporting_document: str | None = None