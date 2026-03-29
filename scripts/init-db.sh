#!/bin/bash
# Database initialization script for MedConnect

set -e

echo "=== MedConnect Database Initialization ==="

# Check if running in Docker
if [ -f /.dockerenv ]; then
    echo "Running inside Docker container"
    HOST="db"
else
    echo "Running on host"
    HOST="localhost"
fi

# Database credentials
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-medconnect}"
DB_PORT="${DB_PORT:-5432}"

echo "Waiting for PostgreSQL to be ready..."
until PGPASSWORD=$DB_PASSWORD psql -h "$HOST" -p "$DB_PORT" -U "$DB_USER" -c '\q'; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 1
done

echo "PostgreSQL is ready!"

# Check if database exists
if PGPASSWORD=$DB_PASSWORD psql -h "$HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "Database '$DB_NAME' already exists"
else
    echo "Creating database '$DB_NAME'..."
    PGPASSWORD=$DB_PASSWORD psql -h "$HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
    echo "Database created successfully!"
fi

# Enable required extensions
echo "Enabling PostgreSQL extensions..."
PGPASSWORD=$DB_PASSWORD psql -h "$HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geospatial queries (optional)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
\$\$ language 'plpgsql';

-- Apply updated_at trigger to tables
DO \$\$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
        CREATE TRIGGER update_orders_updated_at
            BEFORE UPDATE ON orders
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pharmacy_medicines') THEN
        DROP TRIGGER IF EXISTS update_pharmacy_medicines_updated_at ON pharmacy_medicines;
        CREATE TRIGGER update_pharmacy_medicines_updated_at
            BEFORE UPDATE ON pharmacy_medicines
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END \$\$;
EOF

echo "Database initialization complete!"
