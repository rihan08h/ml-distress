# Smart-Medicine-Hub — System Architecture

## 1. Product Vision

A comprehensive healthcare platform that makes medicine access **safe, affordable, and intelligent**. The platform connects patients, pharmacies, and healthcare data into a unified ecosystem.

### Feature Map (13 Modules)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SMART-MEDICINE-HUB                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FREE TIER                              PREMIUM TIER (💎)               │
│  ─────────                              ──────────────────              │
│  1. User Auth & Profiles                13. AI Symptom Checker 💎       │
│  2. Medicine Search                         • Disease prediction        │
│  3. Nearby Pharmacy Locator                 • Risk level assessment     │
│  4. Medicine Authenticity Verification      • Hospital recommendation   │
│  5. Prescription Scanner (OCR)              • First aid suggestions     │
│  6. Generic Medicine Recommendation         • Voice symptom input       │
│  7. Drug Interaction Warning                                            │
│  8. Emergency Medicine Finder                                           │
│  9. Medicine Reminder System                                            │
│                                                                         │
│  PHARMACY PORTAL (B2B)                  ANALYTICS (Advanced)            │
│  ─────────────────────                  ────────────────────            │
│  10. Pharmacy Inventory Management      12. Medicine Demand Prediction  │
│  11. Pharmacy Network Platform                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│                                                                              │
│   ┌──────────────────┐   ┌──────────────────┐   ┌───────────────────────┐   │
│   │   Web Frontend    │   │  Mobile (PWA)    │   │  Pharmacy Dashboard   │   │
│   │   Next.js/React   │   │  Responsive      │   │  (Pharmacy Portal)    │   │
│   └────────┬──────────┘   └────────┬─────────┘   └───────────┬──────────┘   │
└────────────┼───────────────────────┼──────────────────────────┼──────────────┘
             │                       │                          │
             └───────────────────────┼──────────────────────────┘
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY (Nginx / Traefik)                         │
│         SSL · Rate Limiting · Auth Verification · CORS · API Versioning      │
│         Subscription Tier Check (Free / Premium) · Request Routing           │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │
     ┌──────────┬───────────┬───┼───┬───────────┬──────────┬──────────┐
     ▼          ▼           ▼   ▼   ▼           ▼          ▼          ▼
┌────────┐┌─────────┐┌──────────┐┌────────┐┌─────────┐┌────────┐┌──────────┐
│  Auth  ││Medicine ││ Pharmacy ││  OCR   ││  Drug   ││ Symptom││ Reminder │
│Service ││ Search  ││ Locator  ││Scanner ││Interact.││Checker ││ Service  │
│        ││ Service ││& Inventory││Service ││Warning  ││💎PREMIUM│          │
│JWT     ││         ││ Service  ││        ││ Service ││        ││          │
│Subscr. ││         ││          ││        ││         ││        ││          │
└───┬────┘└────┬────┘└────┬─────┘└───┬────┘└────┬────┘└───┬────┘└────┬─────┘
    │          │          │          │          │         │          │
    │     ┌────┴──────────┴──────────┴──────────┴─────────┴──────────┘
    │     │
    ▼     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                      │
│                                                                              │
│  ┌────────────────┐  ┌────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │  PostgreSQL    │  │   Redis    │  │  ML Models   │  │  Blob / S3     │   │
│  │                │  │            │  │              │  │  Storage       │   │
│  │ • users        │  │ • sessions │  │ • symptom    │  │ • prescription │   │
│  │ • medicines    │  │ • API cache│  │   classifier │  │   images       │   │
│  │ • pharmacies   │  │ • rate     │  │ • demand     │  │ • QR scans     │   │
│  │ • inventory    │  │   limits   │  │   predictor  │  │ • voice files  │   │
│  │ • prescriptions│  │ • pharmacy │  │ • NLP engine │  │                │   │
│  │ • interactions │  │   stock    │  │              │  │                │   │
│  │ • reminders    │  │ • reminder │  │              │  │                │   │
│  │ • subscriptions│  │   queue    │  │              │  │                │   │
│  │ • audit_logs   │  └────────────┘  └──────────────┘  └────────────────┘   │
│  └────────────────┘                                                          │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                                 │
│  │  Elasticsearch   │  │  Celery + Redis  │                                 │
│  │  (Medicine       │  │  (Task Queue)    │                                 │
│  │   full-text      │  │                  │                                 │
│  │   search)        │  │  • reminders     │                                 │
│  └──────────────────┘  │  • demand calc   │                                 │
│                        │  • notifications │                                 │
│                        │  • OCR jobs      │                                 │
│                        └──────────────────┘                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Microservices Decomposition

