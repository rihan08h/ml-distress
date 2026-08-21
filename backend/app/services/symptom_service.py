"""Symptom analysis orchestrator (Premium)."""

import uuid
import time
from datetime import datetime, timezone

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import MEDICAL_DISCLAIMER
from app.models.symptom_session import SymptomSession
from app.models.prediction import Prediction as PredictionModel
from app.schemas.symptom import (
    SymptomAnalyzeRequest, SymptomAnalyzeResponse,
    ParsedSymptom, DiseasePrediction, RiskAssessment, FirstAidInfo,
)


# Expanded keyword-based symptom parser (47 symptoms aligned with SMH)
SYMPTOM_KEYWORDS = {
    "headache": {"body_area": "head"},
    "fever": {"body_area": "systemic"},
    "cough": {"body_area": "respiratory"},
    "nausea": {"body_area": "gastrointestinal"},
    "vomiting": {"body_area": "gastrointestinal"},
    "diarrhea": {"body_area": "gastrointestinal"},
    "fatigue": {"body_area": "systemic"},
    "chest pain": {"body_area": "chest"},
    "back pain": {"body_area": "back"},
    "sore throat": {"body_area": "throat"},
    "runny nose": {"body_area": "nasal"},
    "dizziness": {"body_area": "neurological"},
    "rash": {"body_area": "skin"},
    "joint pain": {"body_area": "musculoskeletal"},
    "stomach pain": {"body_area": "gastrointestinal"},
    "shortness of breath": {"body_area": "respiratory"},
    "body aches": {"body_area": "musculoskeletal"},
    "chills": {"body_area": "systemic"},
    "sneezing": {"body_area": "nasal"},
    "congestion": {"body_area": "nasal"},
    "wheezing": {"body_area": "respiratory"},
    "muscle pain": {"body_area": "musculoskeletal"},
    "loss of appetite": {"body_area": "gastrointestinal"},
    "weight loss": {"body_area": "systemic"},
    "night sweats": {"body_area": "systemic"},
    "blurred vision": {"body_area": "ophthalmological"},
    "ear pain": {"body_area": "ENT"},
    "neck pain": {"body_area": "musculoskeletal"},
    "abdominal pain": {"body_area": "gastrointestinal"},
    "bloating": {"body_area": "gastrointestinal"},
    "constipation": {"body_area": "gastrointestinal"},
    "heartburn": {"body_area": "gastrointestinal"},
    "swelling": {"body_area": "musculoskeletal"},
    "numbness": {"body_area": "neurological"},
    "tingling": {"body_area": "neurological"},
    "anxiety": {"body_area": "psychiatric"},
    "insomnia": {"body_area": "psychiatric"},
    "palpitations": {"body_area": "cardiac"},
    "frequent urination": {"body_area": "urological"},
    "burning urination": {"body_area": "urological"},
    "itching": {"body_area": "skin"},
    "dry mouth": {"body_area": "oral"},
    "excessive thirst": {"body_area": "systemic"},
    "bruising": {"body_area": "hematological"},
    "bloody stool": {"body_area": "gastrointestinal"},
    "difficulty swallowing": {"body_area": "throat"},
    "loss of smell": {"body_area": "nasal"},
}

SEVERITY_WORDS = {
    "severe": "severe", "terrible": "severe", "extreme": "severe", "intense": "severe",
    "mild": "mild", "slight": "mild", "minor": "mild",
    "moderate": "moderate",
}

EMERGENCY_SYMPTOMS = {
    "chest pain", "difficulty breathing", "severe bleeding",
    "loss of consciousness", "seizure", "shortness of breath",
}

