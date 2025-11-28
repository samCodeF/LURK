"""
Database configuration and connection setup for Lurk app
"""

import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from databases import Database
import logging

# Database URL from environment or default to PostgreSQL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://lurk_user:lurk_password@localhost:5432/lurk_db"
)

# SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=os.getenv("DEBUG", "false").lower() == "true"
)

# Database connection for async operations
database = Database(DATABASE_URL)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Metadata for migrations
metadata = MetaData()

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_database():
    """Async database dependency"""
    return database

# Test database connection
async def test_connection():
    """Test database connectivity"""
    try:
        async with database.connection() as connection:
            await connection.execute("SELECT 1")
        logging.info("✅ Database connection successful")
        return True
    except Exception as e:
        logging.error(f"❌ Database connection failed: {e}")
        return False

# Database connection URL
def get_database_url():
    """Get database URL from environment"""
    return DATABASE_URL