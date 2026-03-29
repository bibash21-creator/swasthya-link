import psycopg2
import sys

db_url = "postgresql://postgres:B1b%40sh%40321@localhost:5432/medconnect"

def add_column(cur, table, column, type_def):
    try:
        # Use IF NOT EXISTS for PostgreSQL 9.6+
        cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {type_def};")
        print(f"Checked/Added {column} to {table}")
    except Exception as e:
        # Only rollback if it's a critical error, but IF NOT EXISTS should prevent most
        print(f"Error adding {column} to {table}: {e}")
        # No mass rollback here unless we really need to stop the whole thing.

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # Pharmacies
    add_column(cur, "pharmacies", "email", "VARCHAR UNIQUE")
    add_column(cur, "pharmacies", "hashed_password", "VARCHAR")
    add_column(cur, "pharmacies", "address", "VARCHAR")
    add_column(cur, "pharmacies", "contact_number", "VARCHAR")
    add_column(cur, "pharmacies", "latitude", "FLOAT")
    add_column(cur, "pharmacies", "longitude", "FLOAT")
    add_column(cur, "pharmacies", "place_id", "VARCHAR")
    
    # Patients
    add_column(cur, "patients", "email", "VARCHAR UNIQUE")
    add_column(cur, "patients", "hashed_password", "VARCHAR")
    add_column(cur, "patients", "latitude", "FLOAT")
    add_column(cur, "patients", "longitude", "FLOAT")
    
    # Medicines
    add_column(cur, "pharmacy_medicines", "type", "VARCHAR DEFAULT 'medicine'")
    add_column(cur, "pharmacy_medicines", "image_url", "VARCHAR")
    add_column(cur, "pharmacy_medicines", "description", "TEXT")
    
    # Prescriptions
    add_column(cur, "prescriptions", "assigned_pharmacy_id", "INTEGER REFERENCES pharmacies(id)")
    add_column(cur, "prescriptions", "status", "VARCHAR DEFAULT 'pending'")
    add_column(cur, "prescriptions", "latitude", "FLOAT")
    add_column(cur, "prescriptions", "longitude", "FLOAT")
        
    conn.commit()
    cur.close()
    conn.close()
    print("Migration successful")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
