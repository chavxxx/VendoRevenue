import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

logger = logging.getLogger("gartech.database")

# Try PostgreSQL first; if connection fails or in local dev without PG running, fallback to SQLite
db_url = settings.DATABASE_URL
connect_args = {}

if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}
else:
    # Check if we can connect to PG or fallback to SQLite
    try:
        test_engine = create_engine(db_url, pool_pre_ping=True)
        with test_engine.connect() as conn:
            pass
        logger.info(f"Connected successfully to PostgreSQL database: {settings.POSTGRES_DB}")
    except Exception as e:
        logger.warning(f"PostgreSQL connection to {db_url} not available ({e}). Using SQLite for local storage: {settings.SQLITE_FALLBACK_URL}")
        db_url = settings.SQLITE_FALLBACK_URL
        connect_args = {"check_same_thread": False}

engine = create_engine(
    db_url, 
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency for obtaining database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
