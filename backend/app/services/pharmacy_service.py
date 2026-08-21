"""Pharmacy locator, stock, reservation, and B2B portal service."""

import uuid
import random
import string
import math
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationError
from app.models.pharmacy import Pharmacy, PharmacyInventory, MedicineTransfer
from app.models.medicine import Medicine
from app.models.reservation import Reservation
from app.models.demand_tracking import DemandTracking
from app.schemas.pharmacy import (
    PharmacyResult, NearbyPharmaciesResponse,
    ReservationRequest, ReservationResponse,
    MedicineStock,
)


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in km between two coordinates."""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(a))


def _generate_confirmation_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


class PharmacyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_nearby(
        self,
        lat: float,
        lng: float,
        radius_km: float = 5.0,
        medicine_id: Optional[uuid.UUID] = None,
        open_now: bool = False,
        limit: int = 10,
    ) -> NearbyPharmaciesResponse:
        query = select(Pharmacy).where(Pharmacy.is_active == True)

        # Simple bounding box filter for performance
        lat_range = radius_km / 111.0
        lng_range = radius_km / (111.0 * math.cos(math.radians(lat)))
        query = query.where(
            and_(
                Pharmacy.latitude.between(lat - lat_range, lat + lat_range),
                Pharmacy.longitude.between(lng - lng_range, lng + lng_range),
            )
        )

        result = await self.db.execute(query)
        pharmacies = result.scalars().all()

        # Calculate distances and filter
        results = []
        for p in pharmacies:
            distance = _haversine(lat, lng, float(p.latitude), float(p.longitude))
            if distance > radius_km:
                continue

            # Check stock if medicine_id provided
            stock = None
            has_medicine = False
            if medicine_id:
                inv_result = await self.db.execute(
                    select(PharmacyInventory)
                    .where(
                        PharmacyInventory.pharmacy_id == p.id,
                        PharmacyInventory.medicine_id == medicine_id,
                    )
                )
                inv = inv_result.scalar_one_or_none()
                if inv and inv.quantity > 0:
                    has_medicine = True
                    med_result = await self.db.execute(
                        select(Medicine).where(Medicine.id == medicine_id)
                    )
                    med = med_result.scalar_one_or_none()
                    stock = MedicineStock(
                        medicine_id=medicine_id,
                        medicine_name=med.name if med else "",
                        in_stock=True,
                        quantity_available=inv.quantity,
                        price=float(inv.price) if inv.price else None,
                        last_updated=inv.last_updated,
                    )

            travel_mins = round(distance * 4)  # Rough estimate: 15 km/h average
            results.append(
                PharmacyResult(
                    id=p.id,
                    name=p.name,
                    address=p.address,
                    phone=p.phone,
                    distance_km=round(distance, 1),
                    estimated_travel_time=f"{travel_mins} mins",
                    rating=float(p.rating) if p.rating else None,
                    is_open=True,  # Simplified — would check operating_hours
                    operating_hours=p.operating_hours or {},
                    has_medicine=has_medicine,
                    medicine_stock=stock,
                    location={"latitude": float(p.latitude), "longitude": float(p.longitude)},
                )
            )

        # Sort by distance and limit
        results.sort(key=lambda x: x.distance_km)
        results = results[:limit]

        return NearbyPharmaciesResponse(count=len(results), pharmacies=results)

    async def get_pharmacy(self, pharmacy_id: uuid.UUID) -> Pharmacy:
        result = await self.db.execute(select(Pharmacy).where(Pharmacy.id == pharmacy_id))
        pharmacy = result.scalar_one_or_none()
        if not pharmacy:
            raise NotFoundError("Pharmacy")
        return pharmacy

    async def get_inventory(self, pharmacy_id: uuid.UUID):
        result = await self.db.execute(
            select(PharmacyInventory, Medicine)
            .join(Medicine, PharmacyInventory.medicine_id == Medicine.id)
            .where(PharmacyInventory.pharmacy_id == pharmacy_id)
        )
        return result.all()

    async def reserve_medicine(
        self,
        pharmacy_id: uuid.UUID,
        user_id: uuid.UUID,
        req: ReservationRequest,
    ) -> ReservationResponse:
        # Check pharmacy exists
        pharmacy = await self.get_pharmacy(pharmacy_id)

        # Check stock
        inv_result = await self.db.execute(
            select(PharmacyInventory)
            .where(
                PharmacyInventory.pharmacy_id == pharmacy_id,
                PharmacyInventory.medicine_id == req.medicine_id,
            )
        )
        inv = inv_result.scalar_one_or_none()
        if not inv or inv.quantity < req.quantity:
            raise ValidationError("Insufficient stock for reservation")

        # Get medicine name
        med_result = await self.db.execute(select(Medicine).where(Medicine.id == req.medicine_id))
        medicine = med_result.scalar_one_or_none()

        # Create reservation
        total_price = float(inv.price) * req.quantity if inv.price else None
        confirmation_code = _generate_confirmation_code()
        pickup_by = req.pickup_time + timedelta(hours=2)

        reservation = Reservation(
            user_id=user_id,
            pharmacy_id=pharmacy_id,
            medicine_id=req.medicine_id,
            quantity=req.quantity,
            total_price=total_price,
            confirmation_code=confirmation_code,
            pickup_by=pickup_by,
        )
        self.db.add(reservation)

        # Reduce inventory
        inv.quantity -= req.quantity
        if inv.quantity == 0:
            inv.status = "out_of_stock"
        elif inv.quantity < 10:
            inv.status = "low_stock"

        await self.db.flush()

        return ReservationResponse(
            reservation_id=reservation.id,
            status="confirmed",
            pharmacy=pharmacy.name,
            medicine=medicine.name if medicine else "Unknown",
            quantity=req.quantity,
            total_price=total_price,
            pickup_by=pickup_by,
            confirmation_code=confirmation_code,
        )

    # ---- B2B Portal methods ----

    async def get_portal_inventory(self, pharmacy_id: uuid.UUID) -> list[dict]:
        """Get full inventory for the pharmacy owner's portal."""
        result = await self.db.execute(
            select(PharmacyInventory, Medicine)
            .join(Medicine, PharmacyInventory.medicine_id == Medicine.id)
            .where(PharmacyInventory.pharmacy_id == pharmacy_id)
            .order_by(Medicine.name)
        )
        rows = result.all()
        return [
            {
                "id": str(inv.id),
                "medicine_id": str(inv.medicine_id),
                "medicine_name": med.name,
                "generic_name": med.generic_name,
                "quantity": inv.quantity,
                "price": float(inv.price) if inv.price else None,
                "status": inv.status,
                "expiry_date": str(inv.expiry_date) if inv.expiry_date else None,
                "last_updated": inv.last_updated.isoformat() if inv.last_updated else None,
            }
            for inv, med in rows
        ]

    async def update_inventory_item(
        self,
        pharmacy_id: uuid.UUID,
        medicine_id: uuid.UUID,
        quantity: int | None = None,
        price: float | None = None,
    ) -> dict:
        """Update a single inventory item (B2B portal)."""
        result = await self.db.execute(
            select(PharmacyInventory).where(
                PharmacyInventory.pharmacy_id == pharmacy_id,
                PharmacyInventory.medicine_id == medicine_id,
            )
        )
        inv = result.scalar_one_or_none()
        if not inv:
            raise NotFoundError("Inventory item")

        if quantity is not None:
            inv.quantity = quantity
            if quantity == 0:
                inv.status = "out_of_stock"
            elif quantity < 10:
                inv.status = "low_stock"
            else:
                inv.status = "in_stock"
        if price is not None:
            from decimal import Decimal
            inv.price = Decimal(str(price))
        await self.db.flush()
        return {"status": "updated", "medicine_id": str(medicine_id), "quantity": inv.quantity}

    async def create_transfer(
        self,
        from_pharmacy_id: uuid.UUID,
        to_pharmacy_id: uuid.UUID,
        medicine_id: uuid.UUID,
        quantity: int,
        reason: str = "restock",
    ) -> dict:
        """Create a medicine transfer between pharmacies."""
        transfer = MedicineTransfer(
            from_pharmacy_id=from_pharmacy_id,
            to_pharmacy_id=to_pharmacy_id,
            medicine_id=medicine_id,
            quantity=quantity,
            status="pending",
            reason=reason,
        )
        self.db.add(transfer)
        await self.db.flush()
        return {"transfer_id": str(transfer.id), "status": "pending"}

    async def get_transfers(self, pharmacy_id: uuid.UUID) -> list[dict]:
        """Get all transfers involving a pharmacy."""
        result = await self.db.execute(
            select(MedicineTransfer)
            .where(
                (MedicineTransfer.from_pharmacy_id == pharmacy_id)
                | (MedicineTransfer.to_pharmacy_id == pharmacy_id)
            )
            .order_by(desc(MedicineTransfer.created_at))
            .limit(50)
        )
        rows = result.scalars().all()
        return [
            {
                "id": str(t.id),
                "from_pharmacy_id": str(t.from_pharmacy_id) if t.from_pharmacy_id else None,
                "to_pharmacy_id": str(t.to_pharmacy_id) if t.to_pharmacy_id else None,
                "medicine_id": str(t.medicine_id) if t.medicine_id else None,
                "quantity": t.quantity,
                "status": t.status,
                "reason": t.reason,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in rows
        ]

    async def get_portal_analytics(self, pharmacy_id: uuid.UUID) -> dict:
        """Get analytics dashboard data for pharmacy portal."""
        # Inventory summary
        inv_result = await self.db.execute(
            select(
                func.count(PharmacyInventory.id).label("total"),
                func.sum(func.case((PharmacyInventory.status == "in_stock", 1), else_=0)).label("in_stock"),
                func.sum(func.case((PharmacyInventory.status == "low_stock", 1), else_=0)).label("low_stock"),
                func.sum(func.case((PharmacyInventory.status == "out_of_stock", 1), else_=0)).label("out_of_stock"),
            ).where(PharmacyInventory.pharmacy_id == pharmacy_id)
        )
        inv_row = inv_result.one()

        # Demand data (last 3 months)
        demand_result = await self.db.execute(
            select(DemandTracking)
            .where(DemandTracking.pharmacy_id == pharmacy_id)
            .order_by(desc(DemandTracking.date))
            .limit(30)
        )
        demand_rows = demand_result.scalars().all()
        total_sold = sum(d.units_sold for d in demand_rows)
        total_searched = sum(d.units_searched for d in demand_rows)

        return {
            "inventory": {
                "total_medicines": inv_row.total or 0,
                "in_stock": inv_row.in_stock or 0,
                "low_stock": inv_row.low_stock or 0,
                "out_of_stock": inv_row.out_of_stock or 0,
            },
            "demand": {
                "total_units_sold": total_sold,
                "total_units_searched": total_searched,
                "data_points": len(demand_rows),
            },
        }
