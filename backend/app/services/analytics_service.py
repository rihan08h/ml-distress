"""Analytics / demand prediction service (B2B)."""

import uuid
from datetime import date, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.demand_tracking import DemandTracking
from app.models.pharmacy import PharmacyInventory
from app.models.medicine import Medicine
from app.schemas.analytics import (
    DemandAnalyticsResponse, DemandPrediction, SeasonalAlert,
)


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_demand_predictions(self, pharmacy_id: uuid.UUID) -> DemandAnalyticsResponse:
        """
        Get demand predictions for a pharmacy.
        In production, this would use Prophet/XGBoost models.
        For MVP, uses simple moving average.
        """
        today = date.today()
        start_date = today - timedelta(days=30)

        # Get inventory with recent demand data
        inv_result = await self.db.execute(
            select(PharmacyInventory, Medicine)
            .join(Medicine, PharmacyInventory.medicine_id == Medicine.id)
            .where(PharmacyInventory.pharmacy_id == pharmacy_id)
        )

        predictions = []
        for inv, med in inv_result.all():
            # Get average daily demand
            demand_result = await self.db.execute(
                select(func.avg(DemandTracking.units_sold))
                .where(
                    DemandTracking.pharmacy_id == pharmacy_id,
                    DemandTracking.medicine_id == inv.medicine_id,
                    DemandTracking.date >= start_date,
                )
            )
            avg_daily = demand_result.scalar() or 0

            predicted_30d = int(avg_daily * 30)
            restock_needed = predicted_30d > inv.quantity

            predictions.append(
                DemandPrediction(
                    medicine_id=inv.medicine_id,
                    medicine_name=med.name,
                    current_stock=inv.quantity,
                    predicted_demand_30d=predicted_30d,
                    restock_recommended=restock_needed,
                    restock_quantity=max(0, predicted_30d - inv.quantity),
                    confidence=0.75,
                    factors=["historical_trend"],
                )
            )

        return DemandAnalyticsResponse(
            pharmacy_id=pharmacy_id,
            period=f"{today} to {today + timedelta(days=30)}",
            predictions=predictions,
            seasonal_alerts=[],
        )
