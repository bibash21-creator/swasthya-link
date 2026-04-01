import os
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError
import bcrypt

from .api.endpoints import patients, pharmacies, prescriptions, auth, admin, orders
from .db import models, database
from .db.database import engine
from .core.config import settings
from .core.exceptions import setup_exception_handlers

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create uploads directory if it doesn't exist
# Note: Use parent of 'app' directory as base if running within 'app'
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for upload_dir in ["uploads", "uploads/prescriptions", "uploads/products"]:
    os.makedirs(os.path.join(base_dir, upload_dir), exist_ok=True)
    logger.info(f"Ensured upload directory exists: {upload_dir}")


def init_database_with_retry(max_retries=5, retry_delay=2):
    """Initialize database with retry logic for production deployments."""
    from sqlalchemy import text
    for attempt in range(max_retries):
        try:
            # Test connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connection successful")
            
            # Create tables (in production, use migrations instead)
            models.Base.metadata.create_all(bind=engine)
            logger.info("Database tables initialized")
            return True
        except OperationalError as e:
            logger.warning(f"Database connection attempt {attempt + 1}/{max_retries} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                logger.error("Failed to connect to database after all retries")
                raise
    return False


def hash_password(password: str) -> str:
    """Hash password using native bcrypt with 72-byte truncation."""
    password_bytes = password.encode('utf-8')
    # Bcrypt has a 72-byte limit, truncate if necessary
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode('utf-8')


def create_admin_user():
    """Create default admin user from environment variables."""
    admin_email = settings.ADMIN_EMAIL
    admin_password = settings.ADMIN_PASSWORD
    
    if not admin_email or not admin_password:
        logger.warning("ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping admin creation")
        return
    
    db = None
    try:
        db = next(database.get_db())
        
        admin_user = db.query(models.Admin).filter(models.Admin.email == admin_email).first()
        if not admin_user:
            admin_user = models.Admin(
                email=admin_email,
                hashed_password=hash_password(admin_password),
                full_name="System Administrator"
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            logger.info(f"Admin user created: {admin_email}")
        else:
            logger.info(f"Admin user already exists: {admin_email}")
    except Exception as e:
        logger.error(f"Failed to create admin user: {e}")
        if db:
            db.rollback()
    finally:
        if db:
            db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup/shutdown events."""
    # Startup
    logger.info("Starting up MedConnect Pro API...")
    try:
        init_database_with_retry()
        create_admin_user()
        logger.info("Application startup complete")
    except Exception as e:
        logger.error(f"Startup failed: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down MedConnect Pro API...")
    engine.dispose()
    logger.info("Database connections closed")


app = FastAPI(
    title="MedConnect Pro API",
    description="Production-ready API for MedConnect - Nepal's Medical Link Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Setup exception handlers
setup_exception_handlers(app)

# CORS Configuration from environment
allowed_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
if not allowed_origins:
    allowed_origins = ["*"]
    logger.warning("No ALLOWED_ORIGINS provided; enabling wildcard CORS for development")
logger.info(f"Configured CORS origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https://swasthyalink(?:-[a-z0-9-]+)?\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)

# Mount static files - Use relative path from base_dir
app.mount("/uploads", StaticFiles(directory=os.path.join(base_dir, "uploads")), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(pharmacies.router, prefix="/api/pharmacies", tags=["pharmacies"])
app.include_router(prescriptions.router, prefix="/api/prescriptions", tags=["prescriptions"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])


@app.get("/", tags=["root"])
def read_root():
    return {
        "message": "Welcome to MedConnect Pro API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", tags=["health"])
def health_check():
    """Liveness probe for container orchestration."""
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"status": "healthy", "service": "medconnect-api"}
    )


@app.get("/ready", tags=["health"])
def readiness_check():
    """Readiness probe - checks database connectivity."""
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "ready", "database": "connected"}
        )
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "database": "disconnected"}
        )
