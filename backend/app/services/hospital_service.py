"""Hospital finder service (Premium)."""

import math
from typing import Optional

from sqlalchemy import and_
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.hospital import HospitalCache
from app.schemas.hospital import HospitalResult, NearbyHospitalsResponse


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in km between two coordinates."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(a))


class HospitalService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_nearby(
        self,
        lat: float,
        lng: float,
        condition: Optional[str] = None,
        emergency: bool = False,
        radius_km: float = 10.0,
        limit: int = 10,
    ) -> NearbyHospitalsResponse:
        """
        Find nearby hospitals within radius_km. For MVP, returns from cached data.
        In production this would call Google Maps Places API and cache results.
        """
        # Bounding box pre-filter for performance
        lat_range = radius_km / 111.0
        lng_range = radius_km / (111.0 * math.cos(math.radians(lat)))

        query = select(HospitalCache).where(
            and_(
                HospitalCache.latitude.between(lat - lat_range, lat + lat_range),
                HospitalCache.longitude.between(lng - lng_range, lng + lng_range),
            )
        )

        if emergency:
            query = query.where(HospitalCache.has_emergency == True)

        result = await self.db.execute(query)
        hospitals = result.scalars().all()

        # Precise distance filter and result building
        results = []
        for h in hospitals:
            distance = _haversine(lat, lng, float(h.latitude), float(h.longitude))
            if distance > radius_km:
                continue

            specialties = h.specialties if isinstance(h.specialties, list) else []

            # Filter by condition/specialty if provided
            if condition:
                condition_lower = condition.lower()
                if not any(condition_lower in s.lower() for s in specialties):
                    continue

            directions_url = (
                f"https://www.google.com/maps/dir/?api=1"
                f"&destination={h.latitude},{h.longitude}"
            )

            results.append(
                HospitalResult(
                    id=h.id,
                    name=h.name,
                    type=h.type,
                    address=h.address,
                    phone=h.phone,
                    distance_km=round(distance, 1),
                    rating=float(h.rating) if h.rating else None,
                    has_emergency=h.has_emergency,
                    specialties=specialties,
                    directions_url=directions_url,
                )
            )

        results.sort(key=lambda x: x.distance_km or 0)
        results = results[:limit]

        return NearbyHospitalsResponse(
            count=len(results),
            hospitals=results,
            condition=condition,
        )
