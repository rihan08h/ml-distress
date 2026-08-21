"""SQLAlchemy models — import all models for Alembic auto-detection."""

from app.models.user import User, MedicalProfile  # noqa: F401
from app.models.subscription import Subscription  # noqa: F401
from app.models.medicine import Medicine, GenericMapping  # noqa: F401
from app.models.interaction import DrugInteraction  # noqa: F401
from app.models.pharmacy import Pharmacy, PharmacyInventory, PharmacyNetwork, MedicineTransfer  # noqa: F401
from app.models.reservation import Reservation  # noqa: F401
from app.models.prescription import Prescription  # noqa: F401
from app.models.verification import MedicineVerification  # noqa: F401
from app.models.reminder import Reminder, ReminderDose  # noqa: F401
from app.models.symptom_session import SymptomSession  # noqa: F401
from app.models.prediction import Prediction  # noqa: F401
from app.models.hospital import HospitalCache  # noqa: F401
from app.models.first_aid import FirstAidKB  # noqa: F401
from app.models.feedback import Feedback  # noqa: F401
from app.models.demand_tracking import DemandTracking  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
