"""Medicine search and detail service."""

import uuid
from typing import Optional

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.medicine import Medicine, GenericMapping
from app.schemas.medicine import (
    MedicineSearchResult, MedicineSearchResponse,
    MedicineDetailResponse, GenericAlternativesResponse,
    PriceInfo, CompositionItem, GenericAlternative,
    DosageInstructions, SideEffects,
)


class MedicineService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(
        self,
        q: str,
        type_filter: str = "all",
        dosage_form: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> MedicineSearchResponse:
        """Full-text medicine search with filters."""
        query = select(Medicine).where(Medicine.is_active == True)

        # Text search across name, generic_name, brand, manufacturer
        search_term = f"%{q}%"
        query = query.where(
            or_(
                Medicine.name.ilike(search_term),
                Medicine.generic_name.ilike(search_term),
                Medicine.brand.ilike(search_term),
                Medicine.manufacturer.ilike(search_term),
            )
        )

        # Type filter
        if type_filter == "generic":
            query = query.where(Medicine.brand.is_(None) | (Medicine.brand == Medicine.generic_name))
        elif type_filter == "brand":
            query = query.where(Medicine.brand.isnot(None))

        # Dosage form filter
        if dosage_form:
            query = query.where(Medicine.dosage_form == dosage_form)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit).order_by(Medicine.name)
        result = await self.db.execute(query)
        medicines = result.scalars().all()

        return MedicineSearchResponse(
            total=total,
            page=page,
            medicines=[
                MedicineSearchResult(
                    id=m.id,
                    name=m.name,
                    generic_name=m.generic_name,
                    brand=m.brand,
                    manufacturer=m.manufacturer,
                    composition=m.composition if isinstance(m.composition, list) else [],
                    dosage_form=m.dosage_form,
                    price=PriceInfo(mrp=float(m.price_mrp) if m.price_mrp else None, pack_size=m.pack_size),
                    prescription_required=m.prescription_required,
                    category=m.category,
                )
                for m in medicines
            ],
        )

    async def get_detail(self, medicine_id: uuid.UUID) -> MedicineDetailResponse:
        result = await self.db.execute(select(Medicine).where(Medicine.id == medicine_id))
        med = result.scalar_one_or_none()
        if not med:
            raise NotFoundError("Medicine")

        # Get generic alternatives
        alt_result = await self.db.execute(
            select(GenericMapping, Medicine)
            .join(Medicine, GenericMapping.generic_medicine_id == Medicine.id)
            .where(GenericMapping.brand_medicine_id == medicine_id)
        )
        alternatives = []
        for mapping, alt_med in alt_result.all():
            alternatives.append(
                GenericAlternative(
                    id=alt_med.id,
                    name=alt_med.name,
                    manufacturer=alt_med.manufacturer,
                    price=PriceInfo(mrp=float(alt_med.price_mrp) if alt_med.price_mrp else None, pack_size=alt_med.pack_size),
                    savings_percent=float(mapping.price_savings_percent) if mapping.price_savings_percent else None,
                )
            )

        return MedicineDetailResponse(
            id=med.id,
            name=med.name,
            generic_name=med.generic_name,
            brand=med.brand,
            manufacturer=med.manufacturer,
            composition=med.composition if isinstance(med.composition, list) else [],
            dosage_form=med.dosage_form,
            dosage_instructions=med.dosage_instructions,
            side_effects=med.side_effects,
            contraindications=med.contraindications if isinstance(med.contraindications, list) else [],
            storage=med.storage_info,
            price=PriceInfo(mrp=float(med.price_mrp) if med.price_mrp else None, pack_size=med.pack_size),
            prescription_required=med.prescription_required,
            generic_alternatives=alternatives,
        )

    async def get_generics(self, medicine_id: uuid.UUID) -> GenericAlternativesResponse:
        result = await self.db.execute(select(Medicine).where(Medicine.id == medicine_id))
        med = result.scalar_one_or_none()
        if not med:
            raise NotFoundError("Medicine")

        alt_result = await self.db.execute(
            select(GenericMapping, Medicine)
            .join(Medicine, GenericMapping.generic_medicine_id == Medicine.id)
            .where(GenericMapping.brand_medicine_id == medicine_id)
        )
        alternatives = []
        for mapping, alt_med in alt_result.all():
            alternatives.append(
                GenericAlternative(
                    id=alt_med.id,
                    name=alt_med.name,
                    manufacturer=alt_med.manufacturer,
                    price=PriceInfo(mrp=float(alt_med.price_mrp) if alt_med.price_mrp else None, pack_size=alt_med.pack_size),
                    savings_percent=float(mapping.price_savings_percent) if mapping.price_savings_percent else None,
                )
            )

        return GenericAlternativesResponse(
            brand_medicine={"id": str(med.id), "name": med.name, "price": float(med.price_mrp) if med.price_mrp else None},
            alternatives=alternatives,
        )