# Full disease-symptom mapping (10 combinations aligned with Smart-Medicine-Hub)
SYMPTOM_DISEASE_MAP: list[dict] = [
    {
        "symptoms": {"fever", "cough", "sore throat"},
        "predictions": [
            {"disease": "Common Cold", "confidence": 0.85, "icd": "J00",
             "desc": "Viral upper respiratory tract infection", "specialist": "General Physician"},
            {"disease": "Influenza", "confidence": 0.70, "icd": "J11.1",
             "desc": "Influenza virus infection with respiratory symptoms", "specialist": "General Physician"},
        ],
    },
    {
        "symptoms": {"fever", "headache", "body aches"},
        "predictions": [
            {"disease": "Influenza", "confidence": 0.80, "icd": "J11.1",
             "desc": "Influenza virus infection with systemic symptoms", "specialist": "General Physician"},
            {"disease": "Dengue Fever", "confidence": 0.55, "icd": "A90",
             "desc": "Mosquito-borne viral infection common in tropical regions", "specialist": "Infectious Disease Specialist"},
        ],
    },
    {
        "symptoms": {"chest pain", "shortness of breath"},
        "predictions": [
            {"disease": "Cardiac Event", "confidence": 0.65, "icd": "I20.9",
             "desc": "Possible angina or myocardial stress — EMERGENCY", "specialist": "Cardiologist"},
            {"disease": "Panic Attack", "confidence": 0.40, "icd": "F41.0",
             "desc": "Anxiety-related chest tightness and dyspnea", "specialist": "Psychiatrist"},
        ],
    },
    {
        "symptoms": {"nausea", "vomiting", "diarrhea"},
        "predictions": [
            {"disease": "Gastroenteritis", "confidence": 0.85, "icd": "K52.9",
             "desc": "Inflammation of the stomach and intestines, often viral", "specialist": "Gastroenterologist"},
            {"disease": "Food Poisoning", "confidence": 0.70, "icd": "A05.9",
             "desc": "Toxin-mediated foodborne illness", "specialist": "General Physician"},
        ],
    },
    {
        "symptoms": {"headache", "nausea", "blurred vision"},
        "predictions": [
            {"disease": "Migraine", "confidence": 0.80, "icd": "G43.9",
             "desc": "Neurological condition with severe headache and visual aura", "specialist": "Neurologist"},
            {"disease": "Hypertensive Crisis", "confidence": 0.45, "icd": "I16.9",
             "desc": "Dangerously elevated blood pressure", "specialist": "Cardiologist"},
        ],
    },
    {
        "symptoms": {"joint pain", "swelling", "fatigue"},
        "predictions": [
            {"disease": "Rheumatoid Arthritis", "confidence": 0.65, "icd": "M06.9",
             "desc": "Autoimmune inflammatory joint disease", "specialist": "Rheumatologist"},
            {"disease": "Viral Arthralgia", "confidence": 0.55, "icd": "M13.8",
             "desc": "Joint pain associated with viral infection", "specialist": "General Physician"},
        ],
    },
    {
        "symptoms": {"fever", "rash", "joint pain"},
        "predictions": [
            {"disease": "Dengue Fever", "confidence": 0.75, "icd": "A90",
             "desc": "Viral infection with characteristic rash and arthralgia", "specialist": "Infectious Disease Specialist"},
            {"disease": "Chikungunya", "confidence": 0.60, "icd": "A92.0",
             "desc": "Mosquito-borne alphavirus causing fever and polyarthralgia", "specialist": "Infectious Disease Specialist"},
        ],
    },
    {
        "symptoms": {"frequent urination", "excessive thirst", "fatigue"},
        "predictions": [
            {"disease": "Diabetes Mellitus", "confidence": 0.80, "icd": "E11.9",
             "desc": "Metabolic disorder with impaired glucose regulation", "specialist": "Endocrinologist"},
        ],
    },
    {
        "symptoms": {"burning urination", "frequent urination", "abdominal pain"},
        "predictions": [
            {"disease": "Urinary Tract Infection", "confidence": 0.85, "icd": "N39.0",
             "desc": "Bacterial infection of the urinary tract", "specialist": "Urologist"},
        ],
    },
    {
        "symptoms": {"cough", "fever", "shortness of breath"},
        "predictions": [
            {"disease": "Pneumonia", "confidence": 0.75, "icd": "J18.9",
             "desc": "Lung infection causing inflammation of air sacs", "specialist": "Pulmonologist"},
            {"disease": "COVID-19", "confidence": 0.60, "icd": "U07.1",
             "desc": "SARS-CoV-2 respiratory infection", "specialist": "General Physician"},
        ],
    },
]


