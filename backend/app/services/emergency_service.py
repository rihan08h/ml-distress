"""Emergency medicine finder service."""

import uuid
import math
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pharmacy import Pharmacy, PharmacyInventory
from app.models.medicine import Medicine


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


class EmergencyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_emergency_medicine(
        self,
        medicine_id: uuid.UUID,
        lat: float,
        lng: float,
        expand_radius: bool = True,
    ) -> dict:
        """Find medicine in expanding radius for emergency situations."""
        # Get medicine details
        med_result = await self.db.execute(select(Medicine).where(Medicine.id == medicine_id))
        medicine = med_result.scalar_one_or_none()
        medicine_name = medicine.name if medicine else "Unknown"

        found_at = []
        search_radii = [5, 10, 25, 50] if expand_radius else [5]

        for radius in search_radii:
            lat_range = radius / 111.0
            lng_range = radius / (111.0 * max(math.cos(math.radians(lat)), 0.001))

            result = await self.db.execute(
                select(Pharmacy, PharmacyInventory)
                .join(PharmacyInventory, PharmacyInventory.pharmacy_id == Pharmacy.id)
                .where(
                    and_(
                        PharmacyInventory.medicine_id == medicine_id,
                        PharmacyInventory.quantity > 0,
                        Pharmacy.is_active == True,
                        Pharmacy.latitude.between(lat - lat_range, lat + lat_range),
                        Pharmacy.longitude.between(lng - lng_range, lng + lng_range),
                    )
                )
            )

            for pharmacy, inventory in result.all():
                distance = _haversine(lat, lng, float(pharmacy.latitude), float(pharmacy.longitude))
                if distance <= radius:
                    found_at.append({
                        "type": "pharmacy",
                        "name": pharmacy.name,
                        "distance_km": round(distance, 1),
                        "travel_time": f"{round(distance * 4)} mins",
                        "has_stock": True,
                        "phone": pharmacy.phone,
                        "open_24hrs": pharmacy.is_open_24hrs,
                    })

            if found_at:
                break

        found_at.sort(key=lambda x: x["distance_km"])

        return {
            "medicine": medicine_name,
            "urgency": "emergency",
            "found_at": found_at[:5],
            "helplines": {
                "emergency": "112",
                "ambulance": "108",
                "poison_control": "1800-11-6117",
                "women_helpline": "181",
            },
            "emergency_helpline": "108",
        }
