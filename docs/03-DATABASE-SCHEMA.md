# Database Schema Design — Smart Medicine Platform

## Overview
- **Primary DB**: PostgreSQL 15+ (with PostGIS for geo queries)
- **Search Engine**: Elasticsearch 8 (medicine full-text search)
- **Cache**: Redis 7 (sessions, rate limits, stock cache, reminder queue)
- **ORM**: SQLAlchemy 2.0 + Alembic migrations
- **Blob Storage**: S3/MinIO (prescription images, QR scans, voice files)

---

## ER Diagram (Simplified)

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│    users     │       │  subscriptions   │       │  medical_profiles│
│──────────────│       │──────────────────│       │──────────────────│
│ id (PK)      │──┐    │ id (PK)          │       │ id (PK)          │
│ email        │  ├───▶│ user_id (FK)     │       │ user_id (FK)     │
│ password_hash│  │    │ tier             │       │ conditions       │
│ full_name    │  │    │ status           │       │ medications      │
│ phone        │  │    │ started_at       │       │ allergies        │
│ role         │  │    │ expires_at       │       └──────────────────┘
│ created_at   │  │    └──────────────────┘
└──────────────┘  │
                  │    ┌──────────────────┐       ┌──────────────────┐
                  │    │   medicines      │       │  drug_interactions│
                  │    │──────────────────│       │──────────────────│
                  │    │ id (PK)          │──┐    │ id (PK)          │
                  │    │ name             │  ├───▶│ medicine_a (FK)  │
                  │    │ generic_name     │  │    │ medicine_b (FK)  │
                  │    │ composition      │  │    │ severity         │
                  │    │ manufacturer     │  │    │ description      │
                  │    │ dosage_form      │  │    └──────────────────┘
                  │    │ side_effects     │  │
                  │    │ price            │  │    ┌──────────────────┐
                  │    └──────────────────┘  │    │generic_mappings  │
                  │                          │    │──────────────────│
                  │    ┌──────────────────┐  │    │ brand_id (FK)    │
                  │    │   pharmacies     │  ├───▶│ generic_id (FK)  │
                  │    │──────────────────│  │    │ composition_match│
                  │    │ id (PK)          │  │    └──────────────────┘
                  │    │ owner_user_id(FK)│  │
                  │    │ name             │  │    ┌──────────────────┐
                  │    │ address          │  │    │pharmacy_inventory│
                  │    │ latitude/lng     │  │    │──────────────────│
                  │    │ phone            │  ├───▶│ pharmacy_id (FK) │
                  │    │ license_number   │  │    │ medicine_id (FK) │
                  │    └──────────────────┘  │    │ quantity         │
                  │                          │    │ price            │
                  │    ┌──────────────────┐  │    │ expiry_date      │
                  ├───▶│  prescriptions   │  │    └──────────────────┘
                  │    │──────────────────│  │
                  │    │ id (PK)          │  │    ┌──────────────────┐
                  │    │ user_id (FK)     │  │    │  reservations    │
                  │    │ image_url        │  │    │──────────────────│
                  │    │ raw_text         │  │    │ pharmacy_id (FK) │
                  │    │ detected_meds    │  │    │ medicine_id (FK) │
                  │    └──────────────────┘  │    │ user_id (FK)     │
                  │                          │    │ quantity          │
                  │    ┌──────────────────┐  │    │ pickup_by        │
                  ├───▶│   reminders      │  │    └──────────────────┘
                  │    │──────────────────│  │
                  │    │ id (PK)          │  │    ┌──────────────────┐
                  │    │ user_id (FK)     │  │    │medicine_verific. │
                  │    │ medicine_id (FK) │  │    │──────────────────│
                  │    │ frequency        │──┘    │ code             │
                  │    │ times            │       │ code_type        │
                  │    │ start/end        │       │ is_authentic     │
                  │    └──────────────────┘       │ user_id (FK)     │
                  │                               └──────────────────┘
                  │    ┌──────────────────┐
                  │    │ symptom_sessions │  ◄── 💎 PREMIUM ONLY
                  ├───▶│──────────────────│
                  │    │ id (PK)          │       ┌──────────────────┐
                  │    │ user_id (FK)     │──────▶│  predictions     │
                  │    │ input_text       │       │──────────────────│
                  │    │ parsed_symptoms  │       │ session_id (FK)  │
                  │    │ risk_level       │       │ disease          │
                  │    │ model_version    │       │ confidence       │
                  │    └──────────────────┘       └──────────────────┘
                  │
                  │    ┌──────────────────┐
                  └───▶│   audit_logs     │
                       │──────────────────│
                       │ user_id          │
                       │ action           │
                       │ endpoint         │
                       │ created_at       │
                       └──────────────────┘
