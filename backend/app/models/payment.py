"""
Payment model for Lurk app - Credit Card Automation
"""

from sqlalchemy import Column, String, Boolean, DateTime, Enum, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pydantic import BaseModel, validator
from enum import Enum as PydanticEnum
from datetime import datetime
from decimal import Decimal
import uuid

# Enums
class PaymentType(str, PydanticEnum):
    AUTOMATIC = "automatic"  # Lurk automation
    MANUAL = "manual"        # User initiated
    SCHEDULED = "scheduled"  # Pre-scheduled
    REVERSAL = "reversal"    # Refund/cancellation
    LATE_FEE = "late_fee"    # Late fee payment

class PaymentStatus(str, PydanticEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    CHARGEBACK = "chargeback"

class PaymentMethod(str, PydanticEnum):
    UPI_AUTOPAY = "upi_autopay"
    UPI_COLLECT = "upi_collect"
    NEFT = "neft"
    IMPS = "imps"
    RTGS = "rtgs"
    DEBIT_CARD = "debit_card"
    NET_BANKING = "net_banking"
    RAZORPAY = "razorpay"

class PaymentGateway(str, PydanticEnum):
    RAZORPAY = "razorpay"
    PAYU = "payu"
    CASHFREE = "cashfree"
    STRIPE = "stripe"
    DIRECT_BANK = "direct_bank"

# SQLAlchemy Payment Model
class Payment(Base):
    __tablename__ = "payments"

    # Primary Keys
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id = Column(UUID(as_uuid=True), ForeignKey("credit_cards.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Payment Information
    payment_type = Column(Enum(PaymentType), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="INR")
    description = Column(Text, nullable=True)

    # Payment Processing
    transaction_id = Column(String(255), nullable=True, index=True)  # Gateway transaction ID
    gateway = Column(Enum(PaymentGateway), default=PaymentGateway.RAZORPAY)
    gateway_order_id = Column(String(255), nullable=True, index=True)
    gateway_payment_id = Column(String(255), nullable=True)
    gateway_signature = Column(Text, nullable=True)

    # Payment Method
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    upi_vpa = Column(String(100), nullable=True)  # Virtual Payment Address
    bank_account_last4 = Column(String(4), nullable=True)

    # Status and Tracking
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    initiated_at = Column(DateTime(timezone=True), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)

    # Interest and Fees
    interest_saved = Column(Numeric(12, 2), default=0)  # Interest saved by Lurk
    late_fee_prevented = Column(Numeric(8, 2), default=0)  # Late fees avoided
    processing_fee = Column(Numeric(8, 2), default=0)  # Lurk processing fee
    bank_fee = Column(Numeric(8, 2), default=0)  # Bank charges

    # Automation Details
    triggered_by = Column(String(50), nullable=True)  # What triggered this payment
    trigger_date = Column(DateTime(timezone=True), nullable=True)  # Original due date
    buffer_hours = Column(Integer, default=24)  # Hours before due date
    retry_count = Column(Integer, default=0)

    # Error Handling
    error_code = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    failure_reason = Column(String(200), nullable=True)

    # Refund Information
    refund_id = Column(String(255), nullable=True)
    refund_amount = Column(Numeric(12, 2), nullable=True)
    refund_reason = Column(String(200), nullable=True)

    # Audit and Metadata
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    idempotency_key = Column(String(255), nullable=True, index=True)
    metadata = Column(Text, nullable=True)  # JSON string for additional data

    # Relationships
    credit_card = relationship("CreditCard", back_populates="payments")
    user = relationship("User", back_populates="payments")
    bank_bounty = relationship("BankBounty", back_populates="payment", uselist=False)

    def __repr__(self):
        return f"<Payment(id={self.id}, amount={self.amount}, status={self.status}, type={self.payment_type})>"

# Payment Schedule Model (for scheduled payments)
class PaymentSchedule(Base):
    __tablename__ = "payment_schedules"

    # Primary Keys
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id = Column(UUID(as_uuid=True), ForeignKey("credit_cards.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Schedule Information
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    scheduled_amount = Column(Numeric(12, 2), nullable=False)
    payment_type = Column(Enum(PaymentType), default=PaymentType.AUTOMATIC)
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.UPI_AUTOPAY)

    # Status
    status = Column(String(20), default="scheduled")  # scheduled, executed, cancelled, failed
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True)

    # Recurrence
    is_recurring = Column(Boolean, default=False)
    recurrence_type = Column(String(20), nullable=True)  # monthly, weekly
    recurrence_end_date = Column(DateTime(timezone=True), nullable=True)

    # Creation and Update
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    executed_at = Column(DateTime(timezone=True), nullable=True)

# Pydantic Schemas
class PaymentBase(BaseModel):
    amount: float
    payment_type: PaymentType = PaymentType.AUTOMATIC
    payment_method: PaymentMethod = PaymentMethod.UPI_AUTOPAY
    description: str | None = None

    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('amount must be greater than 0')
        if v > 1000000:  # Reasonable upper limit
            raise ValueError('amount exceeds maximum limit')
        return v

class PaymentCreate(PaymentBase):
    card_id: str
    gateway: PaymentGateway = PaymentGateway.RAZORPAY
    upi_vpa: str | None = None
    trigger_date: datetime | None = None
    buffer_hours: int = 24

class PaymentUpdate(BaseModel):
    amount: float | None = None
    payment_method: PaymentMethod | None = None
    description: str | None = None
    status: PaymentStatus | None = None

class PaymentResponse(PaymentBase):
    id: str
    card_id: str
    user_id: str
    transaction_id: str | None
    gateway: PaymentGateway
    gateway_order_id: str | None
    status: PaymentStatus
    initiated_at: datetime | None
    processed_at: datetime | None
    completed_at: datetime | None
    interest_saved: float
    late_fee_prevented: float
    processing_fee: float
    bank_fee: float
    trigger_date: datetime | None
    buffer_hours: int
    error_code: str | None
    error_message: str | None
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentList(BaseModel):
    payments: list[PaymentResponse]
    total: int
    page: int
    per_page: int

class PaymentSummary(BaseModel):
    total_saved: float  # Total interest saved
    total_fees_prevented: float  # Total late fees prevented
    total_payments: int
    total_amount_automated: float
    average_savings_per_month: float
    success_rate: float  # Percentage of successful payments

class PaymentAnalytics(BaseModel):
    monthly_savings: list[dict]  # Monthly interest saved
    payment_types: dict[PaymentType, int]  # Count by payment type
    success_rate: float
    average_processing_time: float  # Hours
    most_saved_month: dict
    lifetime_savings: float
    cards_automated: int

# Gateway Integration Schemas
class GatewayOrder(BaseModel):
    order_id: str
    amount: int  # in paise/cents
    currency: str = "INR"
    receipt: str | None = None
    notes: dict = {}

class GatewayPayment(BaseModel):
    payment_id: str
    order_id: str
    amount: int
    currency: str
    status: str
    method: str | None = None
    captured: bool
    description: str | None = None
    created_at: int

class GatewayWebhook(BaseModel):
    event: str
    payload: dict
    signature: str
    timestamp: int

# Scheduled Payment Schemas
class PaymentScheduleCreate(BaseModel):
    card_id: str
    scheduled_date: datetime
    scheduled_amount: float
    payment_type: PaymentType = PaymentType.AUTOMATIC
    payment_method: PaymentMethod = PaymentMethod.UPI_AUTOPAY
    is_recurring: bool = False
    recurrence_type: str | None = None
    recurrence_end_date: datetime | None = None

class PaymentScheduleResponse(BaseModel):
    id: str
    card_id: str
    user_id: str
    scheduled_date: datetime
    scheduled_amount: float
    payment_type: PaymentType
    payment_method: PaymentMethod
    status: str
    is_recurring: bool
    created_at: datetime
    executed_at: datetime | None

class AutomationSettings(BaseModel):
    auto_payment_enabled: bool = True
    default_payment_method: PaymentMethod = PaymentMethod.UPI_AUTOPAY
    buffer_hours: int = 24
    maximum_payment_amount: float = 100000
    retry_attempts: int = 3
    failure_notification: bool = True