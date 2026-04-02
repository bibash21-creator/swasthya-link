"""Authentication endpoints - Production ready without OTP."""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from sqlalchemy.orm import Session
from app.db import models, database
from app.schemas import schemas
from app.core.config import settings
from app.core.audit import log_action
import logging
import bcrypt

router = APIRouter()
ph = PasswordHasher(time_cost=2, memory_cost=65536, parallelism=1)
logger = logging.getLogger(__name__)


def verify_password(plain_password, hashed_password):
    """Verify password - supports Argon2 and bcrypt."""
    if not hashed_password:
        return False
    if hashed_password.startswith('$argon2'):
        try:
            ph.verify(hashed_password, plain_password)
            return True
        except VerifyMismatchError:
            return False
    else:
        # bcrypt
        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        hashed_bytes = hashed_password.encode('utf-8') if isinstance(hashed_password, str) else hashed_password
        return bcrypt.checkpw(password_bytes, hashed_bytes)


def hash_password(password: str) -> str:
    """Hash password using Argon2."""
    return ph.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    """Simple login - returns token immediately, no OTP."""
    email = form_data.username
    password = form_data.password
    
    # Check all user types
    user = None
    role = None
    
    # 1. Check Admin
    user = db.query(models.Admin).filter(models.Admin.email == email).first()
    if user:
        role = "admin"
    
    # 2. Check Patient
    if not user:
        user = db.query(models.Patient).filter(models.Patient.email == email).first()
        if user:
            role = "patient"
    
    # 3. Check Pharmacy
    if not user:
        user = db.query(models.Pharmacy).filter(models.Pharmacy.email == email).first()
        if user:
            role = "pharmacy"
    
    # Verify user exists and password
    if not user or not verify_password(password, user.hashed_password):
        logger.warning(f"Failed login: {email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if verified
    if hasattr(user, 'is_verified') and user.is_verified == 0:
        # Auto-verify on first login
        user.is_verified = 1
        db.commit()
    
    # Create token
    access_token = create_access_token(
        data={"sub": email, "role": role, "id": user.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    logger.info(f"Login success: {email} ({role})")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role,
        "email": email
    }


@router.post("/register/patient")
async def register_patient(patient: schemas.PatientCreate, db: Session = Depends(database.get_db)):
    """Register new patient - auto-verified."""
    # Check if exists
    existing = db.query(models.Patient).filter(models.Patient.email == patient.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create patient
    new_patient = models.Patient(
        full_name=patient.full_name,
        email=patient.email,
        hashed_password=hash_password(patient.password),
        latitude=patient.latitude,
        longitude=patient.longitude,
        is_verified=1  # Auto-verify
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    
    logger.info(f"Patient registered: {patient.email}")
    
    # Return token immediately
    access_token = create_access_token(
        data={"sub": patient.email, "role": "patient", "id": new_patient.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "message": "Registration successful",
        "access_token": access_token,
        "token_type": "bearer",
        "role": "patient"
    }


@router.post("/register/pharmacy")
async def register_pharmacy(pharmacy: schemas.PharmacyCreate, db: Session = Depends(database.get_db)):
    """Register new pharmacy - auto-verified."""
    # Check if exists
    existing = db.query(models.Pharmacy).filter(models.Pharmacy.email == pharmacy.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create pharmacy
    new_pharmacy = models.Pharmacy(
        name=pharmacy.name,
        email=pharmacy.email,
        hashed_password=hash_password(pharmacy.password),
        address=pharmacy.address,
        contact_number=pharmacy.contact_number,
        latitude=pharmacy.latitude,
        longitude=pharmacy.longitude,
        is_verified=1  # Auto-verify
    )
    db.add(new_pharmacy)
    db.commit()
    db.refresh(new_pharmacy)
    
    logger.info(f"Pharmacy registered: {pharmacy.email}")
    
    # Return token immediately
    access_token = create_access_token(
        data={"sub": pharmacy.email, "role": "pharmacy", "id": new_pharmacy.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "message": "Registration successful",
        "access_token": access_token,
        "token_type": "bearer",
        "role": "pharmacy"
    }
