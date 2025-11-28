"""
Authentication API endpoints for Lurk - Credit Card Automation
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Any, Dict

from app.database import get_db
from app.services.auth_service import auth_service, AuthService
from app.models.user import (
    User, UserCreate, UserResponse, UserUpdate, UserProfile,
    Token, TokenRefresh, KYCVerification, BiometricSetup,
    AuthProvider, SubscriptionTier
)
from app.utils.notifications import send_email_notification, send_sms_notification
from app.utils.audit import log_security_event

router = APIRouter()

# Authentication endpoints

@router.post("/register", response_model=Dict[str, Any])
async def register(
    user_data: UserCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Register new user"""
    try:
        # Register user
        user = await auth_service.register_user(user_data, db)

        # Send verification email
        background_tasks.add_task(
            send_email_verification,
            user.email,
            str(user.id)
        )

        # Log registration
        await log_security_event(
            "USER_REGISTER",
            str(user.id),
            request.client.host,
            {
                "email": user.email,
                "auth_provider": user_data.auth_provider.value,
                "user_agent": request.headers.get("user-agent")
            }
        )

        return {
            "message": "Registration successful. Please check your email for verification.",
            "user": user,
            "requires_verification": True
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again."
        )


@router.post("/login", response_model=Dict[str, Any])
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request,
    db: Session = Depends(get_db)
):
    """User login with email and password"""
    try:
        # Authenticate user
        auth_result = await auth_service.authenticate_user(
            form_data.username,  # email
            form_data.password,
            db,
            request
        )

        # Log successful login
        await log_security_event(
            "USER_LOGIN",
            str(auth_result["user"].id),
            request.client.host,
            {
                "email": form_data.username,
                "success": True,
                "user_agent": request.headers.get("user-agent")
            }
        )

        return {
            "message": "Login successful",
            **auth_result,
            "user": auth_result["user"]
        }

    except HTTPException:
        # Log failed login
        await log_security_event(
            "USER_LOGIN_FAILED",
            None,
            request.client.host,
            {
                "email": form_data.username,
                "success": False,
                "user_agent": request.headers.get("user-agent")
            }
        )
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again."
        )


@router.post("/refresh", response_model=Dict[str, Any])
async def refresh_token(
    refresh_data: TokenRefresh,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    try:
        auth_result = await auth_service.refresh_token(
            refresh_data.refresh_token,
            db
        )

        return {
            "message": "Token refreshed successfully",
            **auth_result,
            "user": auth_result["user"]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed. Please login again."
        )


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(auth_service.get_current_user)
):
    """Logout user and invalidate tokens"""
    try:
        # Get authorization header
        auth_header = request.headers.get("authorization")
        access_token = None
        refresh_token = None

        if auth_header and auth_header.startswith("Bearer "):
            access_token = auth_header.split(" ")[1]

        # Try to get refresh token from form data or JSON body
        if hasattr(request, 'form') and request.form:
            form_data = await request.form()
            refresh_token = form_data.get("refresh_token")
        elif hasattr(request, 'json') and request.json:
            json_data = await request.json()
            refresh_token = json_data.get("refresh_token")

        # Logout user
        success = await auth_service.logout_user(access_token, refresh_token)

        # Log logout
        await log_security_event(
            "USER_LOGOUT",
            str(current_user.id),
            request.client.host,
            {"success": success}
        )

        if success:
            return {"message": "Logout successful"}
        else:
            return {"message": "Logout completed with warnings"}

    except Exception as e:
        return {"message": "Logout completed"}


# Profile Management

@router.get("/profile", response_model=UserProfile)
async def get_profile(
    current_user: User = Depends(auth_service.get_current_user)
):
    """Get current user profile"""
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UserUpdate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    try:
        # Update user fields
        update_data = profile_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(current_user, field, value)

        db.commit()
        db.refresh(current_user)

        return current_user

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile update failed"
        )


@router.post("/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    try:
        # Verify current password
        if not current_user.password_hash or not auth_service.verify_password(
            current_password,
            current_user.password_hash
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )

        # Update password
        current_user.password_hash = auth_service.hash_password(new_password)
        db.commit()

        # Log password change
        await log_security_event(
            "PASSWORD_CHANGED",
            str(current_user.id),
            None,
            {"success": True}
        )

        return {"message": "Password changed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password change failed"
        )


# KYC Verification

@router.post("/kyc/send-otp")
async def send_kyc_otp(
    aadhaar_number: str,
    current_user: User = Depends(auth_service.get_current_user)
):
    """Send OTP for Aadhaar KYC verification"""
    try:
        # Validate Aadhaar number (basic validation)
        if len(aadhaar_number) != 12 or not aadhaar_number.isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Aadhaar number"
            )

        # Check rate limiting
        rate_limiter = auth_service.rate_limiter
        if await rate_limiter.check_kyc_attempts(str(current_user.id)):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many KYC attempts. Please try again later."
            )

        # Send OTP (integration with Aadhaar OTP service)
        otp_sent = await send_aadhaar_otp(aadhaar_number)

        if not otp_sent:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OTP service temporarily unavailable"
            )

        # Store masked Aadhaar in user record
        current_user.kyc_aadhaar_last4 = aadhaar_number[-4:]
        db.commit()

        return {
            "message": "OTP sent successfully",
            "masked_aadhaar": f"XXXX-XXXX-{aadhaar_number[-4:]}"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP"
        )


