# API Design Specification — Smart Medicine Platform

## Base URL
```
Production:  https://api.smartmedicine.com/api/v1
Development: http://localhost:8000/api/v1
```

## Common Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Request-Id: <uuid>               # Auto-generated for tracing
X-Subscription-Tier: free|premium|pharmacy   # Set by gateway
```

---

## 1. Authentication & Subscription Endpoints

### POST /auth/register
```json
// Request
{
  "email": "user@example.com",
  "password": "SecureP@ss123",
  "full_name": "Rahul Sharma",
  "phone": "+919876543210",
  "date_of_birth": "1990-05-15",
  "gender": "male"
}

// Response 201
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Rahul Sharma",
  "subscription_tier": "free",
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### POST /auth/login
```json
// Request
{ "email": "user@example.com", "password": "SecureP@ss123" }

// Response 200
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "subscription_tier": "premium",
    "full_name": "Rahul Sharma"
  }
}
```

### POST /auth/refresh
```json
{ "refresh_token": "eyJ..." }
```

### GET /auth/me — Get current user profile

### PUT /profile — Update profile
```json
{
  "full_name": "Rahul Sharma",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "medical_history": {
    "known_conditions": ["hypertension", "diabetes"],
    "current_medications": ["metformin 500mg", "amlodipine 5mg"],
    "allergies": ["penicillin"]
  },
  "location": { "latitude": 28.6139, "longitude": 77.2090 }
}
```

### POST /subscription/upgrade
```json
// Request
{
  "tier": "premium",
  "payment_method": "razorpay",
  "payment_token": "pay_abc123",
  "plan_duration": "monthly"
}

// Response 200
{
  "subscription": {
    "tier": "premium",
    "status": "active",
    "started_at": "2026-03-11T00:00:00Z",
    "expires_at": "2026-04-11T00:00:00Z",
    "auto_renew": true
  },
  "unlocked_features": [
    "ai_symptom_checker", "voice_input", "hospital_finder",
    "first_aid", "health_reports", "unlimited_reminders"
  ]
}
```

### GET /subscription/status
### POST /subscription/cancel

---

## 2. Medicine Search Endpoints (FREE)

### GET /medicines/search
Full-text medicine search with filters.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search query (name, brand, composition) |
| `type` | string | No | "all" | brand, generic, all |
| `dosage_form` | string | No | - | tablet, capsule, syrup, injection |
| `page` | int | No | 1 | Page number |
| `limit` | int | No | 20 | Results per page (max 50) |

**Response (200):**
```json
{
  "total": 45,
  "page": 1,
  "medicines": [
    {
      "id": "med_001",
      "name": "Crocin Advance 500mg",
      "generic_name": "Paracetamol",
      "brand": "Crocin",
      "manufacturer": "GSK Consumer Healthcare",
      "composition": [
        { "ingredient": "Paracetamol", "strength": "500mg" }
      ],
      "dosage_form": "tablet",
      "price": { "mrp": 30.50, "currency": "INR", "pack_size": "15 tablets" },
      "prescription_required": false,
      "category": "analgesic"
    }
  ]
}
```

### GET /medicines/{id}
Full medicine details.

```json
{
  "id": "med_001",
  "name": "Crocin Advance 500mg",
  "generic_name": "Paracetamol",
  "brand": "Crocin",
  "manufacturer": "GSK Consumer Healthcare",
  "composition": [
    { "ingredient": "Paracetamol", "strength": "500mg" }
  ],
  "dosage_form": "tablet",
  "dosage_instructions": {
    "adults": "1-2 tablets every 4-6 hours. Max 8 tablets/day.",
    "children": "Consult doctor for dosage.",
    "with_food": "Can be taken with or without food"
  },
  "side_effects": {
    "common": ["Nausea", "Allergic skin reactions"],
    "rare": ["Liver damage (overdose)", "Blood disorders"],
    "seek_help_if": ["Skin rash or peeling", "Difficulty breathing"]
  },
  "contraindications": ["Severe liver disease", "Alcohol dependence"],
  "storage": "Store below 30°C in a dry place",
  "price": { "mrp": 30.50, "currency": "INR", "pack_size": "15 tablets" },
  "prescription_required": false,
  "generic_alternatives": [
    {
      "id": "med_045",
      "name": "Paracetamol IP 500mg",
      "manufacturer": "Cipla",
      "price": { "mrp": 12.00, "currency": "INR", "pack_size": "10 tablets" },
      "savings_percent": 60
    }
  ]
}
```

