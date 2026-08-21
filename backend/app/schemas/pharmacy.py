"""Pharmacy schemas."""

from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class MedicineStock(BaseModel):
    medicine_id: UUID
    medicine_name: str
    in_stock: bool
    quantity_available: int
    price: Optional[float] = None
    last_updated: Optional[datetime] = None


class PharmacyResult(BaseModel):
    id: UUID
    name: str
    address: str
    phone: Optional[str] = None
    distance_km: float
    estimated_travel_time: Optional[str] = None
    rating: Optional[float] = None
    is_open: bool = False
    operating_hours: dict = {}
    has_medicine: bool = False
    medicine_stock: Optional[MedicineStock] = None
    location: dict = {}
    directions_url: Optional[str] = None

    model_config = {"from_attributes": True}


class NearbyPharmaciesResponse(BaseModel):
    count: int
    pharmacies: list[PharmacyResult]


class ReservationRequest(BaseModel):
    medicine_id: UUID
    quantity: int = Field(..., ge=1)
    pickup_time: datetime


class ReservationResponse(BaseModel):
    reservation_id: UUID
    status: str
    pharmacy: str
    medicine: str
    quantity: int
    total_price: Optional[float] = None
    pickup_by: datetime
    confirmation_code: str


class InventoryUpdateItem(BaseModel):
    medicine_id: UUID
    quantity: int
    price: Optional[float] = None
    expiry: Optional[str] = None
    status: Optional[str] = None


class InventoryUpdateRequest(BaseModel):
    updates: list[InventoryUpdateItem]


class InventorySummary(BaseModel):
    total_medicines: int
    in_stock: int
    low_stock: int
    out_of_stock: int


class InventoryUpdateResponse(BaseModel):
    updated: int
    inventory_summary: InventorySummary


class PharmacyRegisterRequest(BaseModel):
    name: str
    license_number: str
    address: str
    city: str
    state: str
    pincode: str
    phone: Optional[str] = None
    email: Optional[str] = None
    latitude: float
    longitude: float
    is_open_24hrs: bool = False
    operating_hours: dict = {}
