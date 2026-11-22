import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.init_db import init_database

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("gartech.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting GARTECH VENDO Management & Revenue Sharing System...")
    try:
        init_database()
        logger.info("Database schema and seed data verified.")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
    yield
    logger.info("Shutting down GARTECH VENDO system...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Operational and Financial Management System for distributed WiFi Vendo machines with automated revenue sharing.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production Nginx controls outer domain, internal allows any for mobile & web
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Uploads directory
upload_dir = settings.UPLOAD_DIR
os.makedirs(upload_dir, exist_ok=True)
os.makedirs(os.path.join(upload_dir, "signatures"), exist_ok=True)
os.makedirs(os.path.join(upload_dir, "harvests"), exist_ok=True)
os.makedirs(os.path.join(upload_dir, "receipts"), exist_ok=True)

app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timezone": settings.TIMEZONE
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to GARTECH VENDO Management & Revenue Sharing API",
        "docs": "/docs",
        "health": "/health"
    }
