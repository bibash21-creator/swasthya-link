from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import uuid
import json
import shutil
import os

from app.db import models, database
from app.schemas import schemas
from app.api import deps

router = APIRouter()

@router.post("/", response_model=schemas.Prescription)
async def create_prescription(
    db: Session = Depends(database.get_db),
    current_user: models.Patient = Depends(deps.get_current_active_patient),
    file: Optional[UploadFile] = File(None),
    info_json: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None)
):
    image_url = None
    if file and file.filename:
        # Create unique filename
        file_ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{file_ext}"
        file_path = f"uploads/prescriptions/{filename}"
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Static URL path
        image_url = f"/uploads/prescriptions/{filename}"
    
    # Parse info_json
    try:
        metadata = json.loads(info_json)
    except:
        metadata = {"filename": file.filename}

    db_prescription = models.Prescription(
        image_url=image_url,
        info_json=metadata,
        latitude=latitude,
        longitude=longitude,
        patient_id=current_user.id,
        status="pending"
    )
    db.add(db_prescription)
    db.commit()
    db.refresh(db_prescription)
    return db_prescription

@router.get("/patient/{patient_id}", response_model=list[schemas.Prescription])
def get_patient_prescriptions(
    patient_id: int, 
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    # Ensure patient only sees their own, or admin sees all
    if current_user["role"] == "patient" and current_user["user"].id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized to view these prescriptions")
        
    return db.query(models.Prescription).filter(models.Prescription.patient_id == patient_id).order_by(models.Prescription.created_at.desc()).all()

@router.get("/all", response_model=list[schemas.Prescription])
def get_all_prescriptions(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    # Only pharmacies or admins should see all prescriptions
    if current_user["role"] not in ["pharmacy", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if current_user["role"] == "pharmacy":
        pharmacy_id = current_user["user"].id
        return db.query(models.Prescription).filter(
            (models.Prescription.assigned_pharmacy_id == pharmacy_id) | 
            (models.Prescription.assigned_pharmacy_id == None)
        ).order_by(models.Prescription.created_at.desc()).all()
        
    return db.query(models.Prescription).order_by(models.Prescription.created_at.desc()).all()

@router.patch("/{prescription_id}/status", response_model=schemas.Prescription)
def update_prescription_status(
    prescription_id: int, 
    status: str, 
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    if current_user["role"] not in ["pharmacy", "admin"]:
        raise HTTPException(status_code=403, detail="Only pharmacies or admins can update status")

    db_prescription = db.query(models.Prescription).filter(models.Prescription.id == prescription_id).first()
    if not db_prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    if current_user["role"] == "pharmacy":
        pharmacy_id = current_user["user"].id
        if db_prescription.assigned_pharmacy_id is not None and db_prescription.assigned_pharmacy_id != pharmacy_id:
            raise HTTPException(status_code=403, detail="This prescription is locked to another pharmacy")
    
    db_prescription.status = status
    db.commit()
    db.refresh(db_prescription)
    return db_prescription

@router.get("/{prescription_id}/matches", response_model=list[schemas.PharmacyWithMatch])
def get_prescription_matches(prescription_id: int, db: Session = Depends(database.get_db)):
    prescription = db.query(models.Prescription).filter(models.Prescription.id == prescription_id).first()
    if not prescription or not prescription.info_json:
        return []
    
    needed_medicines = prescription.info_json.get("medicines", [])
    needed_services = prescription.info_json.get("services", [])
    
    if isinstance(needed_medicines, str):
        needed_medicines = [needed_medicines]
    if isinstance(needed_services, str):
        needed_services = [needed_services]
    
    # Coordinates of the request
    p_lat = prescription.latitude
    p_lon = prescription.longitude

    results = []
    pharmacies = db.query(models.Pharmacy).all()
    
    import math

    def get_distance(lat1, lon1, lat2, lon2):
        if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
            return 9999.0
        return math.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2) * 111 # Approx km

    for ph in pharmacies:
        matched: list = []
        total_price: float = 0.0
        
        # Match Medicines
        for med in needed_medicines:
            stock = db.query(models.PharmacyMedicine).filter(
                models.PharmacyMedicine.pharmacy_id == ph.id,
                models.PharmacyMedicine.type == "medicine",
                models.PharmacyMedicine.medicine_name.ilike(f"%{med}%"),
                models.PharmacyMedicine.quantity > 0
            ).first()
            
            if stock:
                matched.append(stock.medicine_name)
                total_price = total_price + float(stock.price or 0.0)
                
        # Match Services
        has_services = True
        for srv in needed_services:
            srv_stock = db.query(models.PharmacyMedicine).filter(
                models.PharmacyMedicine.pharmacy_id == ph.id,
                models.PharmacyMedicine.type == "service",
                models.PharmacyMedicine.medicine_name.ilike(f"%{srv}%")
            ).first()
            if not srv_stock:
                has_services = False
                break
                
        # Validation Logic: Must have required services, and if meds are requested, must have at least one med
        is_valid = False
        if needed_medicines and matched and has_services:
            is_valid = True
        elif needed_services and not needed_medicines and has_services:
            is_valid = True
        elif not needed_medicines and not needed_services: # Blank canvas request (e.g. photo only)
            is_valid = True
            
        if is_valid:
            dist = float(get_distance(p_lat, p_lon, ph.latitude, ph.longitude))
            pharmacy_data = {
                "id": ph.id,
                "name": ph.name,
                "address": ph.address,
                "contact_number": ph.contact_number,
                "latitude": ph.latitude,
                "longitude": ph.longitude,
                "place_id": ph.place_id,
                "matched_medicines": matched,
                "total_price_estimate": total_price,
                "distance_km": round(dist, 2)
            }
            results.append(pharmacy_data)
            
    # Sort by distance
    results.sort(key=lambda x: x.get("distance_km", 9999))
    return results

@router.patch("/{prescription_id}/assign", response_model=schemas.Prescription)
def assign_prescription(
    prescription_id: int, 
    pharmacy_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.Patient = Depends(deps.get_current_active_patient)
):
    db_prescription = db.query(models.Prescription).filter(models.Prescription.id == prescription_id).first()
    if not db_prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    if db_prescription.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to assign this prescription")
        
    db_prescription.assigned_pharmacy_id = pharmacy_id
    db.commit()
    db.refresh(db_prescription)
    return db_prescription
