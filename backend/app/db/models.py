from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Index
from sqlalchemy.orm import relationship
from app.db.database import Base
import datetime


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_verified = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    prescriptions = relationship("Prescription", back_populates="owner", lazy="dynamic")
    reviews = relationship("Review", back_populates="patient", lazy="dynamic")
    orders = relationship("Order", back_populates="patient", lazy="dynamic")

    # Composite index for location-based queries
    __table_args__ = (
        Index('idx_patient_location', 'latitude', 'longitude'),
        Index('idx_patient_verified', 'is_verified'),
    )


class Pharmacy(Base):
    __tablename__ = "pharmacies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    address = Column(String(500), nullable=True)
    contact_number = Column(String(50), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    place_id = Column(String(255), nullable=True, index=True)
    image_url = Column(String(500), nullable=True)
    is_verified = Column(Integer, default=0, nullable=False)  # 0 for False, 1 for True
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    inventory = relationship("PharmacyMedicine", back_populates="pharmacy", lazy="dynamic")
    assigned_prescriptions = relationship("Prescription", back_populates="assigned_pharmacy", lazy="dynamic")
    reviews = relationship("Review", back_populates="pharmacy", lazy="dynamic")
    orders = relationship("Order", back_populates="pharmacy", lazy="dynamic")

    # Composite index for location-based queries
    __table_args__ = (
        Index('idx_pharmacy_location', 'latitude', 'longitude'),
        Index('idx_pharmacy_verified', 'is_verified'),
    )


class PharmacyMedicine(Base):
    __tablename__ = "pharmacy_medicines"

    id = Column(Integer, primary_key=True, index=True)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_name = Column(String(255), index=True, nullable=False)  # Used for both medicine name and service name
    description = Column(String(1000), nullable=True)  # Product description
    type = Column(String(50), default="medicine", nullable=False, index=True)  # "medicine" or "service"
    quantity = Column(Integer, default=0, nullable=False)
    price = Column(Float, nullable=True)
    image_url = Column(String(500), nullable=True)  # Product image URL
    is_available = Column(Integer, default=1, nullable=False, index=True)  # 1 for True, 0 for False
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    pharmacy = relationship("Pharmacy", back_populates="inventory")

    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_medicine_pharmacy_type', 'pharmacy_id', 'type'),
        Index('idx_medicine_available', 'is_available', 'quantity'),
        Index('idx_medicine_name_type', 'medicine_name', 'type'),
    )


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_pharmacy_id = Column(Integer, ForeignKey("pharmacies.id", ondelete="SET NULL"), nullable=True, index=True)
    image_url = Column(String(500), nullable=True)
    info_json = Column(JSON, nullable=True)
    status = Column(String(50), default="pending", nullable=False, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    owner = relationship("Patient", back_populates="prescriptions")
    assigned_pharmacy = relationship("Pharmacy", back_populates="assigned_prescriptions")

    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_prescription_patient_status', 'patient_id', 'status'),
        Index('idx_prescription_pharmacy', 'assigned_pharmacy_id', 'status'),
        Index('idx_prescription_created', 'created_at'),
    )


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(Integer, default=5, nullable=False)
    comment = Column(String(2000), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    patient = relationship("Patient", back_populates="reviews")
    pharmacy = relationship("Pharmacy", back_populates="reviews")

    # Composite index for pharmacy reviews lookup
    __table_args__ = (
        Index('idx_review_pharmacy_created', 'pharmacy_id', 'created_at'),
        Index('idx_review_patient_pharmacy', 'patient_id', 'pharmacy_id'),
    )


class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id", ondelete="CASCADE"), nullable=False, index=True)
    total_amount = Column(Float, nullable=False)
    status = Column(String(50), default="pending", nullable=False, index=True)  # pending, paid, shipped, delivered, cancelled
    payment_method = Column(String(50), nullable=True, index=True)  # esewa, khalti, cod
    payment_status = Column(String(50), default="unpaid", nullable=False, index=True)  # unpaid, paid, failed, refunded
    transaction_id = Column(String(255), nullable=True, index=True)  # from payment gateway
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="orders")
    pharmacy = relationship("Pharmacy", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", lazy="dynamic", cascade="all, delete-orphan")

    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_order_patient_created', 'patient_id', 'created_at'),
        Index('idx_order_pharmacy_status', 'pharmacy_id', 'status'),
        Index('idx_order_payment_status', 'payment_status', 'status'),
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_id = Column(Integer, ForeignKey("pharmacy_medicines.id", ondelete="SET NULL"), nullable=True, index=True)
    quantity = Column(Integer, nullable=False)
    price_at_time = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="items")
    medicine = relationship("PharmacyMedicine")

    __table_args__ = (
        Index('idx_order_item_order', 'order_id', 'medicine_id'),
    )


class VerificationCode(Base):
    __tablename__ = "verification_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    code = Column(String(10), nullable=False)
    is_verified = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    # Index for cleanup of expired codes
    __table_args__ = (
        Index('idx_verification_email_created', 'email', 'created_at'),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    user_role = Column(String(50), nullable=True, index=True)  # 'patient', 'pharmacy', 'admin'
    action = Column(String(100), nullable=False, index=True)
    details = Column(String(1000), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    # Indexes for audit log queries
    __table_args__ = (
        Index('idx_audit_user_timestamp', 'user_id', 'timestamp'),
        Index('idx_audit_action_timestamp', 'action', 'timestamp'),
    )


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), default="System Admin")
    is_active = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_type = Column(String(20), nullable=False, index=True)  # 'patient' or 'pharmacy'
    message = Column(String(2000), nullable=False)
    is_read = Column(Integer, default=0, nullable=False, index=True)  # 0 = unread, 1 = read
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    patient = relationship("Patient")
    pharmacy = relationship("Pharmacy")

    # Composite indexes for chat queries
    __table_args__ = (
        Index('idx_chat_patient_pharmacy', 'patient_id', 'pharmacy_id'),
        Index('idx_chat_pharmacy_created', 'pharmacy_id', 'created_at'),
        Index('idx_chat_unread', 'pharmacy_id', 'is_read'),
    )
