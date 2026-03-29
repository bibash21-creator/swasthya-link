from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime

class PatientBase(BaseModel):
    full_name: str
    email: EmailStr
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class PatientCreate(PatientBase):
    password: str

class Patient(PatientBase):
    id: int

    class Config:
        from_attributes = True

class PharmacyBase(BaseModel):
    name: str
    address: str
    contact_number: str
    latitude: float
    longitude: float
    place_id: Optional[str] = None
    image_url: Optional[str] = None

class PharmacyCreate(PharmacyBase):
    email: EmailStr
    password: str

class Pharmacy(PharmacyBase):
    id: int

    class Config:
        from_attributes = True

class PrescriptionBase(BaseModel):
    assigned_pharmacy_id: Optional[int] = None
    image_url: Optional[str] = None
    info_json: Optional[Dict] = None
    status: Optional[str] = "pending"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class PrescriptionCreate(PrescriptionBase):
    pass

class Prescription(PrescriptionBase):
    id: int
    patient_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class PharmacyMedicineBase(BaseModel):
    medicine_name: str
    description: Optional[str] = None
    type: Optional[str] = "medicine"
    quantity: int
    price: Optional[float] = None
    image_url: Optional[str] = None
    is_available: Optional[int] = 1

class PharmacyMedicineCreate(PharmacyMedicineBase):
    pass

class PharmacyMedicine(PharmacyMedicineBase):
    id: int
    pharmacy_id: int
    pharmacy_name: Optional[str] = None  # Populated on read for shop display

    class Config:
        from_attributes = True

class PharmacyWithMatch(Pharmacy):
    matched_medicines: List[str]
    total_price_estimate: float
    distance_km: float

class OrderItemBase(BaseModel):
    medicine_id: int
    quantity: int

class OrderItemCreate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    id: int
    order_id: int
    price_at_time: float
    medicine: Optional[PharmacyMedicine] = None

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    pharmacy_id: int
    payment_method: Optional[str] = "cod"

class OrderCreate(OrderBase):
    items: List[OrderItemCreate]

class Order(OrderBase):
    id: int
    patient_id: int
    total_amount: float
    status: str
    payment_status: str
    transaction_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItem] = []

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
class ReviewBase(BaseModel):
    pharmacy_id: int
    rating: int
    comment: str

class ReviewCreate(ReviewBase):
    pass

class Review(ReviewBase):
    id: int
    patient_id: int
    patient_name: Optional[str] = None
    pharmacy_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
