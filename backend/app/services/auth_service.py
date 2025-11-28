"""
Authentication Service for Lurk - Credit Card Automation App
Handles JWT tokens, biometric authentication, and user session management
"""

import os
import jwt
import bcrypt
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import or_
import redis

from app.database import get_db, SessionLocal
from app.models.user import User, AuthProvider, UserCreate, UserResponse, Token
from app.models.credit_card import CreditCard
from app.utils.encryption import encrypt_sensitive_data, decrypt_sensitive_data
from app.utils.rate_limiter import RateLimiter

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(64))
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 15))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", 30))

# Redis for session management
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=int(os.getenv("REDIS_DB", 0)),
    decode_responses=True
)

# Rate limiting
rate_limiter = RateLimiter(redis_client)

# Security
security = HTTPBearer()


class AuthService:
    """Authentication service with JWT and biometric support"""

    def __init__(self):
        self.token_blacklist_prefix = "blacklist:"
        self.session_prefix = "session:"
        self.biometric_prefix = "biometric:"
        self.failed_attempts_prefix = "failed:"
        self.blocked_users_prefix = "blocked:"

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(
            password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )

    def generate_tokens(self, user_id: str, user_tier: str = "free") -> Dict[str, Any]:
        """Generate access and refresh tokens"""
        now = datetime.now(timezone.utc)

        # Access token payload
        access_payload = {
            "user_id": str(user_id),
            "user_tier": user_tier,
            "token_type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
            "jti": secrets.token_urlsafe(32)  # JWT ID for blacklisting
        }

        # Refresh token payload
        refresh_payload = {
            "user_id": str(user_id),
            "token_type": "refresh",
            "iat": now,
            "exp": now + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS),
            "jti": secrets.token_urlsafe(32)
        }

        # Generate tokens
        access_token = jwt.encode(access_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        refresh_token = jwt.encode(refresh_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
            "refresh_expires_in": JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600  # seconds
        }

    async def register_user(self, user_data: UserCreate, db: Session) -> UserResponse:
        """Register new user with validation"""

        # Check if user already exists
        existing_user = db.query(User).filter(
            or_(User.email == user_data.email, User.phone == user_data.phone)
        ).first()

        if existing_user:
            if existing_user.email == user_data.email:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email already registered"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Phone number already registered"
                )

        # Hash password if provided
        password_hash = None
        if user_data.password:
            password_hash = self.hash_password(user_data.password)

        # Create new user
        new_user = User(
            email=user_data.email,
            phone=user_data.phone,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            password_hash=password_hash,
            auth_provider=user_data.auth_provider,
            is_verified=False  # Require email/phone verification
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Store session in Redis
        await self.create_session(str(new_user.id), {
            "registered_at": datetime.now(timezone.utc).isoformat(),
            "auth_provider": user_data.auth_provider.value,
            "ip_address": None  # Will be set from request
        })

        return UserResponse.from_orm(new_user)

    async def authenticate_user(self, email: str, password: str, db: Session, request: Request) -> Dict[str, Any]:
        """Authenticate user and return tokens"""

        # Check rate limiting
        client_ip = request.client.host
        if await rate_limiter.is_rate_limited(f"login:{client_ip}", max_attempts=5, window_minutes=15):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again later."
            )

        # Find user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            await rate_limiter.increment(f"login:{client_ip}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Check if user is blocked
        if await self.is_user_blocked(str(user.id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account temporarily blocked. Please contact support."
            )

        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated"
            )

        # Verify password
        if not password or not user.password_hash or not self.verify_password(password, user.password_hash):
            await rate_limiter.increment(f"login:{client_ip}")
            await self.track_failed_login(str(user.id))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Reset failed attempts on successful login
        await self.reset_failed_attempts(str(user.id))

        # Update user info
        user.last_login = datetime.now(timezone.utc)
        user.failed_login_attempts = 0
        db.commit()

        # Generate tokens
        tokens = self.generate_tokens(str(user.id), user.subscription_tier.value)

        # Store session in Redis
        await self.create_session(str(user.id), {
            "login_at": datetime.now(timezone.utc).isoformat(),
            "ip_address": client_ip,
            "user_agent": request.headers.get("user-agent"),
            "access_jti": self._extract_jti(tokens["access_token"]),
            "refresh_jti": self._extract_jti(tokens["refresh_token"])
        })

        return {
            **tokens,
            "user": UserResponse.from_orm(user)
        }

    async def refresh_token(self, refresh_token: str, db: Session) -> Dict[str, Any]:
        """Refresh access token using refresh token"""

        try:
            # Decode refresh token
            payload = jwt.decode(refresh_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            token_type = payload.get("token_type")
            user_id = payload.get("user_id")
            jti = payload.get("jti")

            if token_type != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )

            # Check if token is blacklisted
            if await self.is_token_blacklisted(jti):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked"
                )

            # Get user
            user = db.query(User).filter(User.id == user_id).first()
            if not user or not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found or inactive"
                )

            # Generate new tokens
            tokens = self.generate_tokens(str(user.id), user.subscription_tier.value)

            # Blacklist old refresh token
            await self.blacklist_token(jti)

            # Update session
            await self.update_session(str(user.id), {
                "refreshed_at": datetime.now(timezone.utc).isoformat(),
                "access_jti": self._extract_jti(tokens["access_token"]),
                "refresh_jti": self._extract_jti(tokens["refresh_token"])
            })

            return {
                **tokens,
                "user": UserResponse.from_orm(user)
            }

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

    async def logout_user(self, access_token: str, refresh_token: str) -> bool:
        """Logout user and blacklist tokens"""

        try:
            # Extract JWT IDs from tokens
            access_jti = self._extract_jti(access_token)
            refresh_jti = self._extract_jti(refresh_token)

            # Get user ID from access token
            payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("user_id")

            # Blacklist tokens
            await self.blacklist_token(access_jti)
            if refresh_jti:
                await self.blacklist_token(refresh_jti)

            # Remove session
            if user_id:
                await self.remove_session(user_id)

            return True

        except Exception as e:
            print(f"Logout error: {e}")
            return False

    async def setup_biometric(self, user_id: str, device_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Setup biometric authentication"""

        # Generate biometric key pair
        biometric_key = secrets.token_urlsafe(64)
        biometric_challenge = secrets.token_urlsafe(32)

        # Store biometric setup in Redis
        await redis_client.setex(
            f"{self.biometric_prefix}{user_id}",
            timedelta(days=30),  # 30 days validity
            str({
                "device_id": device_data.get("device_id"),
                "biometric_type": device_data.get("biometric_type"),
                "public_key": device_data.get("public_key"),
                "biometric_key": biometric_key,
                "challenge": biometric_challenge,
                "setup_at": datetime.now(timezone.utc).isoformat(),
                "active": True
            })
        )

        # Update user record
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.auth_provider = AuthProvider.BIOMETRIC
            db.commit()

        return {
            "biometric_key": biometric_key,
            "challenge": biometric_challenge,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        }

    async def verify_biometric(self, user_id: str, challenge_response: str, device_data: Dict[str, Any]) -> Dict[str, Any]:
        """Verify biometric authentication"""

        # Get biometric data
        biometric_data_str = await redis_client.get(f"{self.biometric_prefix}{user_id}")
        if not biometric_data_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Biometric setup not found"
            )

        import json
        biometric_data = json.loads(biometric_data_str)

        # Verify challenge response (simplified - in production, use proper cryptographic verification)
        if biometric_data["challenge"] != challenge_response:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid biometric response"
            )

        # Verify device ID
        if biometric_data["device_id"] != device_data.get("device_id"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Device mismatch"
            )

        # Generate new challenge for next use
        new_challenge = secrets.token_urlsafe(32)
        biometric_data["challenge"] = new_challenge
        await redis_client.setex(
            f"{self.biometric_prefix}{user_id}",
            timedelta(days=30),
            str(biometric_data)
        )

        return {
            "verified": True,
            "new_challenge": new_challenge
        }

    # Helper methods

    def _extract_jti(self, token: str) -> str:
        """Extract JWT ID from token"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM], options={"verify_exp": False})
            return payload.get("jti")
        except:
            return None

    async def create_session(self, user_id: str, session_data: Dict[str, Any]):
        """Create user session in Redis"""
        session_data.update({"created_at": datetime.now(timezone.utc).isoformat()})
        await redis_client.setex(
            f"{self.session_prefix}{user_id}",
            timedelta(days=7),  # 7 days session
            str(session_data)
        )

    async def update_session(self, user_id: str, update_data: Dict[str, Any]):
        """Update user session in Redis"""
        session_str = await redis_client.get(f"{self.session_prefix}{user_id}")
        if session_str:
            import json
            session_data = json.loads(session_str)
            session_data.update(update_data)
            session_data.update({"updated_at": datetime.now(timezone.utc).isoformat()})
            await redis_client.setex(
                f"{self.session_prefix}{user_id}",
                timedelta(days=7),
                str(session_data)
            )

    async def get_session(self, user_id: str) -> Dict[str, Any]:
        """Get user session from Redis"""
        session_str = await redis_client.get(f"{self.session_prefix}{user_id}")
        if session_str:
            import json
            return json.loads(session_str)
        return None

    async def remove_session(self, user_id: str):
        """Remove user session from Redis"""
        await redis_client.delete(f"{self.session_prefix}{user_id}")

    async def is_token_blacklisted(self, jti: str) -> bool:
        """Check if token is blacklisted"""
        return await redis_client.exists(f"{self.token_blacklist_prefix}{jti}") > 0

    async def blacklist_token(self, jti: str, expires_in: int = 86400):  # 24 hours default
        """Add token to blacklist"""
        await redis_client.setex(f"{self.token_blacklist_prefix}{jti}", expires_in, "1")

    async def is_user_blocked(self, user_id: str) -> bool:
        """Check if user is temporarily blocked"""
        return await redis_client.exists(f"{self.blocked_users_prefix}{user_id}") > 0

    async def block_user(self, user_id: str, duration_minutes: int = 30):
        """Temporarily block user"""
        await redis_client.setex(
            f"{self.blocked_users_prefix}{user_id}",
            timedelta(minutes=duration_minutes),
            "1"
        )

    async def track_failed_login(self, user_id: str, max_attempts: int = 5, block_duration_minutes: int = 30):
        """Track failed login attempts and block if necessary"""
        failed_attempts_key = f"{self.failed_attempts_prefix}{user_id}"
        attempts = await redis_client.incr(failed_attempts_key)

        if attempts == 1:
            await redis_client.expire(failed_attempts_key, timedelta(minutes=60))

        if attempts >= max_attempts:
            await self.block_user(user_id, block_duration_minutes)
            await redis_client.delete(failed_attempts_key)

    async def reset_failed_attempts(self, user_id: str):
        """Reset failed login attempts"""
        await redis_client.delete(f"{self.failed_attempts_prefix}{user_id}")


# Dependency functions
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode token
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("user_id")
        token_type: str = payload.get("token_type")
        jti: str = payload.get("jti")

        if user_id is None or token_type != "access":
            raise credentials_exception

        # Check if token is blacklisted
        auth_service = AuthService()
        if await auth_service.is_token_blacklisted(jti):
            raise credentials_exception

    except jwt.PyJWTError:
        raise credentials_exception

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


async def get_premium_user(current_user: User = Depends(get_current_active_user)) -> User:
    """Get current premium user (Silver, Gold, or Platinum)"""
    if current_user.subscription_tier == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required"
        )
    return current_user


# Initialize auth service
auth_service = AuthService()