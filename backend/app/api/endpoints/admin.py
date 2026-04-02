from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db import models, database
from app.schemas import schemas
from app.api import deps
from app.core.audit import log_action

router = APIRouter()

# Helper to check admin
def require_admin(current_user: dict):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.get("/audit-logs", response_model=List[dict])
async def get_audit_logs(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(100).all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "role": l.user_role,
            "action": l.action,
            "details": l.details,
            "timestamp": l.timestamp
        } for l in logs
    ]

@router.delete("/problematic-review/{review_id}")
async def delete_review(
    review_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    db.delete(review)
    db.commit()
    log_action(db, current_user["user"].id, "admin", "delete_review", f"Deleted review {review_id}")
    return {"message": "Review deleted successfully"}

@router.get("/stats")
async def get_stats(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    p_count = db.query(models.Patient).count()
    ph_count = db.query(models.Pharmacy).count()
    pr_count = db.query(models.Prescription).count()
    
    return {
        "patients": p_count,
        "pharmacies": ph_count,
        "prescriptions": pr_count
    }


# ==================== PATIENT MANAGEMENT ====================

@router.get("/patients", response_model=List[dict])
async def get_all_patients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    """Get all patients with pagination."""
    require_admin(current_user)
    patients = db.query(models.Patient).offset(skip).limit(limit).all()
    return [
        {
            "id": p.id,
            "full_name": p.full_name,
            "email": p.email,
            "is_verified": p.is_verified,
            "created_at": p.created_at,
            "latitude": p.latitude,
            "longitude": p.longitude
        } for p in patients
    ]


@router.get("/patients/{patient_id}")
async def get_patient_detail(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    """Get detailed patient info including prescriptions and orders."""
    require_admin(current_user)
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    prescriptions = db.query(models.Prescription).filter(
        models.Prescription.patient_id == patient_id
    ).all()
    
    orders = db.query(models.Order).filter(
        models.Order.patient_id == patient_id
    ).all()
    
    return {
        "id": patient.id,
        "full_name": patient.full_name,
        "email": patient.email,
        "is_verified": patient.is_verified,
        "created_at": patient.created_at,
        "location": {"lat": patient.latitude, "lon": patient.longitude},
        "prescriptions": [{"id": p.id, "status": p.status, "created_at": p.created_at} for p in prescriptions],
        "orders": [{"id": o.id, "status": o.status, "total": o.total_amount} for o in orders]
    }


@router.delete("/patients/{patient_id}")
async def delete_patient(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    """Delete a patient account."""
    require_admin(current_user)
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    db.delete(patient)
    db.commit()
    log_action(db, current_user["user"].id, "admin", "delete_patient", f"Deleted patient {patient_id}")
    return {"message": "Patient deleted successfully"}


# ==================== PHARMACY MANAGEMENT ====================

@router.get("/pharmacies", response_model=List[dict])
async def get_all_pharmacies_admin(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    """Get all pharmacies with pagination."""
    require_admin(current_user)
    pharmacies = db.query(models.Pharmacy).offset(skip).limit(limit).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "address": p.address,
            "contact_number": p.contact_number,
            "is_verified": p.is_verified,
            "created_at": p.created_at,
            "latitude": p.latitude,
            "longitude": p.longitude
        } for p in pharmacies
    ]


@router.get("/pharmacies/{pharmacy_id}")
async def get_pharmacy_detail_admin(
    pharmacy_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    """Get detailed pharmacy info including inventory and orders."""
    require_admin(current_user)
    pharmacy = db.query(models.Pharmacy).filter(models.Pharmacy.id == pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    inventory = db.query(models.PharmacyMedicine).filter(
        models.PharmacyMedicine.pharmacy_id == pharmacy_id
    ).all()
    
    orders = db.query(models.Order).filter(
        models.Order.pharmacy_id == pharmacy_id
    ).all()
    
    return {
        "id": pharmacy.id,
        "name": pharmacy.name,
        "email": pharmacy.email,
        "address": pharmacy.address,
        "contact_number": pharmacy.contact_number,
        "is_verified": pharmacy.is_verified,
        "created_at": pharmacy.created_at,
        "location": {"lat": pharmacy.latitude, "lon": pharmacy.longitude},
        "inventory_count": len(inventory),
        "orders_count": len(orders)
    }


@router.put("/pharmacies/{pharmacy_id}/verify")
async def verify_pharmacy(
    pharmacy_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    """Verify a pharmacy account."""
    require_admin(current_user)
    pharmacy = db.query(models.Pharmacy).filter(models.Pharmacy.id == pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    pharmacy.is_verified = 1
    db.commit()
    log_action(db, current_user["user"].id, "admin", "verify_pharmacy", f"Verified pharmacy {pharmacy_id}")
    return {"message": "Pharmacy verified successfully"}


@router.delete("/pharmacies/{pharmacy_id}")
async def delete_pharmacy(
    pharmacy_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    """Delete a pharmacy account."""
    require_admin(current_user)
    pharmacy = db.query(models.Pharmacy).filter(models.Pharmacy.id == pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    db.delete(pharmacy)
    db.commit()
    log_action(db, current_user["user"].id, "admin", "delete_pharmacy", f"Deleted pharmacy {pharmacy_id}")
    return {"message": "Pharmacy deleted successfully"}


# ==================== ORDER MANAGEMENT ====================

@router.get("/orders")
async def get_all_orders(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    """Get all orders with optional status filter."""
    require_admin(current_user)
    query = db.query(models.Order)
    if status:
        query = query.filter(models.Order.status == status)
    orders = query.offset(skip).limit(limit).all()
    
    result = []
    for order in orders:
        patient = db.query(models.Patient).filter(models.Patient.id == order.patient_id).first()
        pharmacy = db.query(models.Pharmacy).filter(models.Pharmacy.id == order.pharmacy_id).first()
        result.append({
            "id": order.id,
            "status": order.status,
            "total_amount": order.total_amount,
            "payment_status": order.payment_status,
            "created_at": order.created_at,
            "patient": {"id": patient.id, "name": patient.full_name} if patient else None,
            "pharmacy": {"id": pharmacy.id, "name": pharmacy.name} if pharmacy else None
        })
    return result


@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    status: str,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(deps.get_current_user)
):
    """Update order status."""
    require_admin(current_user)
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = status
    db.commit()
    log_action(db, current_user["user"].id, "admin", "update_order_status", f"Order {order_id} -> {status}")
    return {"message": "Order status updated", "order_id": order_id, "status": status}