```

---

## Complete SQL Schema

### 1. Users & Authentication

```sql
-- Users table
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    role            VARCHAR(20) DEFAULT 'patient'
                    CHECK (role IN ('patient', 'pharmacy_owner', 'admin')),
    is_active       BOOLEAN DEFAULT TRUE,
    is_verified     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Medical profiles (optional health data)
CREATE TABLE medical_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth   DATE,
    gender          VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    blood_group     VARCHAR(5),
    known_conditions JSONB DEFAULT '[]',    -- ["hypertension", "diabetes"]
    current_medications JSONB DEFAULT '[]', -- ["metformin 500mg", "amlodipine 5mg"]
    allergies       JSONB DEFAULT '[]',     -- ["penicillin", "sulfa"]
    location_lat    DECIMAL(10, 8),
    location_lng    DECIMAL(11, 8),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    tier            VARCHAR(20) NOT NULL DEFAULT 'free'
                    CHECK (tier IN ('free', 'premium', 'pharmacy')),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'cancelled', 'expired', 'trialing')),
    payment_provider VARCHAR(20),          -- razorpay, stripe
    payment_id      VARCHAR(255),          -- external payment reference
    plan_duration   VARCHAR(20) DEFAULT 'monthly'
                    CHECK (plan_duration IN ('monthly', 'yearly')),
    amount          DECIMAL(10, 2),
    currency        VARCHAR(3) DEFAULT 'INR',
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    auto_renew      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires ON subscriptions(expires_at);
```

### 2. Medicines & Drug Data

```sql
-- Medicines master table
CREATE TABLE medicines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(500) NOT NULL,
    generic_name    VARCHAR(255),
    brand           VARCHAR(255),
    manufacturer    VARCHAR(255),
    composition     JSONB NOT NULL,       -- [{"ingredient": "Paracetamol", "strength": "500mg"}]
    dosage_form     VARCHAR(50),          -- tablet, capsule, syrup, injection, etc.
    dosage_instructions JSONB,            -- {"adults": "...", "children": "..."}
    side_effects    JSONB DEFAULT '{}',   -- {"common": [...], "rare": [...]}
    contraindications JSONB DEFAULT '[]',
    storage_info    TEXT,
    price_mrp       DECIMAL(10, 2),
    pack_size       VARCHAR(50),          -- "15 tablets"
    currency        VARCHAR(3) DEFAULT 'INR',
    prescription_required BOOLEAN DEFAULT FALSE,
    category        VARCHAR(100),         -- analgesic, antibiotic, etc.
    atc_code        VARCHAR(20),          -- WHO ATC classification
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_medicines_name ON medicines USING GIN (to_tsvector('english', name));
CREATE INDEX idx_medicines_generic ON medicines(generic_name);
CREATE INDEX idx_medicines_brand ON medicines(brand);
CREATE INDEX idx_medicines_category ON medicines(category);
CREATE INDEX idx_medicines_composition ON medicines USING GIN (composition);

-- Generic medicine mappings (brand ↔ generic alternatives)
CREATE TABLE generic_mappings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
    generic_medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
    composition_match_percent DECIMAL(5, 2) DEFAULT 100.00,
    price_savings_percent DECIMAL(5, 2),
    UNIQUE (brand_medicine_id, generic_medicine_id)
);

CREATE INDEX idx_generic_brand ON generic_mappings(brand_medicine_id);
CREATE INDEX idx_generic_generic ON generic_mappings(generic_medicine_id);

-- Drug interaction database
CREATE TABLE drug_interactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_a_id   UUID REFERENCES medicines(id) ON DELETE CASCADE,
    medicine_b_id   UUID REFERENCES medicines(id) ON DELETE CASCADE,
    severity        VARCHAR(20) NOT NULL
                    CHECK (severity IN ('minor', 'moderate', 'major', 'contraindicated')),
    description     TEXT NOT NULL,
    mechanism       TEXT,
    recommendation  TEXT NOT NULL,
    source          VARCHAR(100),         -- "DrugBank", "OpenFDA", "RxNorm"
    evidence_level  VARCHAR(20),          -- "established", "theoretical", "case_report"
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (medicine_a_id, medicine_b_id)
);

