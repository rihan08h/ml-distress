"""Drug safety & verification schemas."""

from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class MedicineInput(BaseModel):
    medicine_id: Optional[UUID] = None
    name: str


class InteractionCheckRequest(BaseModel):
    medicines: list[MedicineInput]
    include_current_medications: bool = True


class InteractionResult(BaseModel):
    medicine_a: str
    medicine_b: str
    severity: str
    description: str
    recommendation: str
    source: Optional[str] = None


class SafeCombination(BaseModel):
    medicine_a: str
    medicine_b: str
    status: str = "safe"
    note: str = "No known interactions"


class InteractionCheckResponse(BaseModel):
    total_checked: int
    interactions_found: int
    interactions: list[InteractionResult]
    safe_combinations: list[SafeCombination] = []
    disclaimer: str = "This check covers major known interactions. Always consult a healthcare professional."


class VerifyRequest(BaseModel):
    code: str
    code_type: str  # barcode, qr_code
    image_url: Optional[str] = None


class MedicineInfo(BaseModel):
    name: Optional[str] = None
    manufacturer: Optional[str] = None
    batch_number: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    pack_size: Optional[str] = None


class VerificationInfo(BaseModel):
    is_authentic: bool
    verified_with: Optional[str] = None
    confidence: str = "high"
    verified_at: Optional[str] = None
    reason: Optional[str] = None
    action_required: Optional[str] = None
    report_url: Optional[str] = None


class VerifyResponse(BaseModel):
    status: str
    medicine: Optional[MedicineInfo] = None
    verification: VerificationInfo
