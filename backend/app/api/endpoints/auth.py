from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.db import models, database
from app.schemas import schemas
from app.core.config import settings
from app.core.audit import log_action
from app.core.email import send_otp_email, send_welcome_email
import random
import logging
import bcrypt

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)


def verify_password(plain_password, hashed_password):
    """Verify a plain password against a hashed password using bcrypt directly."""
    # Bcrypt has a 72-byte limit, truncate if necessary
    password_bytes = plain_password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    # Use bcrypt directly to avoid passlib's validation
    hashed_bytes = hashed_password.encode('utf-8') if isinstance(hashed_password, str) else hashed_password
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def generate_otp() -> str:
    """Generate a secure 6-digit OTP."""
    return str(random.randint(100000, 999999))


def is_otp_expired(created_at: datetime) -> bool:
    """Check if OTP has expired based on settings."""
    expiry_time = created_at + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    return datetime.utcnow() > expiry_time


@router.post("/login")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    """
    Authenticate user and return token or OTP requirement.
    
    For admin users: Returns OTP requirement for 2FA
    For patients/pharmacies: Returns token directly if verified
    """
    # 1. Check Admin Table first
    admin = db.query(models.Admin).filter(models.Admin.email == form_data.username).first()
    if admin:
        if not verify_password(form_data.password, admin.hashed_password):
            logger.warning(f"Failed login attempt for admin: {form_data.username}")
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        
        # Admin requires OTP
        otp = generate_otp()
        # Delete any existing codes for this email
        db.query(models.VerificationCode).filter(
            models.VerificationCode.email == form_data.username
        ).delete()
        
        v_code = models.VerificationCode(email=form_data.username, code=otp)
        db.add(v_code)
        db.commit()
        
        # Send OTP via email
        email_sent = send_otp_email(form_data.username, otp, admin.full_name)
        
        if email_sent:
            log_action(db, admin.id, "admin", "admin_login_requested", "Password OK. OTP sent via email.")
            logger.info(f"OTP sent via email to admin: {form_data.username}")
        else:
            log_action(db, admin.id, "admin", "admin_login_requested", "Password OK. Email failed - check logs for OTP.")
            logger.warning(f"Failed to send OTP email to admin: {form_data.username}. OTP: {otp}")
        
        return {
            "status": "otp_required",
            "message": "Verification code sent to your email" if email_sent else "Verification code generated (check server logs)",
            "email": form_data.username,
            "role": "admin"
        }

    # 2. Check Patients
    user = db.query(models.Patient).filter(models.Patient.email == form_data.username).first()
    role = "patient"
    
    if not user:
        # 3. Check Pharmacies
        user = db.query(models.Pharmacy).filter(models.Pharmacy.email == form_data.username).first()
        role = "pharmacy"

    if not user or not verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Failed login attempt for: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is verified
    if user.is_verified == 0:
        logger.info(f"Unverified user login attempt: {form_data.username}")
        return {"status": "verification_required", "email": user.email, "role": role}

    log_action(db, user.id, role, f"{role}_login_successful")
    logger.info(f"Successful login: {form_data.username} ({role})")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": role, "id": user.id},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": role}


@router.post("/request-otp")
async def request_otp(email: str, db: Session = Depends(database.get_db)):
    """Request a new OTP for verification."""
    # Check if user exists
    user = db.query(models.Patient).filter(models.Patient.email == email).first()
    if not user:
        user = db.query(models.Pharmacy).filter(models.Pharmacy.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Rate limiting: Check for recent OTP requests
    recent_code = db.query(models.VerificationCode).filter(
        models.VerificationCode.email == email,
        models.VerificationCode.created_at > datetime.utcnow() - timedelta(minutes=1)
    ).first()
    
    if recent_code:
        raise HTTPException(
            status_code=429,
            detail="Please wait before requesting a new OTP"
        )
        
    otp = generate_otp()
    db.query(models.VerificationCode).filter(
        models.VerificationCode.email == email
    ).delete()
    
    v_code = models.VerificationCode(email=email, code=otp)
    db.add(v_code)
    db.commit()
    
    # Send OTP via email
    user_name = user.full_name if hasattr(user, 'full_name') else (user.name if hasattr(user, 'name') else "")
    email_sent = send_otp_email(email, otp, user_name)
    
    if email_sent:
        logger.info(f"OTP sent via email to {email}")
    else:
        logger.warning(f"Failed to send OTP email to {email}. OTP: {otp}")
    
    # For free Resend tier: return OTP in response when email fails
    # This allows testing without a verified domain
    response_data = {
        "message": "OTP sent to your email" if email_sent else "OTP generated (use code below)",
        "expires_in_minutes": settings.OTP_EXPIRE_MINUTES,
        "email_sent": email_sent
    }
    
    # Include OTP in response for development/free tier (remove in production with verified domain)
    if not email_sent:
        response_data["otp"] = otp
        response_data["note"] = "Free tier mode: OTP shown for testing. Verify domain to send emails."
    
    return response_data


@router.post("/verify-otp")
async def verify_otp(email: str, code: str, db: Session = Depends(database.get_db)):
    """Verify OTP and return access token."""
    v_record = db.query(models.VerificationCode).filter(
        models.VerificationCode.email == email,
        models.VerificationCode.code == code
    ).first()
    
    if not v_record:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Check if OTP has expired
    if is_otp_expired(v_record.created_at):
        db.delete(v_record)
        db.commit()
        raise HTTPException(status_code=400, detail="Verification code has expired")
    
    # Check Admin first
    admin = db.query(models.Admin).filter(models.Admin.email == email).first()
    if admin:
        role = "admin"
        user = admin
    else:
        user = db.query(models.Patient).filter(models.Patient.email == email).first()
        role = "patient"
        if not user:
            user = db.query(models.Pharmacy).filter(models.Pharmacy.email == email).first()
            role = "pharmacy"
        
        if user:
            user.is_verified = 1
            db.commit()

    if not user:
        db.delete(v_record)
        db.commit()
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(v_record)
    db.commit()
    
    log_action(db, user.id, role, "otp_verified")
    logger.info(f"OTP verified for {email} ({role})")
    
    # Send welcome email for first-time verified users
    user_name = user.full_name if hasattr(user, 'full_name') else (user.name if hasattr(user, 'name') else "")
    send_welcome_email(email, user_name, role)
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": user.email, "role": role, "id": user.id},
        expires_delta=access_token_expires
    )
    return {"access_token": token, "token_type": "bearer", "role": role}