### GET /medicines/{id}/generics
Get cheaper generic alternatives.

```json
{
  "brand_medicine": { "id": "med_001", "name": "Crocin 500mg", "price": 30.50 },
  "alternatives": [
    {
      "id": "med_045",
      "name": "Paracetamol IP 500mg",
      "manufacturer": "Cipla",
      "composition_match": "100%",
      "price": 12.00,
      "savings_percent": 60,
      "available_nearby": true
    },
    {
      "id": "med_046",
      "name": "Dolo 500mg",
      "manufacturer": "Micro Labs",
      "composition_match": "100%",
      "price": 26.00,
      "savings_percent": 15,
      "available_nearby": true
    }
  ]
}
```

---

## 3. Pharmacy Locator Endpoints (FREE)

### GET /pharmacies/nearby

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `lat` | float | Yes | - | User latitude |
| `lng` | float | Yes | - | User longitude |
| `radius_km` | float | No | 5 | Search radius |
| `medicine_id` | string | No | - | Filter by medicine in stock |
| `open_now` | bool | No | false | Only show open pharmacies |
| `limit` | int | No | 10 | Max results |

**Response (200):**
```json
{
  "count": 3,
  "pharmacies": [
    {
      "id": "pharm_001",
      "name": "Apollo Pharmacy - Connaught Place",
      "address": "Block A, Connaught Place, New Delhi 110001",
      "phone": "+91-11-23456789",
      "distance_km": 1.2,
      "estimated_travel_time": "8 mins",
      "rating": 4.3,
      "is_open": true,
      "operating_hours": { "open": "08:00", "close": "22:00" },
      "has_medicine": true,
      "medicine_stock": {
        "medicine_id": "med_001",
        "medicine_name": "Crocin 500mg",
        "in_stock": true,
        "quantity_available": 45,
        "price": 30.50,
        "last_updated": "2026-03-11T10:00:00Z"
      },
      "location": { "latitude": 28.6315, "longitude": 77.2167 },
      "directions_url": "https://maps.google.com/dir/..."
    }
  ]
}
```

### GET /pharmacies/{id}
Full pharmacy details.

### GET /pharmacies/{id}/inventory
View a pharmacy's available medicines.

### POST /pharmacies/{id}/reserve
Reserve medicine at a pharmacy.

```json
// Request
{
  "medicine_id": "med_001",
  "quantity": 2,
  "pickup_time": "2026-03-11T15:00:00Z"
}

// Response 201
{
  "reservation_id": "res_abc123",
  "status": "confirmed",
  "pharmacy": "Apollo Pharmacy - Connaught Place",
  "medicine": "Crocin 500mg",
  "quantity": 2,
  "total_price": 61.00,
  "pickup_by": "2026-03-11T17:00:00Z",
  "confirmation_code": "AP-7842"
}
```

---

## 4. Pharmacy Inventory Management (B2B — PHARMACY TIER)

### POST /pharmacy-portal/register
Register a new pharmacy.

### GET /pharmacy-portal/dashboard
Pharmacy dashboard with stock overview.

### PUT /pharmacy-portal/inventory
Update medicine stock.

```json
// Request
{
  "updates": [
    { "medicine_id": "med_001", "quantity": 150, "price": 30.50, "expiry": "2027-06-15" },
    { "medicine_id": "med_045", "quantity": 0, "status": "out_of_stock" }
  ]
}

// Response 200
{
  "updated": 2,
  "inventory_summary": {
    "total_medicines": 342,
    "in_stock": 320,
    "low_stock": 15,
    "out_of_stock": 7
  }
}
```

### POST /pharmacy-portal/transfer
Transfer medicine to another pharmacy in the network.

```json
{
  "to_pharmacy_id": "pharm_005",
  "medicine_id": "med_001",
  "quantity": 50,
  "reason": "stock_rebalance"
}
```

### GET /pharmacy-portal/network
View connected pharmacies.

### GET /pharmacy-portal/alerts
Low stock and expiry alerts.

