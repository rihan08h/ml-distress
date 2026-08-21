"""Drug interaction check service."""

import uuid
from itertools import combinations

from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interaction import DrugInteraction
from app.models.medicine import Medicine
from app.schemas.safety import (
    InteractionCheckRequest, InteractionCheckResponse,
    InteractionResult, SafeCombination,
)


class InteractionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def check_interactions(self, req: InteractionCheckRequest) -> InteractionCheckResponse:
        """Check all pairwise interactions among provided medicines."""
        medicine_ids = [m.medicine_id for m in req.medicines if m.medicine_id]
        medicine_names = {str(m.medicine_id): m.name for m in req.medicines if m.medicine_id}

        interactions = []
        safe = []

        for id_a, id_b in combinations(medicine_ids, 2):
            result = await self.db.execute(
                select(DrugInteraction).where(
                    or_(
                        and_(
                            DrugInteraction.medicine_a_id == id_a,
                            DrugInteraction.medicine_b_id == id_b,
                        ),
                        and_(
                            DrugInteraction.medicine_a_id == id_b,
                            DrugInteraction.medicine_b_id == id_a,
                        ),
                    )
                )
            )
            interaction = result.scalar_one_or_none()

            name_a = medicine_names.get(str(id_a), str(id_a))
            name_b = medicine_names.get(str(id_b), str(id_b))

            if interaction:
                interactions.append(
                    InteractionResult(
                        medicine_a=name_a,
                        medicine_b=name_b,
                        severity=interaction.severity,
                        description=interaction.description,
                        recommendation=interaction.recommendation,
                        source=interaction.source,
                    )
                )
            else:
                safe.append(
                    SafeCombination(medicine_a=name_a, medicine_b=name_b)
                )

        total_pairs = len(list(combinations(medicine_ids, 2)))

        return InteractionCheckResponse(
            total_checked=total_pairs,
            interactions_found=len(interactions),
            interactions=interactions,
            safe_combinations=safe,
        )

    async def get_medicine_interactions(self, medicine_id: uuid.UUID) -> list[InteractionResult]:
        """Get all known interactions for a specific medicine."""
        result = await self.db.execute(
            select(DrugInteraction).where(
                or_(
                    DrugInteraction.medicine_a_id == medicine_id,
                    DrugInteraction.medicine_b_id == medicine_id,
                )
            )
        )
        interactions = result.scalars().all()

        results = []
        for i in interactions:
            # Get medicine names
            other_id = i.medicine_b_id if i.medicine_a_id == medicine_id else i.medicine_a_id
            med_result = await self.db.execute(select(Medicine).where(Medicine.id == other_id))
            other_med = med_result.scalar_one_or_none()

            results.append(
                InteractionResult(
                    medicine_a="Current medicine",
                    medicine_b=other_med.name if other_med else str(other_id),
                    severity=i.severity,
                    description=i.description,
                    recommendation=i.recommendation,
                    source=i.source,
                )
            )
        return results
