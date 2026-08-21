"""V1 API Router — aggregates all endpoint modules."""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.medicines import router as medicines_router
from app.api.v1.pharmacies import router as pharmacies_router
from app.api.v1.safety import router as safety_router
from app.api.v1.prescriptions import router as prescriptions_router
from app.api.v1.symptoms import router as symptoms_router
from app.api.v1.hospitals import router as hospitals_router
from app.api.v1.reminders import router as reminders_router
from app.api.v1.subscriptions import router as subscriptions_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.emergency import router as emergency_router
from app.api.v1.portal import router as portal_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(medicines_router)
api_router.include_router(pharmacies_router)
api_router.include_router(safety_router)
api_router.include_router(prescriptions_router)
api_router.include_router(symptoms_router)
api_router.include_router(hospitals_router)
api_router.include_router(reminders_router)
api_router.include_router(subscriptions_router)
api_router.include_router(analytics_router)
api_router.include_router(emergency_router)
api_router.include_router(portal_router)