@router.post("/kyc/verify")
async def verify_kyc(
    kyc_data: KYCVerification,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Verify KYC with Aadhaar OTP"""
    try:
        # Verify OTP
        kyc_result = await verify_aadhaar_otp(kyc_data.aadhaar_number, kyc_data.otp)

        if not kyc_result["verified"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP"
            )

        # Update user KYC status
        current_user.kyc_verified = True
        current_user.kyc_verified_at = datetime.utcnow()
        db.commit()

        # Log KYC completion
        await log_security_event(
            "KYC_VERIFIED",
            str(current_user.id),
            None,
            {
                "aadhaar_last4": kyc_data.aadhaar_number[-4:],
                "verified_at": current_user.kyc_verified_at.isoformat()
            }
        )

        return {
            "message": "KYC verification successful",
            "verified_at": current_user.kyc_verified_at
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="KYC verification failed"
        )


# Biometric Authentication

@router.post("/biometric/setup")
async def setup_biometric(
    biometric_data: BiometricSetup,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Setup biometric authentication"""
    try:
        result = await auth_service.setup_biometric(
            str(current_user.id),
            biometric_data.dict(),
            db
        )

        return {
            "message": "Biometric authentication setup successful",
            **result
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Biometric setup failed"
        )


@router.post("/biometric/verify")
async def verify_biometric(
    challenge_response: str,
    device_data: Dict[str, Any],
    current_user: User = Depends(auth_service.get_current_user)
):
    """Verify biometric authentication"""
    try:
        result = await auth_service.verify_biometric(
            str(current_user.id),
            challenge_response,
            device_data
        )

        return {
            "message": "Biometric verification successful",
            **result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Biometric verification failed"
        )


@router.delete("/biometric/remove")
async def remove_biometric(
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Remove biometric authentication"""
    try:
        # Remove biometric data from Redis
        await auth_service.redis_client.delete(
            f"{auth_service.biometric_prefix}{current_user.id}"
        )

        # Update user auth provider
        current_user.auth_provider = AuthProvider.EMAIL
        db.commit()

        return {"message": "Biometric authentication removed"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to remove biometric authentication"
        )


# Helper functions

async def send_email_verification(email: str, user_id: str):
    """Send email verification (background task)"""
    try:
        # Generate verification token
        import secrets
        verification_token = secrets.token_urlsafe(32)

        # Store token in Redis
        await auth_service.redis_client.setex(
            f"email_verification:{user_id}",
            timedelta(hours=24),
            verification_token
        )

        # Send email (integration with email service)
        await send_email_notification(
            email,
            "Verify your Lurk account",
            f"Click here to verify: https://lurk.app/verify-email?token={verification_token}&user_id={user_id}"
        )

    except Exception as e:
        print(f"Failed to send email verification: {e}")


async def send_aadhaar_otp(aadhaar_number: str) -> bool:
    """Send Aadhaar OTP (mock implementation)"""
    # Integration with Aadhaar OTP service
    # For now, return True for testing
    return True


async def verify_aadhaar_otp(aadhaar_number: str, otp: str) -> Dict[str, Any]:
    """Verify Aadhaar OTP (mock implementation)"""
    # Integration with Aadhaar OTP verification
    # For now, return True if OTP is "123456"
    if otp == "123456":
        return {"verified": True}
    else:
        return {"verified": False}


@router.post("/verify-email/{token}")
async def verify_email(
    token: str,
    user_id: str,
    db: Session = Depends(get_db)
):
    """Verify email with token"""
    try:
        # Get stored token
        stored_token = await auth_service.redis_client.get(
            f"email_verification:{user_id}"
        )

        if not stored_token or stored_token != token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )

        # Update user verification status
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_verified = True
            db.commit()

        # Remove token from Redis
        await auth_service.redis_client.delete(
            f"email_verification:{user_id}"
        )

        return {"message": "Email verified successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email verification failed"
        )


@router.post("/resend-verification")
async def resend_verification(
    current_user: User = Depends(auth_service.get_current_user)
):
    """Resend email verification"""
    if current_user.is_verified:
        return {"message": "Email already verified"}

    await send_email_verification(current_user.email, str(current_user.id))

    return {"message": "Verification email sent successfully"}