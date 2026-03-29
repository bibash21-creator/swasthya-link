from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.db import models, database
from app.schemas import schemas
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    """
    Validate JWT token and return current user with role.
    Checks Admin table first, then Patient, then Pharmacy.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        user_id: int = payload.get("id")
        
        if email is None:
            raise credentials_exception
            
        token_data = schemas.TokenData(email=email, role=role)
    except JWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        raise credentials_exception
    
    # Check Admin Role first from the token
    if token_data.role == "admin":
        admin = db.query(models.Admin).filter(models.Admin.email == token_data.email).first()
        if admin:
            return {"user": admin, "role": "admin", "user_id": user_id}
        # If token says admin but not found in Admin table, check other tables
        # This handles edge cases where admin might also be a patient/pharmacy
    
    # Check Patient
    user = db.query(models.Patient).filter(models.Patient.email == token_data.email).first()
    if user:
        # Override role if user is found as patient but token says different
        actual_role = "patient"
        return {"user": user, "role": actual_role, "user_id": user.id}
    
    # Check Pharmacy
    user = db.query(models.Pharmacy).filter(models.Pharmacy.email == token_data.email).first()
    if user:
        actual_role = "pharmacy"
        return {"user": user, "role": actual_role, "user_id": user.id}
    
    # Final check for admin (in case admin doesn't have patient/pharmacy record)
    if token_data.role == "admin":
        admin = db.query(models.Admin).filter(models.Admin.email == token_data.email).first()
        if admin:
            return {"user": admin, "role": "admin", "user_id": admin.id}
        
    logger.warning(f"User not found for email: {email}")
    raise credentials_exception


async def get_current_active_patient(current_user: dict = Depends(get_current_user)):
    """Ensure current user is a patient."""
    if current_user["role"] != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to patients only"
        )
    return current_user["user"]


async def get_current_active_pharmacy(current_user: dict = Depends(get_current_user)):
    """Ensure current user is a pharmacy or admin (admin can act as pharmacy)."""
    if current_user["role"] not in ["pharmacy", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to pharmacies only"
        )
    return current_user["user"]


async def get_current_active_admin(current_user: dict = Depends(get_current_user)):
    """Ensure current user is an admin."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to administrators only"
        )
    return current_user["user"]