---

## 5. Medicine Authenticity Verification (FREE)

### POST /safety/verify
Verify medicine authenticity via QR/barcode.

```json
// Request
{
  "code": "8901234567890",
  "code_type": "barcode",
  "image_url": "https://storage.../scan_abc.jpg"
}

// Response 200 — Authentic
{
  "status": "verified",
  "medicine": {
    "name": "Amoxicillin 500mg",
    "manufacturer": "ABC Pharma",
    "batch_number": "BX2026",
    "manufacturing_date": "2025-08-15",
    "expiry_date": "2027-08-14",
    "pack_size": "10 capsules"
  },
  "verification": {
    "is_authentic": true,
    "verified_with": "manufacturer_database",
    "confidence": "high",
    "verified_at": "2026-03-11T12:00:00Z"
  }
}

// Response 200 — Counterfeit Warning
{
  "status": "warning",
  "verification": {
    "is_authentic": false,
    "reason": "Batch number not found in manufacturer records",
    "confidence": "high",
    "action_required": "Do NOT consume. Report to drug authority.",
    "report_url": "https://cdsco.gov.in/report",
    "helpline": "1800-180-1234"
  }
}
```

---

## 6. Prescription Scanner — OCR (FREE)

### POST /prescriptions/scan
Upload and parse a prescription image.

**Request:** `multipart/form-data`
- `image`: JPEG/PNG file (max 10MB)
- `language`: "en" (default)

**Response (200):**
```json
{
  "prescription_id": "rx_abc123",
  "raw_text": "Tab Amoxicillin 500mg - 1 tab 3 times daily x 7 days\nTab Paracetamol 500mg - SOS for fever\nSyp Cough Relief 5ml - twice daily",
  "ocr_confidence": 0.91,
  "detected_medicines": [
    {
      "extracted_name": "Amoxicillin 500mg",
      "matched_medicine_id": "med_102",
      "matched_name": "Amoxicillin 500mg Capsule",
      "dosage": "1 tablet, 3 times daily",
      "duration": "7 days",
      "instructions": "After food",
      "match_confidence": 0.95
    },
    {
      "extracted_name": "Paracetamol 500mg",
      "matched_medicine_id": "med_001",
      "matched_name": "Paracetamol 500mg Tablet",
      "dosage": "1 tablet as needed",
      "duration": "As required",
      "instructions": "For fever",
      "match_confidence": 0.98
    },
    {
      "extracted_name": "Cough Relief Syrup",
      "matched_medicine_id": "med_210",
      "matched_name": "Cough Relief Syrup 100ml",
      "dosage": "5ml, twice daily",
      "duration": "Not specified",
      "instructions": null,
      "match_confidence": 0.82
    }
  ],
  "drug_interactions": {
    "found": false,
    "warnings": []
  },
  "actions": {
    "set_reminders_url": "/api/v1/reminders/from-prescription/rx_abc123",
    "find_pharmacies_url": "/api/v1/pharmacies/nearby?medicine_ids=med_102,med_001,med_210"
  }
}
```

### GET /prescriptions/{id}
Retrieve a previous prescription scan.

### GET /prescriptions
List user's prescription history.

---

## 7. Drug Interaction Warning (FREE)

### POST /safety/interactions
Check for dangerous drug combinations.

```json
// Request
{
  "medicines": [
    { "medicine_id": "med_102", "name": "Amoxicillin 500mg" },
    { "medicine_id": "med_350", "name": "Warfarin 5mg" }
  ],
  "include_current_medications": true
}

// Response 200
{
  "total_checked": 3,
  "interactions_found": 1,
  "interactions": [
    {
      "medicine_a": "Warfarin 5mg",
      "medicine_b": "Amoxicillin 500mg",
      "severity": "moderate",
      "description": "Amoxicillin may increase the anticoagulant effect of Warfarin, increasing bleeding risk.",
      "recommendation": "Monitor INR closely. Consult your doctor before use.",
      "source": "DrugBank / OpenFDA"
    }
  ],
  "safe_combinations": [
    {
      "medicine_a": "Amoxicillin 500mg",
      "medicine_b": "Metformin 500mg",
      "status": "safe",
      "note": "No known interactions"
    }
  ],
  "disclaimer": "This check covers major known interactions. Always consult a healthcare professional."
}
```