CREATE INDEX idx_interactions_a ON drug_interactions(medicine_a_id);
CREATE INDEX idx_interactions_b ON drug_interactions(medicine_b_id);
CREATE INDEX idx_interactions_severity ON drug_interactions(severity);

-- Medicine authenticity / verification records
CREATE TABLE medicine_verifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    code            VARCHAR(255) NOT NULL,
    code_type       VARCHAR(20) CHECK (code_type IN ('barcode', 'qr_code')),
    is_authentic    BOOLEAN NOT NULL,
    medicine_name   VARCHAR(255),
    manufacturer    VARCHAR(255),
    batch_number    VARCHAR(100),
    manufacturing_date DATE,
    expiry_date     DATE,
    verification_source VARCHAR(100),     -- "manufacturer_api", "local_db"
    scan_image_url  TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verifications_user ON medicine_verifications(user_id);
CREATE INDEX idx_verifications_code ON medicine_verifications(code);
CREATE INDEX idx_verifications_auth ON medicine_verifications(is_authentic);
```

### 3. Pharmacies & Inventory

```sql
-- Pharmacies
CREATE TABLE pharmacies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    name            VARCHAR(500) NOT NULL,
    license_number  VARCHAR(100) UNIQUE,
    address         TEXT NOT NULL,
    city            VARCHAR(100),
    state           VARCHAR(100),
    pincode         VARCHAR(10),
    phone           VARCHAR(20),
    email           VARCHAR(255),
    website         TEXT,
    latitude        DECIMAL(10, 8) NOT NULL,
    longitude       DECIMAL(11, 8) NOT NULL,
    rating          DECIMAL(2, 1),
    total_reviews   INTEGER DEFAULT 0,
    is_open_24hrs   BOOLEAN DEFAULT FALSE,
    operating_hours JSONB DEFAULT '{}',   -- {"mon": {"open": "08:00", "close": "22:00"}}
    is_verified     BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    google_place_id VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- PostGIS spatial index for geo-queries
CREATE INDEX idx_pharmacies_location ON pharmacies USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);
CREATE INDEX idx_pharmacies_city ON pharmacies(city);
CREATE INDEX idx_pharmacies_active ON pharmacies(is_active);

-- Pharmacy inventory (real-time stock)
CREATE TABLE pharmacy_inventory (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id     UUID REFERENCES pharmacies(id) ON DELETE CASCADE NOT NULL,
    medicine_id     UUID REFERENCES medicines(id) ON DELETE CASCADE NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 0,
    price           DECIMAL(10, 2),       -- pharmacy-specific price
    expiry_date     DATE,
    batch_number    VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'in_stock'
                    CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
    last_updated    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (pharmacy_id, medicine_id, batch_number)
);

CREATE INDEX idx_inventory_pharmacy ON pharmacy_inventory(pharmacy_id);
CREATE INDEX idx_inventory_medicine ON pharmacy_inventory(medicine_id);
CREATE INDEX idx_inventory_status ON pharmacy_inventory(status);

-- Pharmacy network connections
CREATE TABLE pharmacy_network (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_a_id   UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    pharmacy_b_id   UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'connected', 'rejected')),
    connected_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (pharmacy_a_id, pharmacy_b_id)
);

-- Medicine transfers between pharmacies
CREATE TABLE medicine_transfers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
    to_pharmacy_id  UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
    medicine_id     UUID REFERENCES medicines(id) ON DELETE SET NULL,
    quantity        INTEGER NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'in_transit', 'completed', 'rejected')),
    reason          VARCHAR(50),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- Medicine reservations
CREATE TABLE reservations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    pharmacy_id     UUID REFERENCES pharmacies(id) ON DELETE CASCADE NOT NULL,
    medicine_id     UUID REFERENCES medicines(id) ON DELETE CASCADE NOT NULL,
    quantity        INTEGER NOT NULL,
    total_price     DECIMAL(10, 2),
    confirmation_code VARCHAR(20) NOT NULL,
    status          VARCHAR(20) DEFAULT 'confirmed'
                    CHECK (status IN ('confirmed', 'picked_up', 'cancelled', 'expired')),
    pickup_by       TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_pharmacy ON reservations(pharmacy_id);
