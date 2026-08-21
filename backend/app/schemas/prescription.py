"""Prescription schemas."""

from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class DetectedMedicine(BaseModel):
    extracted_name: str
    matched_medicine_id: Optional[UUID] = None
    matched_name: Optional[str] = None
    dosage: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None
    match_confidence: Optional[float] = None


class DrugInteractionWarning(BaseModel):
    found: bool = False
    warnings: list[dict] = []


class PrescriptionActions(BaseModel):
    set_reminders_url: Optional[str] = None
    find_pharmacies_url: Optional[str] = None


class PrescriptionScanResponse(BaseModel):
    prescription_id: UUID
    raw_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    detected_medicines: list[DetectedMedicine] = []
    drug_interactions: DrugInteractionWarning = DrugInteractionWarning()
    actions: PrescriptionActions = PrescriptionActions()


class PrescriptionListItem(BaseModel):
    id: UUID
    status: str
    ocr_confidence: Optional[float] = None
    detected_medicines_count: int = 0
    created_at: str

    model_config = {"from_attributes": True}
