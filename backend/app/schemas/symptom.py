"""Symptom checker schemas (Premium)."""

from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class UserProfile(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    known_conditions: list[str] = []
    current_medications: list[str] = []


class SymptomAnalyzeRequest(BaseModel):
    symptoms_text: str
    input_type: str = "text"
    user_profile: Optional[UserProfile] = None


class ParsedSymptom(BaseModel):
    name: str
    severity: Optional[str] = None
    duration: Optional[str] = None
    body_area: Optional[str] = None


class DiseasePrediction(BaseModel):
    disease: str
    confidence: float
    icd_code: Optional[str] = None
    description: Optional[str] = None
    specialist: Optional[str] = None


class RiskAssessment(BaseModel):
    level: str
    color: str
    recommendation: str
    emergency_signs: list[str] = []


class FirstAidInfo(BaseModel):
    immediate_actions: list[str] = []
    avoid: list[str] = []
    seek_emergency_if: list[str] = []


class SymptomAnalyzeResponse(BaseModel):
    request_id: str
    subscription_tier: str
    parsed_symptoms: list[ParsedSymptom]
    predictions: list[DiseasePrediction]
    risk_assessment: RiskAssessment
    first_aid: Optional[FirstAidInfo] = None
    disclaimer: str = "This is NOT a medical diagnosis. Consult a healthcare professional."
