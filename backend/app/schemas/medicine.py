"""Medicine schemas."""

from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


class CompositionItem(BaseModel):
    ingredient: str
    strength: str


class PriceInfo(BaseModel):
    mrp: Optional[float] = None
    currency: str = "INR"
    pack_size: Optional[str] = None


class MedicineSearchResult(BaseModel):
    id: UUID
    name: str
    generic_name: Optional[str] = None
    brand: Optional[str] = None
    manufacturer: Optional[str] = None
    composition: list[CompositionItem] = []
    dosage_form: Optional[str] = None
    price: PriceInfo
    prescription_required: bool = False
    category: Optional[str] = None

    model_config = {"from_attributes": True}


class MedicineSearchResponse(BaseModel):
    total: int
    page: int
    medicines: list[MedicineSearchResult]


class DosageInstructions(BaseModel):
    adults: Optional[str] = None
    children: Optional[str] = None
    with_food: Optional[str] = None


class SideEffects(BaseModel):
    common: list[str] = []
    rare: list[str] = []
    seek_help_if: list[str] = []


class GenericAlternative(BaseModel):
    id: UUID
    name: str
    manufacturer: Optional[str] = None
    price: PriceInfo
    savings_percent: Optional[float] = None


class MedicineDetailResponse(BaseModel):
    id: UUID
    name: str
    generic_name: Optional[str] = None
    brand: Optional[str] = None
    manufacturer: Optional[str] = None
    composition: list[CompositionItem] = []
    dosage_form: Optional[str] = None
    dosage_instructions: Optional[DosageInstructions] = None
    side_effects: Optional[SideEffects] = None
    contraindications: list[str] = []
    storage: Optional[str] = None
    price: PriceInfo
    prescription_required: bool = False
    generic_alternatives: list[GenericAlternative] = []

    model_config = {"from_attributes": True}


class GenericAlternativesResponse(BaseModel):
    brand_medicine: dict
    alternatives: list[GenericAlternative]
