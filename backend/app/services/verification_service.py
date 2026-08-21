"""Medicine authenticity verification service."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.verification import MedicineVerification
from app.schemas.safety import (
    VerifyRequest, VerifyResponse, MedicineInfo, VerificationInfo,
)


class VerificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def verify_medicine(self, user_id: uuid.UUID, req: VerifyRequest) -> VerifyResponse:
        """Verify medicine authenticity via barcode/QR code.

        Checks against ALL known codes — both authentic AND known counterfeits.
        """
        # Look up code in the seed/reference table (no user_id filter — seed rows have user_id=None)
        result = await self.db.execute(
            select(MedicineVerification).where(
                MedicineVerification.code == req.code,
                MedicineVerification.user_id.is_(None),
            )
        )
        known = result.scalar_one_or_none()

        if known and known.is_authentic:
            # ---- Authentic medicine ----
            record = MedicineVerification(
                user_id=user_id,
                code=req.code,
                code_type=req.code_type,
                is_authentic=True,
                medicine_name=known.medicine_name,
                manufacturer=known.manufacturer,
                batch_number=known.batch_number,
                manufacturing_date=known.manufacturing_date,
                expiry_date=known.expiry_date,
                verification_source="manufacturer_db",
                scan_image_url=req.image_url,
            )
            self.db.add(record)
            await self.db.flush()

            return VerifyResponse(
                status="verified",
                medicine=MedicineInfo(
                    name=known.medicine_name,
                    manufacturer=known.manufacturer,
                    batch_number=known.batch_number,
                    manufacturing_date=str(known.manufacturing_date) if known.manufacturing_date else None,
                    expiry_date=str(known.expiry_date) if known.expiry_date else None,
                ),
                verification=VerificationInfo(
                    is_authentic=True,
                    verified_with="manufacturer_db",
                    confidence="high",
                    verified_at=datetime.now(timezone.utc).isoformat(),
                ),
            )

        if known and not known.is_authentic:
            # ---- Known counterfeit ----
            record = MedicineVerification(
                user_id=user_id,
                code=req.code,
                code_type=req.code_type,
                is_authentic=False,
                medicine_name=known.medicine_name,
                manufacturer=known.manufacturer,
                batch_number=known.batch_number,
                verification_source="counterfeit_db",
                scan_image_url=req.image_url,
            )
            self.db.add(record)
            await self.db.flush()

            return VerifyResponse(
                status="counterfeit",
                medicine=MedicineInfo(
                    name=known.medicine_name,
                    manufacturer=known.manufacturer,
                    batch_number=known.batch_number,
                ),
                verification=VerificationInfo(
                    is_authentic=False,
                    verified_with="counterfeit_db",
                    confidence="high",
                    verified_at=datetime.now(timezone.utc).isoformat(),
                    reason="This code is registered in counterfeit medicine database.",
                    action_required="Do NOT consume. Report to CDSCO immediately.",
                    report_url="https://cdsco.gov.in/report",
                ),
            )

        # ---- Unknown code — not in any database ----
        record = MedicineVerification(
            user_id=user_id,
            code=req.code,
            code_type=req.code_type,
            is_authentic=False,
            verification_source="local_db",
            scan_image_url=req.image_url,
        )
        self.db.add(record)
        await self.db.flush()

        return VerifyResponse(
            status="warning",
            verification=VerificationInfo(
                is_authentic=False,
                reason="Code not found in any verified medicine database.",
                confidence="medium",
                action_required="Exercise caution. Verify with pharmacist or manufacturer.",
                report_url="https://cdsco.gov.in/report",
            ),
        )

    async def get_verification_history(self, user_id: uuid.UUID, limit: int = 20) -> list[dict]:
        """Return user's past verification scans."""
        result = await self.db.execute(
            select(MedicineVerification)
            .where(MedicineVerification.user_id == user_id)
            .order_by(desc(MedicineVerification.created_at))
            .limit(limit)
        )
        rows = result.scalars().all()
        return [
            {
                "id": str(r.id),
                "code": r.code,
                "code_type": r.code_type,
                "is_authentic": r.is_authentic,
                "medicine_name": r.medicine_name,
                "manufacturer": r.manufacturer,
                "verified_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
