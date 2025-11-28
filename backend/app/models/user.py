"""
User model for Lurk app - Credit Card Automation
"""

from sqlalchemy import Column, String, Boolean, DateTime, Enum, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr
from enum import Enum as PydanticEnum
from datetime import datetime
import uuid

# Enums
class SubscriptionTier(str, PydanticEnum):
    FREE = "free"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"

class AuthProvider(str, PydanticEnum):
    EMAIL = "email"
    GOOGLE = "google"
    BIOMETRIC = "biometric"

# SQLAlchemy User Model
class User(Base):
    __tablename__ = "users"

    # Primary Keys
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Authentication
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=True)  # Optional for OAuth
    auth_provider = Column(Enum(AuthProvider), default=AuthProvider.EMAIL)

    # Profile Information
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)

    # KYC Information
    kyc_verified = Column(Boolean, default=False)
    kyc_aadhaar_last4 = Column(String(4), nullable=True)
    kyc_verified_at = Column(DateTime(timezone=True), nullable=True)

    # Subscription
    subscription_tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.FREE)
    subscription_expires = Column(DateTime(timezone=True), nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)

    # Preferences
    notification_preferences = Column(String(1000), default='{"email": true, "sms": true, "push": true}')
    auto_payment_enabled = Column(Boolean, default=True)
    payment_reminder_hours = Column(Integer, default=48)  # Hours before due date

    # Security
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    failed_login_attempts = Column(Integer, default=0)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Feature Flags
    feature_flags = Column(String(2000), default='{}')

    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_seen = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, tier={self.subscription_tier})>"

# Pydantic Schemas
class UserBase(BaseModel):
    email: EmailStr
    phone: str | None = None
    first_name: str | None = None
    last_name: str | None = None

class UserCreate(UserBase):
    password: str | None = None
    auth_provider: AuthProvider = AuthProvider.EMAIL

class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    notification_preferences: dict | None = None
    auto_payment_enabled: bool | None = None
    payment_reminder_hours: int | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class UserResponse(UserBase):
    id: str
    kyc_verified: bool
    subscription_tier: SubscriptionTier
    subscription_expires: datetime | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserProfile(UserResponse):
    phone: str | None = None
    kyc_aadhaar_last4: str | None = None
    kyc_verified_at: datetime | None = None
    payment_reminder_hours: int
    auto_payment_enabled: bool
    last_login: datetime | None = None

# Auth Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class TokenRefresh(BaseModel):
    refresh_token: str

class KYCVerification(BaseModel):
    aadhaar_number: str
    otp: str

class BiometricSetup(BaseModel):
    device_id: str
    biometric_type: str  # fingerprint, face_id, etc
    public_key: str