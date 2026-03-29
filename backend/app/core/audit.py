from sqlalchemy.orm import Session
from app.db.models import AuditLog
import datetime

def log_action(db: Session, user_id: int, user_role: str, action: str, details: str = None):
    audit_log = AuditLog(
        user_id=user_id,
        user_role=user_role,
        action=action,
        details=details,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log
