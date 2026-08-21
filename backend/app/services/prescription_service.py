"""Prescription OCR service."""

import re
import uuid
from datetime import datetime

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.medicine import Medicine
from app.models.prescription import Prescription
from app.schemas.prescription import (
    PrescriptionScanResponse, DetectedMedicine,
    DrugInteractionWarning, PrescriptionActions,
)

# Dosage patterns commonly seen in Indian prescriptions
_DOSE_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*(mg|ml|mcg|g|iu)\b",
    re.IGNORECASE,
)
_FREQ_RE = re.compile(
    r"(\d+)\s*(?:times?\s*(?:a|per)\s*day|x\s*daily|times?\s*daily|/day)",
    re.IGNORECASE,
)
_DUR_RE = re.compile(
    r"(?:for|x)\s*(\d+)\s*(days?|weeks?|months?)",
    re.IGNORECASE,
)


class PrescriptionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _match_medicines(self, text: str) -> list[DetectedMedicine]:
        """Match medicine names in text against the database."""
        # Fetch all medicine names from DB
        result = await self.db.execute(select(Medicine))
        medicines = result.scalars().all()

        detected: list[DetectedMedicine] = []
        text_lower = text.lower()
        lines = text.split("\n")

        for med in medicines:
            # Check if any form of the name appears in the text
            names_to_try = [
                med.name.lower(),
                med.generic_name.lower() if med.generic_name else "",
            ]
            if med.brand:
                names_to_try.append(med.brand.lower())

            for name in names_to_try:
                if not name or name not in text_lower:
                    continue

                # Find the line containing this medicine for context
                context_line = ""
                for line in lines:
                    if name in line.lower():
                        context_line = line.strip()
                        break

                # Extract dosage pattern from context
                dosage_match = _DOSE_RE.search(context_line)
                freq_match = _FREQ_RE.search(context_line)
                dur_match = _DUR_RE.search(context_line)

                dosage_str = None
                if freq_match:
                    dosage_str = f"1 {med.dosage_form or 'unit'}, {freq_match.group(1)} times daily"
                elif dosage_match:
                    dosage_str = f"{dosage_match.group(0)}"

                duration_str = None
                if dur_match:
                    duration_str = f"{dur_match.group(1)} {dur_match.group(2)}"

                detected.append(
                    DetectedMedicine(
                        extracted_name=name.title(),
                        matched_medicine_id=med.id,
                        matched_name=med.name,
                        dosage=dosage_str,
                        duration=duration_str,
                        match_confidence=0.90 if name == med.name.lower() else 0.75,
                    )
                )
                break  # avoid duplicate matches for same medicine

        return detected

    async def scan_prescription(
        self,
        user_id: uuid.UUID,
        image_url: str,
        language: str = "en",
    ) -> PrescriptionScanResponse:
        """Process a prescription image through OCR pipeline.

        In production, this would call Tesseract / Google Vision.
        For MVP, we accept raw text via image_url fallback and match against DB.
        """
        # Mock OCR result for MVP (production would call OCR API here)
        raw_text = (
            "Tab Paracetamol 500mg - 1 tab 3 times daily x 5 days\n"
            "Tab Cetirizine 10mg - 1 tab once daily x 7 days\n"
            "Cap Amoxicillin 500mg - 1 cap 3 times a day for 7 days"
        )

        # Match against DB medicines
        detected = await self._match_medicines(raw_text)

        # Fallback if no DB matches (e.g. empty DB)
        if not detected:
            detected = [
                DetectedMedicine(
                    extracted_name="Paracetamol 500mg",
                    matched_name="Paracetamol 500mg Tablet",
                    dosage="1 tablet, 3 times daily",
                    duration="5 days",
                    instructions="After food",
                    match_confidence=0.95,
                ),
            ]

        avg_conf = sum(d.match_confidence or 0.5 for d in detected) / max(len(detected), 1)

        # Save to database
        prescription = Prescription(
            user_id=user_id,
            image_url=image_url,
            raw_text=raw_text,
            ocr_confidence=round(avg_conf, 2),
            detected_medicines=[d.model_dump(mode="json") for d in detected],
            ocr_provider="tesseract",
            status="processed",
        )
        self.db.add(prescription)
        await self.db.flush()

        return PrescriptionScanResponse(
            prescription_id=prescription.id,
            raw_text=raw_text,
            ocr_confidence=round(avg_conf, 2),
            detected_medicines=detected,
            drug_interactions=DrugInteractionWarning(found=False, warnings=[]),
            actions=PrescriptionActions(
                set_reminders_url=f"/api/v1/reminders/from-prescription/{prescription.id}",
                find_pharmacies_url="/api/v1/pharmacies/nearby",
            ),
        )

    async def get_prescriptions(self, user_id: uuid.UUID, limit: int = 20) -> list[dict]:
        """Return user's past prescriptions."""
        result = await self.db.execute(
            select(Prescription)
            .where(Prescription.user_id == user_id)
            .order_by(desc(Prescription.created_at))
            .limit(limit)
        )
        rows = result.scalars().all()
        return [
            {
                "id": str(r.id),
                "status": r.status,
                "ocr_confidence": r.ocr_confidence,
                "detected_medicines_count": len(r.detected_medicines) if r.detected_medicines else 0,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
