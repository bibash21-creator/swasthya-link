from app.db.database import SessionLocal
from app.db.models import Patient
import traceback

try:
    db = SessionLocal()
    new_patient = Patient(
        full_name="Test",
        email="pt45@test.com",
        hashed_password="hashed_pass",
        latitude=27.7,
        longitude=85.3
    )
    db.add(new_patient)
    db.commit()
    print("SUCCESS")
except Exception as e:
    traceback.print_exc()
finally:
    db.close()