| # | Service | Tier | Key Endpoints |
|---|---------|------|---------------|
| 1 | **Auth & Subscription** | All | `/auth/*`, `/subscription/*`, `/profile/*` |
| 2 | **Medicine Search** | Free | `/medicines/search`, `/medicines/{id}`, `/medicines/generics` |
| 3 | **Pharmacy & Inventory** | Free + B2B | `/pharmacies/nearby`, `/pharmacies/{id}/inventory`, `/pharmacies/network` |
| 4 | **OCR / Prescription** | Free | `/prescriptions/scan`, `/prescriptions/{id}` |
| 5 | **Drug Safety** | Free | `/safety/interactions`, `/safety/verify` |
| 6 | **Symptom Checker** | **Premium 💎** | `/symptoms/analyze`, `/symptoms/voice`, `/hospitals/nearby` |
| 7 | **Reminders** | Free (3) / Premium (∞) | `/reminders/*` |
| 8 | **Analytics** | B2B | `/analytics/demand`, `/analytics/trends` |
| 9 | **Notifications** | All (internal) | Push, email, SMS dispatching |

> **Hackathon strategy**: Build as a monolith with clean module boundaries, split into microservices post-launch.

---

## 4. Subscription & Premium Gate

```
┌─────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION TIERS                         │
├──────────────┬──────────────────┬────────────────────────────┤
│   FREE       │    PREMIUM 💎    │    PHARMACY (B2B)          │
│   ₹0/mo      │    ₹99/mo        │    ₹499/mo                │
├──────────────┼──────────────────┼────────────────────────────┤
│ ✅ Medicine   │ ✅ All Free      │ ✅ All Premium             │
│   Search      │   features       │ ✅ Inventory dashboard    │
│ ✅ Pharmacy   │                  │ ✅ Stock management       │
│   Locator     │ 💎 AI Symptom   │ ✅ Medicine transfers     │
│ ✅ Drug       │   Checker        │ ✅ Demand prediction      │
│   Interactions│ 💎 Voice input  │ ✅ Restocking alerts      │
│ ✅ Authenticity│ 💎 Hospital     │ ✅ Network connections    │
│   Verification│   recommendations│ ✅ Analytics dashboard    │
│ ✅ Prescription│ 💎 First aid    │                           │
│   Scanner     │ 💎 Health       │                           │
│ ✅ Generic    │   reports        │                           │
│   Alternatives│ ✅ Unlimited    │                           │
│ ✅ Emergency  │   reminders      │                           │
│   Finder      │ ✅ Priority     │                           │
│ ✅ 3 Reminders│   support        │                           │
└──────────────┴──────────────────┴────────────────────────────┘
```

### Premium Gate — Backend Logic

```python
from enum import Enum
from fastapi import Depends, HTTPException

class SubscriptionTier(str, Enum):
    FREE = "free"
    PREMIUM = "premium"
    PHARMACY = "pharmacy"

PREMIUM_FEATURES = {
    "symptom_checker", "voice_input", "hospital_finder",
    "first_aid", "health_reports", "unlimited_reminders"
}

class RequireTier:
    """FastAPI dependency to gate endpoints by subscription tier."""
    def __init__(self, minimum_tier: SubscriptionTier):
        self.minimum_tier = minimum_tier
    
    async def __call__(self, user = Depends(get_current_user)):
        tier_hierarchy = {"free": 0, "premium": 1, "pharmacy": 2}
        if tier_hierarchy[user.subscription_tier] < tier_hierarchy[self.minimum_tier]:
            raise HTTPException(status_code=403, detail={
                "error": "UPGRADE_REQUIRED",
                "message": f"This feature requires {self.minimum_tier} subscription.",
                "current_tier": user.subscription_tier,
                "upgrade_url": "/subscription/upgrade"
            })
        return user

# Route usage:
@router.post("/symptoms/analyze", dependencies=[Depends(RequireTier(SubscriptionTier.PREMIUM))])
async def analyze_symptoms(request: SymptomRequest):
    ...
```

---

## 5. Complete Data Flow Diagrams

### Journey A: Medicine Search → Pharmacy → Purchase

```
User searches "Paracetamol 500mg"
         │
         ▼
┌─────────────────────────┐
│ 1. MEDICINE SEARCH      │  ◄── Elasticsearch full-text
│    • Name / composition │
│    • Filter by brand    │
│    • Show details       │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ 2. DRUG INTERACTION     │  ◄── Auto-check against user's meds
│    CHECK                │
│    • Safe / Warning     │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ 3. GENERIC ALTERNATIVES │  ◄── Same composition, lower cost
│    • Brand vs Generic   │
│    • Price comparison   │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ 4. NEARBY PHARMACIES    │  ◄── GPS + real-time stock
│    • In stock? ✅/❌    │
│    • Distance & route   │
│    • Reserve medicine   │
└─────────────────────────┘
```

### Journey B: Prescription Upload → Smart Actions

```
User uploads prescription photo
         │
         ▼
┌─────────────────────────┐
│ 1. OCR EXTRACTION       │  ◄── Tesseract / Google Vision
│    • Extract text       │
│    • Detect medicines   │
│    • Parse dosages      │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ 2. MEDICINE MATCHING    │  ◄── Map to medicine database
│    • Confirm medicines  │
│    • Show details       │
│    • Drug interactions  │
└─────────┬───────────────┘
          │
          ├──────────────────────┐
          ▼                      ▼
┌──────────────────┐   ┌─────────────────┐
│ 3. SET REMINDERS │   │ 4. FIND STOCK   │
│    • Auto-create │   │    • Nearby     │
│    • Schedule    │   │      pharmacies │
└──────────────────┘   └─────────────────┘
```

