"""Application-wide constants."""

# Subscription tiers
TIER_FREE = "free"
TIER_PREMIUM = "premium"
TIER_PHARMACY = "pharmacy"

# User roles
ROLE_PATIENT = "patient"
ROLE_PHARMACY_OWNER = "pharmacy_owner"
ROLE_ADMIN = "admin"

# Reminder limits
FREE_REMINDER_LIMIT = 3

# Medicine search
SEARCH_DEFAULT_PAGE_SIZE = 20
SEARCH_MAX_PAGE_SIZE = 50

# Pharmacy search
PHARMACY_DEFAULT_RADIUS_KM = 5.0
PHARMACY_MAX_RADIUS_KM = 50.0

# Risk levels
RISK_LOW = "low"
RISK_MEDIUM = "medium"
RISK_HIGH = "high"
RISK_EMERGENCY = "emergency"

# Interaction severity
SEVERITY_MINOR = "minor"
SEVERITY_MODERATE = "moderate"
SEVERITY_MAJOR = "major"
SEVERITY_CONTRAINDICATED = "contraindicated"

# OCR providers
OCR_TESSERACT = "tesseract"
OCR_GOOGLE_VISION = "google_vision"

# Medical disclaimer
MEDICAL_DISCLAIMER = (
    "This is NOT a medical diagnosis. The information provided is for educational "
    "purposes only and should not be considered a substitute for professional "
    "medical advice, diagnosis, or treatment. Always consult a qualified healthcare "
    "professional for medical concerns."
)