### GET /safety/interactions/medicine/{id}
Get all known interactions for a specific medicine.

---

## 8. Emergency Medicine Finder (FREE)

### GET /emergency/find

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `medicine_id` | string | Yes | Medicine needed urgently |
| `lat` | float | Yes | User latitude |
| `lng` | float | Yes | User longitude |
| `expand_radius` | bool | No | Search in nearby cities if not found (default: true) |

**Response (200):**
```json
{
  "medicine": "Epinephrine Auto-Injector",
  "urgency": "emergency",
  "found_at": [
    {
      "type": "hospital",
      "name": "Safdarjung Hospital",
      "distance_km": 3.5,
      "travel_time": "15 mins",
      "has_stock": true,
      "phone": "+91-11-26707437",
      "directions_url": "https://maps.google.com/dir/...",
      "open_24hrs": true
    },
    {
      "type": "pharmacy",
      "name": "MedPlus - Sarojini Nagar",
      "distance_km": 5.1,
      "travel_time": "22 mins",
      "has_stock": true,
      "phone": "+91-11-98765432",
      "directions_url": "https://maps.google.com/dir/...",
      "closing_time": "23:00"
    }
  ],
  "nearest_city_results": [
    {
      "city": "Gurgaon",
      "pharmacy": "Apollo Pharmacy - DLF Phase 3",
      "distance_km": 28,
      "has_stock": true
    }
  ],
  "emergency_helpline": "108"
}
```

---

## 9. Medicine Reminder System (FREE: 3 max / PREMIUM: unlimited)

### POST /reminders
Create a medicine reminder.

```json
// Request
{
  "medicine_id": "med_102",
  "medicine_name": "Amoxicillin 500mg",
  "dosage": "1 tablet",
  "frequency": "3_times_daily",
  "times": ["08:00", "14:00", "20:00"],
  "start_date": "2026-03-11",
  "end_date": "2026-03-18",
  "instructions": "Take after food",
  "notification_channels": ["push", "sms"]
}

// Response 201
{
  "id": "rem_001",
  "status": "active",
  "next_reminder": "2026-03-11T08:00:00Z",
  "total_doses": 21,
  "completed_doses": 0
}
```

### GET /reminders — List all active reminders
### PUT /reminders/{id} — Update reminder
### DELETE /reminders/{id} — Delete reminder
### POST /reminders/{id}/taken — Mark dose as taken

```json
// Response
{
  "reminder_id": "rem_001",
  "dose_logged": true,
  "progress": { "completed": 5, "total": 21, "adherence_percent": 100 },
  "next_dose": "2026-03-12T08:00:00Z"
}
```

### POST /reminders/from-prescription/{prescription_id}
Auto-create reminders from a scanned prescription.

---

## 10. AI Symptom Checker (💎 PREMIUM ONLY)

### POST /symptoms/analyze
**Requires**: Premium or Pharmacy subscription.

```json
// Request
{
  "symptoms_text": "I have a severe headache for 3 days, mild fever, and nausea",
  "input_type": "text",
  "user_profile": {
    "age": 35,
    "gender": "male",
    "known_conditions": ["hypertension"],
    "current_medications": ["amlodipine 5mg"]
  }
}

// Response 200
{
  "request_id": "req_abc123",
  "subscription_tier": "premium",
  "parsed_symptoms": [
    { "name": "headache", "severity": "severe", "duration": "3 days", "body_area": "head" },
    { "name": "fever", "severity": "mild", "duration": null, "body_area": "systemic" },
    { "name": "nausea", "severity": "moderate", "duration": null, "body_area": "gastrointestinal" }
  ],
  "predictions": [
    {
      "disease": "Migraine",
      "confidence": 0.78,
      "icd_code": "G43.9",
      "description": "Neurological condition with intense, debilitating headaches.",
      "specialist": "Neurologist"
    },
    {
      "disease": "Viral Infection (Flu)",
      "confidence": 0.65,
      "icd_code": "J11.1",
      "description": "Influenza virus infection.",
      "specialist": "General Physician"
    }
  ],
  "risk_assessment": {
    "level": "medium",
    "color": "orange",
    "recommendation": "See a doctor within 24-48 hours if symptoms persist.",
    "emergency_signs": ["Sudden worst headache of life", "Fever above 103°F", "Stiff neck with fever"]
  },
  "first_aid": {
    "immediate_actions": ["Rest in a quiet, dark room", "Stay hydrated", "OTC pain relief (paracetamol)"],
    "avoid": ["Bright screens", "Strenuous activity", "Alcohol"],
    "seek_emergency_if": ["Confusion or slurred speech", "Vision changes"]
  },
  "disclaimer": "This is NOT a medical diagnosis. Consult a healthcare professional."
}

// Response 403 — Free user attempting premium feature
{
  "error": {
    "code": "PREMIUM_REQUIRED",
    "message": "AI Symptom Checker is a premium feature.",
    "current_tier": "free",
    "upgrade_url": "/subscription/upgrade",
    "pricing": { "premium": "₹99/month", "trial": "7 days free" }
  }
}
```

