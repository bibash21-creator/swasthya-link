from app.db.database import SessionLocal, engine
from app.db.models import Patient, Pharmacy, Prescription
from sqlalchemy import inspect

db = SessionLocal()
try:
    inspector = inspect(engine)
    print("TABLES FOUND:", inspector.get_table_names())
    
    print("Checking Patient...")
    all_p = db.query(Patient).all()
    print(f"Success! {len(all_p)} patients found.")
    
    print("Checking Pharmacy...")
    all_ph = db.query(Pharmacy).all()
    print(f"Success! {len(all_ph)} pharmacies found.")
except Exception as e:
    import traceback
    print("ERROR:")
    traceback.print_exc()
finally:
    db.close()
