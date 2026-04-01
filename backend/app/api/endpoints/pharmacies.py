from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from app.db import models, database
from app.schemas import schemas
import math
import os
import uuid
import shutil
import logging

from app.api import deps
from passlib.context import CryptContext
from app.core.config import settings

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads/products"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed file types for upload
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024  # Convert MB to bytes


def get_password_hash(password):
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def validate_image_file(file: UploadFile) -> None:
    """Validate uploaded image file type and size."""
    # Check content type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )


@router.post("/register", response_model=schemas.Pharmacy, status_code=status.HTTP_201_CREATED)
def register_pharmacy(pharmacy: schemas.PharmacyCreate, db: Session = Depends(database.get_db)):
    """Register a new pharmacy."""
    # Check if email already exists
    db_pharmacy = db.query(models.Pharmacy).filter(models.Pharmacy.email == pharmacy.email).first()
    if db_pharmacy:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_pharmacy = models.Pharmacy(
        name=pharmacy.name,
        email=pharmacy.email,
        hashed_password=get_password_hash(pharmacy.password),
        address=pharmacy.address,
        contact_number=pharmacy.contact_number,
        latitude=pharmacy.latitude,
        longitude=pharmacy.longitude,
        place_id=pharmacy.place_id,
        image_url=pharmacy.image_url,
        is_verified=0  # New pharmacies need verification
    )
    db.add(new_pharmacy)
    db.commit()
    db.refresh(new_pharmacy)
    logger.info(f"New pharmacy registered: {pharmacy.email}")
    return new_pharmacy


@router.get("/shop", response_model=List[schemas.PharmacyMedicine])
def get_all_products_for_shop(
    search: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Public endpoint - returns all in-stock items across all pharmacies for e-commerce browsing."""
    query = db.query(models.PharmacyMedicine, models.Pharmacy.name.label("pharmacy_name")).join(
        models.Pharmacy, models.PharmacyMedicine.pharmacy_id == models.Pharmacy.id
    ).filter(models.PharmacyMedicine.is_available == 1, models.PharmacyMedicine.quantity > 0)
    
    if search:
        # Use parameterized query to prevent SQL injection
        search_pattern = f"%{search}%"
        query = query.filter(models.PharmacyMedicine.medicine_name.ilike(search_pattern))
    if type:
        query = query.filter(models.PharmacyMedicine.type == type)
    
    results = query.all()
    items = []
    for item, pharmacy_name in results:
        d = {
            "id": item.id,
            "pharmacy_id": item.pharmacy_id,
            "medicine_name": item.medicine_name,
            "description": item.description,
            "type": item.type,
            "quantity": item.quantity,
            "price": item.price,
            "image_url": item.image_url,
            "is_available": item.is_available,
            "pharmacy_name": pharmacy_name,
        }
        items.append(d)
    return items


@router.get("/nearby", response_model=List[schemas.Pharmacy])
def get_nearby_pharmacies(
    lat: float, 
    lon: float, 
    radius_km: float = 10.0,
    db: Session = Depends(database.get_db)
):
    """Get pharmacies within a specified radius using Haversine formula."""
    # Use SQLAlchemy text() for safe parameterized queries
    haversine_formula = """
        (6371 * acos(
            cos(radians(:lat)) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(:lon)) + 
            sin(radians(:lat)) * 
            sin(radians(latitude))
        ))
    """
    
    query = text(f"""
        SELECT *, {haversine_formula} AS distance 
        FROM pharmacies 
        WHERE {haversine_formula} <= :radius 
        ORDER BY distance
    """)
    
    result = db.execute(query, {"lat": lat, "lon": lon, "radius": radius_km}).mappings().all()
    return [dict(row) for row in result]


@router.get("/", response_model=list[schemas.Pharmacy])
def read_pharmacies(db: Session = Depends(database.get_db)):
    """Get all pharmacies."""
    try:
        return db.query(models.Pharmacy).all()
    except Exception as e:
        logger.error(f"Error fetching pharmacies: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/all", response_model=list[schemas.Pharmacy])
def get_all_pharmacies(db: Session = Depends(database.get_db)):
    """Get all pharmacies (alias)."""
    return db.query(models.Pharmacy).all()


@router.get("/{pharmacy_id}/inventory", response_model=list[schemas.PharmacyMedicine])
def read_pharmacy_inventory(pharmacy_id: int, db: Session = Depends(database.get_db)):
    """Get inventory for a specific pharmacy."""
    items = db.query(models.PharmacyMedicine).filter(
        models.PharmacyMedicine.pharmacy_id == pharmacy_id
    ).all()
    
    ph = db.query(models.Pharmacy).filter(models.Pharmacy.id == pharmacy_id).first()
    result = []
    for item in items:
        # Use model_validate for Pydantic v2 compatibility
        d = schemas.PharmacyMedicine.model_validate(item)
        d.pharmacy_name = ph.name if ph else None
        result.append(d)
    return result


@router.post("/{pharmacy_id}/inventory/upload-image")
async def upload_product_image(
    pharmacy_id: int,
    file: UploadFile = File(...),
    current_pharmacy: models.Pharmacy = Depends(deps.get_current_active_pharmacy)
):
    """Upload a product image, returns the image URL."""
    if current_pharmacy.id != pharmacy_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Validate file
    validate_image_file(file)
    
    # Check file size by reading content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE_MB}MB"
        )
    
    # Generate safe filename
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        ext = ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    # Write file
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    logger.info(f"Product image uploaded: {filename} for pharmacy {pharmacy_id}")
    return {"image_url": f"/uploads/products/{filename}"}


@router.post("/{pharmacy_id}/inventory", response_model=list[schemas.PharmacyMedicine])
def update_pharmacy_inventory(
    pharmacy_id: int, 
    inventory: list[schemas.PharmacyMedicineCreate], 
    db: Session = Depends(database.get_db),
    current_pharmacy: models.Pharmacy = Depends(deps.get_current_active_pharmacy)
):
    """Update pharmacy inventory (replaces all items)."""
    if current_pharmacy.id != pharmacy_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this pharmacy's inventory")

    # Delete existing inventory
    db.query(models.PharmacyMedicine).filter(
        models.PharmacyMedicine.pharmacy_id == pharmacy_id
    ).delete()
    
    # Add new items
    db_items = []
    for item in inventory:
        db_item = models.PharmacyMedicine(**item.model_dump(), pharmacy_id=pharmacy_id)
        db.add(db_item)
        db_items.append(db_item)
    
    db.commit()
    logger.info(f"Inventory updated for pharmacy {pharmacy_id}")
    return db_items


@router.post("/", response_model=schemas.Pharmacy, status_code=status.HTTP_201_CREATED)
def create_pharmacy(
    pharmacy: schemas.PharmacyBase, 
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    """Create a new pharmacy (admin only)."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db_pharmacy = models.Pharmacy(**pharmacy.model_dump())
    db.add(db_pharmacy)
    db.commit()
    db.refresh(db_pharmacy)
    logger.info(f"Pharmacy created by admin: {db_pharmacy.id}")
    return db_pharmacy


