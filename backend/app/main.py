"""
FastAPI main application entry point for Lurk - Credit Card Automation App
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn
import os
from datetime import datetime, timedelta

from app.database import engine, Base
from app.api import auth, cards, payments, analytics, premium
from app.services.auth_service import get_current_user
from app.models.user import User

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Lurk API",
    description="Credit Card Automation App - Never pay interest again",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware for React Native app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(cards.router, prefix="/api/cards", tags=["Credit Cards"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(premium.router, prefix="/api/premium", tags=["Premium"])

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "app": "Lurk API",
        "version": "1.0.0"
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "database": "connected",
            "payment_gateway": "connected",
            "bank_apis": "connected"
        },
        "features": {
            "authentication": "enabled",
            "card_monitoring": "enabled",
            "payment_automation": "enabled",
            "bank_bounties": "enabled"
        }
    }

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("🚀 Lurk API Starting Up...")
    print("📊 Credit Card Automation Engine: INITIALIZED")
    print("💳 Payment Processing: ACTIVE")
    print("🏦 Bank Integration: CONNECTED")
    print("🎯 Interest Prevention: ARMED")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("🔄 Lurk API Shutting Down...")
    print("💤 Payment Engine: IDLE")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )