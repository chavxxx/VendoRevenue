import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "GARTECH VENDO Management & Revenue Sharing System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "gartech-vendo-super-secure-production-key-2026-bukidnon-xyz789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    # Support both PostgreSQL for production and local SQLite for fast self-contained execution/testing
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "gartech_admin")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "gartech_secure_pass_2026")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "gartech_vendo_db")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}"
    )
    SQLITE_FALLBACK_URL: str = "sqlite:///./gartech_vendo.db"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://vendo.gartech.ph",
        "*"
    ]
    
    # Timezone & Financial defaults
    TIMEZONE: str = "Asia/Manila"
    DEFAULT_PARTNER_PERCENTAGE: float = 25.00
    DEFAULT_STAFF_PERCENTAGE: float = 5.00
    DEFAULT_GARTECH_PERCENTAGE: float = 70.00
    
    # Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
