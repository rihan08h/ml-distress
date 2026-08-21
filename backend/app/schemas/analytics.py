"""Analytics schemas."""

from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class DemandPrediction(BaseModel):
    medicine_id: UUID
    medicine_name: str
    current_stock: int
    predicted_demand_30d: int
    restock_recommended: bool = False
    restock_quantity: int = 0
    confidence: float = 0.0
    factors: list[str] = []


class SeasonalAlert(BaseModel):
    alert: str
    affected_medicines: list[str] = []
    expected_demand_increase: Optional[str] = None
    recommended_action: Optional[str] = None


class DemandAnalyticsResponse(BaseModel):
    pharmacy_id: UUID
    period: str
    predictions: list[DemandPrediction] = []
    seasonal_alerts: list[SeasonalAlert] = []