### Journey C: AI Symptom Checker (💎 Premium Only)

```
Premium user enters symptoms (text or voice)
         │
         ▼
┌─────────────────────────┐
│ 0. PREMIUM GATE CHECK   │  ◄── Subscription verification
│    • 💎 Required        │
│    • Redirect if free   │
└─────────┬───────────────┘
          │ ✅ Premium verified
          ▼
┌─────────────────────────┐
│ 1. INPUT PROCESSING     │
│    • Voice → STT        │
│    • Text cleanup       │
│    • NLP extraction     │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ 2. AI PREDICTION        │
│    • ML model (fast)    │
│    • LLM (complex)      │
│    • Top 3 diseases     │
└─────────┬───────────────┘
          │
          ├──────────────────────────┐
          ▼                          ▼
┌──────────────────────┐   ┌──────────────────────┐
│ 3. RISK ASSESSMENT   │   │ 4. FIRST AID         │
│    Low / Medium /    │   │    Immediate steps    │
│    Emergency         │   │    Do's & Don'ts      │
└──────────┬───────────┘   └──────────────────────┘
           │
           ▼
┌──────────────────────┐
│ 5. HOSPITAL FINDER   │
│    Nearby hospitals   │
│    Specialists        │
│    Directions         │
└──────────────────────┘
```

### Journey D: Medicine Authenticity Check

```
User scans QR code / barcode on medicine box
         │
         ▼
┌─────────────────────────┐
│ 1. DECODE QR/BARCODE    │  ◄── ZXing / camera API
│    • Extract code       │
│    • Identify format    │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ 2. VERIFY WITH DB       │  ◄── Manufacturer database lookup
│    • Match batch number │
│    • Check manufacturer │
│    • Verify expiry      │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│ 3. RESULT                           │
│    ✅ VERIFIED AUTHENTIC             │
│    Medicine: Amoxicillin 500mg      │
│    Manufacturer: ABC Pharma         │
│    Batch: BX2026                    │
│    Expiry: 2027-06-15              │
│                                     │
│    ❌ COUNTERFEIT WARNING            │
│    ⚠️ This medicine could not be    │
│    verified. Do NOT consume.        │
│    Report to: drug-alert@gov.in     │
└─────────────────────────────────────┘
```

---

## 6. External Integration Map

| Service | Provider | Purpose | Used By |
|---------|----------|---------|---------|
| **Maps & Places** | Google Maps API | Pharmacy/hospital locator, directions | Pharmacy Locator, Hospital Finder |
| **LLM** | OpenAI GPT-4 / Gemini | Symptom analysis, smart responses | Symptom Checker 💎 |
| **Speech-to-Text** | OpenAI Whisper | Voice symptom input | Symptom Checker 💎 |
| **OCR** | Tesseract + Google Vision | Prescription text extraction | Prescription Scanner |
| **Drug Database** | OpenFDA API + RxNorm | Drug interactions, medicine data | Drug Safety, Medicine Search |
| **Payments** | Razorpay / Stripe | Premium subscriptions | Auth & Subscription |
| **Push Notifications** | Firebase FCM | Medicine reminders, alerts | Reminder Service |
| **Email** | SendGrid / AWS SES | Verification, alerts | Notification Service |
| **SMS** | Twilio (emergency) | Emergency alerts | Emergency Finder |
| **QR/Barcode** | ZXing library | Medicine authenticity scanning | Authenticity Verification |

---

## 7. Security & Compliance

| Concern | Mitigation |
|---------|-----------|
| **Health Data Privacy** | AES-256 encryption at rest, TLS 1.3 in transit, minimal data retention |
| **Prescription Images** | Encrypted blob storage, auto-purge after 30 days, user consent |
| **Payment Security** | PCI-compliant gateway (Razorpay/Stripe) — never store card data |
| **Medical Disclaimer** | Mandatory on all AI predictions: "Not a substitute for professional advice" |
| **Authentication** | JWT (short-lived) + refresh tokens, bcrypt password hashing |
| **Rate Limiting** | Redis sliding window per user per endpoint |
| **Pharmacy Data** | Role-based access — pharmacies only manage own inventory |
| **Input Sanitization** | Pydantic strict validation, parameterized SQL via ORM |
| **QR Spoofing** | Cross-verify with manufacturer endpoint, flag unverified batches |
| **Audit Trail** | Immutable logging of all verifications, predictions, transactions |

---

## 8. Scalability Plan

| Stage | Users | Infra | Monthly Cost |
|-------|-------|-------|-------------|
| **Hackathon MVP** | 0–500 | Single VPS, monolith, PG + Redis | $0–24 |
| **Launch** | 500–10K | Docker Compose, CDN, dedicated DB | $50–100 |
| **Growth** | 10K–100K | Microservices, LB, Elasticsearch, replicas | $200–500 |
| **Scale** | 100K–1M | Kubernetes, multi-region, event-driven | $1K–5K |
