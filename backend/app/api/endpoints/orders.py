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
