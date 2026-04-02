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
from argon2 import PasswordHasher

from app.api import deps
from app.core.config import settings

router = APIRouter()
ph = PasswordHasher(time_cost=2, memory_cost=65536, parallelism=1)
logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads/products"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed file types for upload
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024  # Convert MB to bytes


def get_password_hash(password):
    """Hash password using Argon2 - no length limits."""
    return ph.hash(password)


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


@router.get("/search/advanced")
def search_pharmacies_advanced(
    lat: float,
    lon: float,
    medicine_name: Optional[str] = None,
    radius_km: float = 10.0,
    max_price: Optional[float] = None,
    sort_by: str = "distance",  # distance, price, availability
    db: Session = Depends(database.get_db)
):
    """
    Advanced pharmacy search with multi-criteria matching:
    - Distance: Find pharmacies within radius
    - Medicine availability: Check if specific medicine is in stock
    - Price comparison: Compare prices across pharmacies
    """
    try:
        # Haversine formula for distance calculation
        haversine = """
            (6371 * acos(
                cos(radians(:lat)) * cos(radians(p.latitude)) *
                cos(radians(p.longitude) - radians(:lon)) +
                sin(radians(:lat)) * sin(radians(p.latitude))
            ))
        """
        
        # Base query to get pharmacies within radius
        base_query = text(f"""
            SELECT p.*, {haversine} AS distance
            FROM pharmacies p
            WHERE {haversine} <= :radius
            ORDER BY distance
        """)
        
        pharmacies_result = db.execute(base_query, {
            "lat": lat, "lon": lon, "radius": radius_km
        }).mappings().all()
        
        results = []
        
        for pharmacy_row in pharmacies_result:
            pharmacy = dict(pharmacy_row)
            pharmacy_id = pharmacy['id']
            
            # Get inventory for this pharmacy
            inventory_query = db.query(models.PharmacyMedicine).filter(
                models.PharmacyMedicine.pharmacy_id == pharmacy_id
            )
            
            # Filter by medicine name if provided
            medicine_match = None
            if medicine_name:
                medicine_match = inventory_query.filter(
                    models.PharmacyMedicine.medicine_name.ilike(f"%{medicine_name}%"),
                    models.PharmacyMedicine.quantity > 0
                ).first()
                
                # Skip if medicine not found and user specifically searching for it
                if medicine_name and not medicine_match:
                    continue
            
            # Get all available medicines for price comparison
            available_medicines = inventory_query.filter(
                models.PharmacyMedicine.quantity > 0
            ).all()
            
            # Calculate availability score (percentage of medicines in stock)
            total_medicines = db.query(models.PharmacyMedicine).filter(
                models.PharmacyMedicine.pharmacy_id == pharmacy_id
            ).count()
            
            in_stock_count = len(available_medicines)
            availability_score = (in_stock_count / total_medicines * 100) if total_medicines > 0 else 0
            
            # Build result
            result = {
                "pharmacy": pharmacy,
                "distance_km": round(pharmacy['distance'], 2),
                "availability_score": round(availability_score, 1),
                "total_medicines": total_medicines,
                "in_stock_count": in_stock_count,
                "contact": {
                    "phone": pharmacy.get('contact_number', 'N/A'),
                    "email": pharmacy.get('email', 'N/A'),
                    "address": pharmacy.get('address', 'N/A')
                }
            }
            
            # Add specific medicine info if searched
            if medicine_match:
                result["searched_medicine"] = {
                    "name": medicine_match.medicine_name,
                    "price": medicine_match.price,
                    "quantity_available": medicine_match.quantity,
                    "in_stock": medicine_match.quantity > 0
                }
                
                # Filter by max price if specified
                if max_price and medicine_match.price and medicine_match.price > max_price:
                    continue
            
            # Add price comparison data (top 5 cheapest medicines)
            sorted_by_price = sorted(
                available_medicines,
                key=lambda x: x.price if x.price else float('inf')
            )[:5]
            
            result["price_comparison"] = [
                {
                    "name": m.medicine_name,
                    "price": m.price,
                    "quantity": m.quantity
                }
                for m in sorted_by_price if m.price
            ]
            
            results.append(result)
        
        # Sort results based on user preference
        if sort_by == "price" and medicine_name:
            results.sort(key=lambda x: x.get("searched_medicine", {}).get("price", float('inf')))
        elif sort_by == "availability":
            results.sort(key=lambda x: x["availability_score"], reverse=True)
        # Default: sort by distance (already sorted)
        
        return {
            "search_criteria": {
                "latitude": lat,
                "longitude": lon,
                "radius_km": radius_km,
                "medicine_name": medicine_name,
                "max_price": max_price,
                "sort_by": sort_by
            },
            "results_count": len(results),
            "pharmacies": results
        }
        
    except Exception as e:
        logger.error(f"Error in advanced search: {e}")
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")