### POST /symptoms/voice (💎 PREMIUM)
Upload voice recording for analysis.
**Request:** `multipart/form-data` — `audio_file` (WAV/MP3, max 10MB)

### GET /hospitals/nearby (💎 PREMIUM)
Find hospitals and specialists based on predicted condition.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `lat` | float | Yes | Latitude |
| `lng` | float | Yes | Longitude |
| `condition` | string | No | Filter by condition specialty |
| `emergency` | bool | No | Emergency services only |
| `radius_km` | float | No | Search radius (default: 10) |

---

## 11. Pharmacy Network Platform (B2B — PHARMACY TIER)

### GET /pharmacy-portal/network/pharmacies
List pharmacies in the network for stock sharing.

### POST /pharmacy-portal/network/connect
Send connection request to another pharmacy.

### GET /pharmacy-portal/network/shared-inventory
View shared inventory across connected pharmacies.

---

## 12. Medicine Demand Prediction (B2B — PHARMACY TIER)

### GET /analytics/demand

```json
// Response
{
  "pharmacy_id": "pharm_001",
  "period": "2026-03-11 to 2026-04-11",
  "predictions": [
    {
      "medicine_id": "med_001",
      "medicine_name": "Paracetamol 500mg",
      "current_stock": 150,
      "predicted_demand_30d": 420,
      "restock_recommended": true,
      "restock_quantity": 300,
      "confidence": 0.85,
      "factors": ["seasonal_flu_season", "historical_trend"]
    }
  ],
  "seasonal_alerts": [
    {
      "alert": "Flu season approaching",
      "affected_medicines": ["Paracetamol", "Cetirizine", "Amoxicillin"],
      "expected_demand_increase": "35%",
      "recommended_action": "Increase stock by 40% before April"
    }
  ]
}
```

### GET /analytics/trends
Historical demand trends for a medicine.

### GET /analytics/shortages
Predicted medicine shortages in the region.

---

## Error Response Format (All Endpoints)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": [{ "field": "email", "issue": "Invalid email format" }]
  },
  "request_id": "req_xyz789",
  "timestamp": "2026-03-11T10:30:00Z"
}
```

| HTTP | Code | Description |
|------|------|-------------|
| 400 | VALIDATION_ERROR | Bad request body |
| 401 | UNAUTHORIZED | Invalid/missing token |
| 403 | PREMIUM_REQUIRED | Free user hitting premium endpoint |
| 403 | PHARMACY_REQUIRED | Non-pharmacy user hitting B2B endpoint |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Duplicate resource |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | ML model or external service down |

---

## Rate Limits

| Endpoint Group | Free | Premium | Pharmacy |
|----------------|------|---------|----------|
| `/auth/*` | 10/min | 10/min | 10/min |
| `/medicines/*` | 30/min | 60/min | 100/min |
| `/pharmacies/*` | 20/min | 40/min | 100/min |
| `/safety/*` | 20/min | 40/min | 60/min |
| `/prescriptions/*` | 5/min | 15/min | 30/min |
| `/symptoms/*` | — | 5/min | 5/min |
| `/reminders/*` | 10/min | 30/min | 30/min |
| `/pharmacy-portal/*` | — | — | 60/min |
| `/analytics/*` | — | — | 30/min |