CREATE INDEX idx_reservations_status ON reservations(status);
```

### 4. Prescriptions & OCR

```sql
CREATE TABLE prescriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    image_url       TEXT NOT NULL,
    raw_text        TEXT,                  -- OCR extracted text
    ocr_confidence  DECIMAL(3, 2),
    detected_medicines JSONB DEFAULT '[]', -- [{extracted_name, matched_id, dosage, duration}]
    ocr_provider    VARCHAR(20),           -- "tesseract", "google_vision"
    status          VARCHAR(20) DEFAULT 'processed'
                    CHECK (status IN ('uploading', 'processing', 'processed', 'failed')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prescriptions_user ON prescriptions(user_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
```

### 5. Medicine Reminders

```sql
CREATE TABLE reminders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    medicine_id     UUID REFERENCES medicines(id) ON DELETE SET NULL,
    medicine_name   VARCHAR(255) NOT NULL,
    dosage          VARCHAR(100),          -- "1 tablet"
    frequency       VARCHAR(30)            -- "once_daily", "twice_daily", "3_times_daily"
                    CHECK (frequency IN ('once_daily', 'twice_daily', '3_times_daily',
                                         '4_times_daily', 'every_other_day', 'weekly', 'custom')),
    times           JSONB NOT NULL,        -- ["08:00", "14:00", "20:00"]
    instructions    TEXT,                  -- "Take after food"
    start_date      DATE NOT NULL,
    end_date        DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    notification_channels JSONB DEFAULT '["push"]', -- ["push", "sms", "email"]
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_active ON reminders(is_active);

-- Reminder dose log (track adherence)
CREATE TABLE reminder_doses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id     UUID REFERENCES reminders(id) ON DELETE CASCADE NOT NULL,
    scheduled_at    TIMESTAMPTZ NOT NULL,
    taken_at        TIMESTAMPTZ,
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'taken', 'missed', 'skipped')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doses_reminder ON reminder_doses(reminder_id);
CREATE INDEX idx_doses_scheduled ON reminder_doses(scheduled_at);
CREATE INDEX idx_doses_status ON reminder_doses(status);
```

### 6. AI Symptom Checker (💎 Premium Tables)

```sql
-- Symptom analysis sessions (PREMIUM ONLY)
CREATE TABLE symptom_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    request_id      VARCHAR(50) UNIQUE NOT NULL,
    input_text      TEXT NOT NULL,
    input_type      VARCHAR(10) CHECK (input_type IN ('text', 'voice')) DEFAULT 'text',
    voice_file_url  TEXT,
    transcription   TEXT,
    transcription_confidence DECIMAL(3, 2),
    parsed_symptoms JSONB NOT NULL DEFAULT '[]',
    risk_level      VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'emergency')),
    risk_recommendation TEXT,
    model_version   VARCHAR(50),
    llm_used        BOOLEAN DEFAULT FALSE,
    processing_time_ms INTEGER,
    user_age        INTEGER,
    user_gender     VARCHAR(20),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON symptom_sessions(user_id);
CREATE INDEX idx_sessions_request ON symptom_sessions(request_id);
CREATE INDEX idx_sessions_risk ON symptom_sessions(risk_level);

-- Disease predictions
CREATE TABLE predictions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID REFERENCES symptom_sessions(id) ON DELETE CASCADE NOT NULL,
    disease_name    VARCHAR(255) NOT NULL,
    icd_code        VARCHAR(20),
    confidence      DECIMAL(4, 3) CHECK (confidence >= 0 AND confidence <= 1),
    rank            INTEGER NOT NULL,
    description     TEXT,
    specialist_type VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_predictions_session ON predictions(session_id);

-- First aid knowledge base
CREATE TABLE first_aid_kb (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_name  VARCHAR(255) NOT NULL,
    icd_code        VARCHAR(20),
    immediate_actions JSONB NOT NULL,
    things_to_avoid JSONB NOT NULL,
    emergency_signs JSONB NOT NULL,
    source          TEXT,
    verified_by     VARCHAR(255),
    last_reviewed   DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_first_aid_condition ON first_aid_kb(condition_name);

-- Hospitals cache (for premium hospital finder)
CREATE TABLE hospitals_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_place_id VARCHAR(255) UNIQUE,
    name            VARCHAR(500) NOT NULL,
    type            VARCHAR(50) DEFAULT 'hospital',
    address         TEXT,
    phone           VARCHAR(50),
    latitude        DECIMAL(10, 8) NOT NULL,
    longitude       DECIMAL(11, 8) NOT NULL,
    rating          DECIMAL(2, 1),
    has_emergency   BOOLEAN DEFAULT FALSE,
    specialties     JSONB DEFAULT '[]',
    operating_hours JSONB DEFAULT '{}',
    cached_at       TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX idx_hospitals_location ON hospitals_cache USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);