class SymptomService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _parse_symptoms(self, text: str) -> list[ParsedSymptom]:
        """Simple keyword-based symptom extraction for MVP."""
        text_lower = text.lower()
        symptoms = []

        for keyword, info in SYMPTOM_KEYWORDS.items():
            if keyword in text_lower:
                severity = "moderate"
                for word, sev in SEVERITY_WORDS.items():
                    if word in text_lower:
                        severity = sev
                        break

                symptoms.append(
                    ParsedSymptom(
                        name=keyword,
                        severity=severity,
                        body_area=info["body_area"],
                    )
                )

        return symptoms or [ParsedSymptom(name="unspecified", severity="moderate")]

    def _classify_risk(self, symptoms: list[ParsedSymptom]) -> RiskAssessment:
        """Rule-based risk classification."""
        symptom_names = {s.name for s in symptoms}

        # Emergency check
        if symptom_names & EMERGENCY_SYMPTOMS:
            return RiskAssessment(
                level="emergency",
                color="red",
                recommendation="Seek immediate medical attention. Call emergency services.",
                emergency_signs=list(symptom_names & EMERGENCY_SYMPTOMS),
            )

        # High risk
        severe_symptoms = [s for s in symptoms if s.severity == "severe"]
        if len(severe_symptoms) >= 2:
            return RiskAssessment(
                level="high",
                color="orange",
                recommendation="See a doctor within 24 hours.",
                emergency_signs=["Symptoms worsening rapidly", "New severe symptoms"],
            )

        # Medium risk
        if any(s.severity in ("severe", "moderate") for s in symptoms):
            return RiskAssessment(
                level="medium",
                color="yellow",
                recommendation="See a doctor within 24-48 hours if symptoms persist.",
                emergency_signs=["Fever above 103°F", "Sudden worsening"],
            )

        return RiskAssessment(
            level="low",
            color="green",
            recommendation="Monitor symptoms. Visit a doctor if they persist beyond 3 days.",
        )

    def _mock_predictions(self, symptoms: list[ParsedSymptom]) -> list[DiseasePrediction]:
        """Disease predictions using SYMPTOM_DISEASE_MAP. Replace with ML model in prod."""
        symptom_names = {s.name for s in symptoms}

        # Find best matching entry from the disease map (allow single-symptom partial matches)
        best_match = None
        best_overlap = 0

        for entry in SYMPTOM_DISEASE_MAP:
            overlap = len(symptom_names & entry["symptoms"])
            if overlap >= 1 and overlap > best_overlap:
                best_overlap = overlap
                best_match = entry

        if best_match:
            # Scale confidence down for partial matches (single symptom)
            scale = 1.0 if best_overlap >= 2 else 0.7
            return [
                DiseasePrediction(
                    disease=p["disease"],
                    confidence=round(p["confidence"] * scale, 2),
                    icd_code=p.get("icd"),
                    description=p["desc"],
                    specialist=p.get("specialist"),
                )
                for p in best_match["predictions"]
            ]

        # Fallback: general recommendation
        return [
            DiseasePrediction(
                disease="General Consultation Recommended",
                confidence=0.50,
                description="Unable to narrow down. Please see a doctor.",
                specialist="General Physician",
            )
        ]

    async def analyze(
        self,
        user_id: uuid.UUID,
        req: SymptomAnalyzeRequest,
        user_tier: str = "premium",
    ) -> SymptomAnalyzeResponse:
        start = time.time()

        # Parse symptoms
        parsed = self._parse_symptoms(req.symptoms_text)

        # Risk assessment
        risk = self._classify_risk(parsed)

        # Disease prediction (mock for MVP)
        predictions = self._mock_predictions(parsed)

        # First aid
        first_aid = FirstAidInfo(
            immediate_actions=["Rest", "Stay hydrated", "Monitor temperature"],
            avoid=["Strenuous activity", "Self-medication without doctor advice"],
            seek_emergency_if=risk.emergency_signs,
        )

        processing_ms = int((time.time() - start) * 1000)
        request_id = f"req_{uuid.uuid4().hex[:12]}"

        # Save session
        session = SymptomSession(
            user_id=user_id,
            request_id=request_id,
            input_text=req.symptoms_text,
            input_type=req.input_type,
            parsed_symptoms=[s.model_dump() for s in parsed],
            risk_level=risk.level,
            risk_recommendation=risk.recommendation,
            model_version="mvp-keyword-v1",
            processing_time_ms=processing_ms,
            user_age=req.user_profile.age if req.user_profile else None,
            user_gender=req.user_profile.gender if req.user_profile else None,
        )
        self.db.add(session)
        await self.db.flush()

        # Save predictions
        for i, pred in enumerate(predictions):
            db_pred = PredictionModel(
                session_id=session.id,
                disease_name=pred.disease,
                icd_code=pred.icd_code,
                confidence=pred.confidence,
                rank=i + 1,
                description=pred.description,
                specialist_type=pred.specialist,
            )
            self.db.add(db_pred)
        await self.db.flush()

        return SymptomAnalyzeResponse(
            request_id=request_id,
            subscription_tier=user_tier,
            parsed_symptoms=parsed,
            predictions=predictions,
            risk_assessment=risk,
            first_aid=first_aid,
            disclaimer=MEDICAL_DISCLAIMER,
        )

    async def get_symptom_history(self, user_id: uuid.UUID, limit: int = 20) -> list[dict]:
        """Return user's past symptom sessions."""
        result = await self.db.execute(
            select(SymptomSession)
            .where(SymptomSession.user_id == user_id)
            .order_by(desc(SymptomSession.created_at))
            .limit(limit)
        )
        rows = result.scalars().all()
        return [
            {
                "id": str(r.id),
                "request_id": r.request_id,
                "input_text": r.input_text,
                "risk_level": r.risk_level,
                "risk_recommendation": r.risk_recommendation,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
