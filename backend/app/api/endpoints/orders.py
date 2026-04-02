from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db import models, database
from app.schemas import schemas
from app.api import deps
import datetime

router = APIRouter()

@router.post("/", response_model=schemas.Order)
def create_order(
    order_in: schemas.OrderCreate,
    db: Session = Depends(database.get_db),
    current_patient: models.Patient = Depends(deps.get_current_active_patient)
):
    # 1. Verify pharmacy exists
    pharmacy = db.query(models.Pharmacy).filter(models.Pharmacy.id == order_in.pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")

    # 2. Calculate total and verify stock
    total_amount = 0.0
    items_to_create = []
    
    for item_in in order_in.items:
        product = db.query(models.PharmacyMedicine).filter(
            models.PharmacyMedicine.id == item_in.medicine_id,
            models.PharmacyMedicine.pharmacy_id == order_in.pharmacy_id
        ).first()
        
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item_in.medicine_id} not found in this pharmacy")
        
        if product.quantity < item_in.quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for {product.medicine_name}")
        
        item_total = (product.price or 0.0) * item_in.quantity
        total_amount += item_total
        
        # Decrement stock
        product.quantity -= item_in.quantity
        
        items_to_create.append(models.OrderItem(
            medicine_id=product.id,
            quantity=item_in.quantity,
            price_at_time=product.price or 0.0
        ))

    # 3. Create Order
    new_order = models.Order(
        patient_id=current_patient.id,
        pharmacy_id=order_in.pharmacy_id,
        total_amount=total_amount,
        status="pending",
        payment_method=order_in.payment_method,
        payment_status="unpaid"
    )
    
    db.add(new_order)
    db.flush() # Get order ID

    for item in items_to_create:
        item.order_id = new_order.id
        db.add(item)

    db.commit()
    db.refresh(new_order)
    return new_order

@router.get("/my-orders", response_model=List[schemas.Order])
def get_my_orders(
    db: Session = Depends(database.get_db),
    current_patient: models.Patient = Depends(deps.get_current_active_patient)
):
    return db.query(models.Order).filter(models.Order.patient_id == current_patient.id).order_by(models.Order.created_at.desc()).all()

@router.get("/pharmacy-orders", response_model=List[schemas.Order])
def get_pharmacy_orders(
    db: Session = Depends(database.get_db),
    current_pharmacy: models.Pharmacy = Depends(deps.get_current_active_pharmacy)
):
    return db.query(models.Order).filter(models.Order.pharmacy_id == current_pharmacy.id).order_by(models.Order.created_at.desc()).all()

@router.patch("/{order_id}/status", response_model=schemas.Order)
def update_order_status(
    order_id: int,
    status: str,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check permissions
    if current_user["role"] == "pharmacy":
        if order.pharmacy_id != current_user["user"].id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user["role"] == "patient":
        if order.patient_id != current_user["user"].id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    order.status = status
    db.commit()
    db.refresh(order)
    return order


# ==================== REAL-TIME ORDER TRACKING ====================

@router.get("/{order_id}/tracking")
def get_order_tracking(
    order_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    """Get real-time tracking info for an order."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check permissions
    if current_user["role"] == "patient" and order.patient_id != current_user["user"].id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user["role"] == "pharmacy" and order.pharmacy_id != current_user["user"].id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get patient and pharmacy details
    patient = db.query(models.Patient).filter(models.Patient.id == order.patient_id).first()
    pharmacy = db.query(models.Pharmacy).filter(models.Pharmacy.id == order.pharmacy_id).first()
    
    return {
        "order_id": order.id,
        "status": order.status,
        "payment_status": order.payment_status,
        "estimated_delivery": order.estimated_delivery_time,
        
        # Patient (delivery) location
        "delivery_location": {
            "address": order.delivery_address or patient.full_name if patient else None,
            "lat": order.delivery_lat or patient.latitude if patient else None,
            "lon": order.delivery_lon or patient.longitude if patient else None,
            "notes": order.delivery_notes
        },
        
        # Pharmacy location
        "pharmacy_location": {
            "name": pharmacy.name if pharmacy else None,
            "address": pharmacy.address if pharmacy else None,
            "lat": pharmacy.latitude if pharmacy else None,
            "lon": pharmacy.longitude if pharmacy else None,
            "phone": pharmacy.contact_number if pharmacy else None
        },
        
        # Rider (real-time) location
        "rider": {
            "name": order.rider_name,
            "phone": order.rider_phone,
            "current_lat": order.rider_lat,
            "current_lon": order.rider_lon
        },
        
        "updated_at": order.updated_at
    }


@router.put("/{order_id}/rider-location")
def update_rider_location(
    order_id: int,
    lat: float,
    lon: float,
    db: Session = Depends(database.get_db),
    current_pharmacy: models.Pharmacy = Depends(deps.get_current_active_pharmacy)
):
    """Update rider's current location (for real-time tracking)."""
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.pharmacy_id == current_pharmacy.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.rider_lat = lat
    order.rider_lon = lon
    db.commit()
    
    return {"message": "Rider location updated", "lat": lat, "lon": lon}


@router.put("/{order_id}/assign-rider")
def assign_rider(
    order_id: int,
    rider_name: str,
    rider_phone: str,
    estimated_time: datetime.datetime,
    db: Session = Depends(database.get_db),
    current_pharmacy: models.Pharmacy = Depends(deps.get_current_active_pharmacy)
):
    """Assign a delivery rider to an order."""
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.pharmacy_id == current_pharmacy.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.rider_name = rider_name
    order.rider_phone = rider_phone
    order.estimated_delivery_time = estimated_time
    order.status = "shipped"
    db.commit()
    
    return {
        "message": "Rider assigned",
        "rider_name": rider_name,
        "rider_phone": rider_phone,
        "estimated_delivery": estimated_time
    }


@router.get("/pharmacy/map-view")
def get_pharmacy_orders_map(
    db: Session = Depends(database.get_db),
    current_pharmacy: models.Pharmacy = Depends(deps.get_current_active_pharmacy)
):
    """Get all orders with delivery locations for map view."""
    orders = db.query(models.Order).filter(
        models.Order.pharmacy_id == current_pharmacy.id,
        models.Order.status.in_(["paid", "preparing", "shipped"])
    ).all()
    
    result = []
    for order in orders:
        patient = db.query(models.Patient).filter(models.Patient.id == order.patient_id).first()
        
        # Use delivery location if set, otherwise patient location
        lat = order.delivery_lat or (patient.latitude if patient else None)
        lon = order.delivery_lon or (patient.longitude if patient else None)
        
        if lat and lon:
            result.append({
                "order_id": order.id,
                "status": order.status,
                "patient_name": patient.full_name if patient else "Unknown",
                "patient_phone": patient.email if patient else None,  # Use email as contact
                "delivery_address": order.delivery_address or patient.full_name if patient else None,
                "lat": lat,
                "lon": lon,
                "total_amount": order.total_amount,
                "rider_name": order.rider_name,
                "rider_phone": order.rider_phone
            })
    
    return {
        "pharmacy_location": {
            "lat": current_pharmacy.latitude,
            "lon": current_pharmacy.longitude,
            "name": current_pharmacy.name
        },
        "orders": result
    }