```

### 7. Analytics & Demand Prediction

```sql
-- Medicine demand tracking (for demand prediction)
CREATE TABLE demand_tracking (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id     UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    medicine_id     UUID REFERENCES medicines(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    units_sold      INTEGER DEFAULT 0,
    units_searched  INTEGER DEFAULT 0,    -- search demand signal
    units_reserved  INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (pharmacy_id, medicine_id, date)
);

CREATE INDEX idx_demand_pharmacy ON demand_tracking(pharmacy_id);
CREATE INDEX idx_demand_medicine ON demand_tracking(medicine_id);
CREATE INDEX idx_demand_date ON demand_tracking(date);
```

### 8. Shared Tables

```sql
-- Feedback (for symptom checker and general)
CREATE TABLE feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    feature         VARCHAR(50) NOT NULL,  -- "symptom_checker", "medicine_search", etc.
    reference_id    UUID,                  -- session_id, prescription_id, etc.
    rating          INTEGER CHECK (rating >= 1 AND rating <= 5),
    was_helpful     BOOLEAN,
    comments        TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID,
    action          VARCHAR(100) NOT NULL,
    endpoint        VARCHAR(255) NOT NULL,
    method          VARCHAR(10) NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    request_body    JSONB,
    response_code   INTEGER,
    processing_ms   INTEGER,
    subscription_tier VARCHAR(20),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
```

---

## Redis Cache Strategy

```
Key Pattern                                  TTL        Purpose
──────────────────────────────────────────────────────────────────────
user:session:{user_id}                       30m       Active session / JWT data
user:subscription:{user_id}                  1h        Cached subscription tier
rate_limit:{user_id}:{endpoint}              1m        Rate limiting counter

medicine:search:{query_hash}                 6h        Medicine search cache
medicine:detail:{medicine_id}                24h       Medicine detail cache
medicine:generics:{medicine_id}              24h       Generic alternatives cache
medicine:interactions:{med_a}:{med_b}        7d        Interaction result cache

pharmacy:nearby:{lat}:{lng}:{radius}         30m       Pharmacy geo-query cache
pharmacy:stock:{pharmacy_id}:{medicine_id}   5m        Real-time stock cache
pharmacy:inventory:{pharmacy_id}             15m       Full inventory cache

reminder:schedule:{user_id}                  12h       User's upcoming reminders
reminder:next:{reminder_id}                  varies    Next dose trigger

hospital:nearby:{lat}:{lng}:{radius}         1h        Hospital search cache
prediction:cache:{symptom_hash}              24h       Symptom prediction cache

demand:daily:{pharmacy_id}                   24h       Daily demand aggregation
```

---

## Elasticsearch Index (Medicine Search)

```json
{
  "mappings": {
    "properties": {
      "name":          { "type": "text", "analyzer": "medicine_analyzer" },
      "generic_name":  { "type": "text", "analyzer": "medicine_analyzer" },
      "brand":         { "type": "keyword" },
      "manufacturer":  { "type": "text" },
      "composition":   { "type": "nested" },
      "dosage_form":   { "type": "keyword" },
      "category":      { "type": "keyword" },
      "price_mrp":     { "type": "float" },
      "prescription_required": { "type": "boolean" },
      "suggest":       { "type": "completion" }
    }
  },
  "settings": {
    "analysis": {
      "analyzer": {
        "medicine_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "medicine_synonyms", "edge_ngram_filter"]
        }
      }
    }
  }
}
```

---

## Migration Strategy

1. **Alembic** for schema versioning (auto-generated migrations)
2. **Seed scripts** for:
   - Medicine database (~10K+ medicines from OpenFDA / Indian drug registry)
   - Drug interaction database (~5K pairs from DrugBank/RxNorm)
   - First aid knowledge base (~100 conditions)
3. **Blue-green deployment** for zero-downtime migrations
4. **Backup**: Automated daily `pg_dump` → S3, 30-day retention
5. **Partitioning**: `audit_logs` and `demand_tracking` partitioned by month
