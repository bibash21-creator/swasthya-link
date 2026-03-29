from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db import models, database
from app.schemas import schemas
from app.api import deps
from app.core.audit import log_action

router = APIRouter()

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
