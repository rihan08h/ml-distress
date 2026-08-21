"""Auth & user schemas."""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


# === Registration ===
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None


class RegisterResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    subscription_tier: str = "free"
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# === Login ===
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserBrief(BaseModel):
    id: UUID
    email: str
    subscription_tier: str
    full_name: str

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserBrief


# === Token ===
class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# === Profile ===
class MedicalHistory(BaseModel):
    known_conditions: list[str] = []
    current_medications: list[str] = []
    allergies: list[str] = []


class LocationData(BaseModel):
    latitude: float
    longitude: float


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    medical_history: Optional[MedicalHistory] = None
    location: Optional[LocationData] = None


class UserProfileResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: Optional[str]
    role: str
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}