# ==================== PHARMACY SELF-MANAGEMENT ====================

@router.get("/me/profile")
async def get_my_profile(
    db: Session = Depends(database.get_db),
    current_user: models.Pharmacy = Depends(deps.get_current_active_pharmacy)
):
    """Get current pharmacy's own profile."""
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "address": current_user.address,
        "contact_number": current_user.contact_number,
        "latitude": current_user.latitude,
        "longitude": current_user.longitude,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at
    }


@router.put("/me/profile")
async def update_my_profile(
    name: Optional[str] = None,
    address: Optional[str] = None,
    contact_number: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    db: Session = Depends(database.get_db),
    current_user: models.Pharmacy = Depends(deps.get_current_active_pharmacy)
):
    """Update current pharmacy's profile."""
    if name:
        current_user.name = name
    if address:
        current_user.address = address
    if contact_number:
        current_user.contact_number = contact_number
    if latitude is not None:
        current_user.latitude = latitude
    if longitude is not None:
        current_user.longitude = longitude
    
    db.commit()
    db.refresh(current_user)
    return {"message": "Profile updated successfully", "pharmacy": current_user}


@router.get("/me/inventory")
async def get_my_inventory(
    db: Session = Depends(database.get_db),
    current_user: models.Pharmacy = Depends(deps.get_current_active_pharmacy)
):
    """Get current pharmacy's inventory."""
    items = db.query(models.PharmacyMedicine).filter(
        models.PharmacyMedicine.pharmacy_id == current_user.id
    ).all()
    return items


@router.post("/me/inventory")
async def add_inventory_item(
    medicine_name: str,
    description: Optional[str] = None,
    quantity: int = 0,
    price: Optional[float] = None,
    type: str = "medicine",
    db: Session = Depends(database.get_db),
    current_user: models.Pharmacy = Depends(deps.get_current_active_pharmacy)
):
    """Add new item to pharmacy's inventory."""
    item = models.PharmacyMedicine(
        pharmacy_id=current_user.id,
        medicine_name=medicine_name,
        description=description,
        quantity=quantity,
        price=price,
        type=type,
        is_available=1 if quantity > 0 else 0
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"message": "Item added successfully", "item": item}


@router.put("/me/inventory/{item_id}")
async def update_inventory_item(
    item_id: int,
    medicine_name: Optional[str] = None,
    description: Optional[str] = None,
    quantity: Optional[int] = None,
    price: Optional[float] = None,
    is_available: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.Pharmacy = Depends(deps.get_current_active_pharmacy)
):
    """Update an inventory item."""
    item = db.query(models.PharmacyMedicine).filter(
        models.PharmacyMedicine.id == item_id,
        models.PharmacyMedicine.pharmacy_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if medicine_name:
        item.medicine_name = medicine_name
    if description is not None:
        item.description = description
    if quantity is not None:
        item.quantity = quantity
        item.is_available = 1 if quantity > 0 else 0
    if price is not None:
        item.price = price
    if is_available is not None:
        item.is_available = is_available
    
    db.commit()
    db.refresh(item)
    return {"message": "Item updated successfully", "item": item}


@router.delete("/me/inventory/{item_id}")
async def delete_inventory_item(
    item_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Pharmacy = Depends(deps.get_current_active_pharmacy)
):
    """Delete an inventory item."""
    item = db.query(models.PharmacyMedicine).filter(
        models.PharmacyMedicine.id == item_id,
        models.PharmacyMedicine.pharmacy_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}


@router.get("/me/orders")
async def get_my_orders(
    status: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.Pharmacy = Depends(deps.get_current_active_pharmacy)
):
    """Get orders for current pharmacy."""
    query = db.query(models.Order).filter(models.Order.pharmacy_id == current_user.id)
    if status:
        query = query.filter(models.Order.status == status)
    orders = query.all()
    
    result = []
    for order in orders:
        patient = db.query(models.Patient).filter(models.Patient.id == order.patient_id).first()
        result.append({
            "id": order.id,
            "status": order.status,
            "total_amount": order.total_amount,
            "payment_status": order.payment_status,
            "created_at": order.created_at,
            "patient": {"id": patient.id, "name": patient.full_name} if patient else None
        })
    return result


@router.put("/me/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    status: str,
    db: Session = Depends(database.get_db),
    current_user: models.Pharmacy = Depends(deps.get_current_active_pharmacy)
):
    """Update status of an order."""
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.pharmacy_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = status
    db.commit()
    return {"message": "Order status updated", "order_id": order_id, "status": status}
