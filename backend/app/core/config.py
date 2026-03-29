import os
from typing import Literal
from pydantic_settings import BaseSettings
from pydantic import Field, validator
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings with validation for production deployment."""
    
    # Application
    PROJECT_NAME: str = "MedConnect Pro API"
    VERSION: str = "1.0.0"
    DEBUG: bool = Field(default=False, description="Debug mode - never True in production")
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Security
    SECRET_KEY: str = Field(..., description="JWT secret key - must be set in production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    OTP_EXPIRE_MINUTES: int = 15
    
    # Database
    DATABASE_URL: str = Field(..., description="PostgreSQL connection string")
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    
    # CORS - comma-separated list of allowed origins
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,https://swasthyalink-teal.vercel.app"
    
    # Admin User
    ADMIN_EMAIL: str = Field(default="", description="Default admin email")
    ADMIN_PASSWORD: str = Field(default="", description="Default admin password")
    
    # External Services
    MAPBOX_ACCESS_TOKEN: str = ""
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60
    
    # File Uploads
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_UPLOAD_TYPES: str = "image/jpeg,image/png,image/webp,application/pdf"
    
    @validator("SECRET_KEY")
    def validate_secret_key(cls, v, values):
        if values.get("ENVIRONMENT") == "production" and (not v or len(v) < 32):
            raise ValueError("SECRET_KEY must be at least 32 characters in production")
        return v
    
    @validator("DATABASE_URL")
    def validate_database_url(cls, v, values):
        if not v:
            raise ValueError("DATABASE_URL is required")
        if values.get("ENVIRONMENT") == "production" and "localhost" in v:
            raise ValueError("Cannot use localhost database in production")
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
