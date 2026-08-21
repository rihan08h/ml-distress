"""Hospital schemas."""

from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class HospitalResult(BaseModel):
    id: Optional[UUID] = None
    name: str
    type: str = "hospital"
    address: Optional[str] = None
    phone: Optional[str] = None
    distance_km: Optional[float] = None
    rating: Optional[float] = None
    has_emergency: bool = False
    specialties: list[str] = []
    directions_url: Optional[str] = None


class NearbyHospitalsResponse(BaseModel):
    count: int
    hospitals: list[HospitalResult]
    condition: Optional[str] = None
