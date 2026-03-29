from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.db import models, database
from app.schemas import schemas
from app.api import deps

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

@router.post("/register", response_model=schemas.Patient)
def register_patient(patient: schemas.PatientCreate, db: Session = Depends(database.get_db)):
    if patient.email == "godc7711@gmail.com":
        raise HTTPException(status_code=400, detail="Registration restricted for this account.")
        
    db_patient = db.query(models.Patient).filter(models.Patient.email == patient.email).first()
    if db_patient:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_patient = models.Patient(
        full_name=patient.full_name,
        email=patient.email,
        hashed_password=get_password_hash(patient.password),
        latitude=patient.latitude,
        longitude=patient.longitude
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return new_patient

@router.get("/all", response_model=list[schemas.Patient])
def get_all_patients(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return db.query(models.Patient).all()