@router.post("/{pharmacy_id}/reviews", response_model=schemas.Review, status_code=status.HTTP_201_CREATED)
def post_pharmacy_review(
    pharmacy_id: int,
    review: schemas.ReviewCreate,
    db: Session = Depends(database.get_db),
    current_patient: models.Patient = Depends(deps.get_current_active_patient)
):
    """Post a review for a pharmacy."""
    # Verify pharmacy exists
    pharmacy = db.query(models.Pharmacy).filter(models.Pharmacy.id == pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    db_review = models.Review(
        patient_id=current_patient.id,
        pharmacy_id=pharmacy_id,
        rating=review.rating,
        comment=review.comment
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    logger.info(f"Review posted by patient {current_patient.id} for pharmacy {pharmacy_id}")
    return db_review


@router.get("/reviews/all", response_model=List[schemas.Review])
def get_all_reviews(db: Session = Depends(database.get_db)):
    """Fetch recent reviews for the landing page."""
    try:
        reviews = db.query(models.Review, models.Patient.full_name, models.Pharmacy.name).join(
            models.Patient, models.Review.patient_id == models.Patient.id
        ).join(
            models.Pharmacy, models.Review.pharmacy_id == models.Pharmacy.id
        ).order_by(models.Review.created_at.desc()).limit(10).all()
        
        result = []
        for review, p_name, ph_name in reviews:
            r = schemas.Review.model_validate(review)
            r.patient_name = p_name
            r.pharmacy_name = ph_name
            result.append(r)
        return result
    except Exception as e:
        logger.error(f"Error fetching reviews: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
