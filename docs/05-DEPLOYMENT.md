# Deployment, DevOps & Project Structure — Smart Medicine Platform

## 1. Complete Project Directory Structure

```
openHackathon/
│
├── docs/                                  # Architecture & planning docs
│   ├── 01-ARCHITECTURE.md
│   ├── 02-API-DESIGN.md
│   ├── 03-DATABASE-SCHEMA.md
│   ├── 04-ML-PIPELINE.md
│   ├── 05-DEPLOYMENT.md
│   └── 06-IMPLEMENTATION-ROADMAP.md
│
├── backend/                               # FastAPI backend (monolith)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                        # FastAPI app entry + lifespan
│   │   ├── config.py                      # Settings from env vars
│   │   ├── dependencies.py                # Shared dependencies
│   │   │
│   │   ├── api/                           # API route layer
│   │   │   ├── __init__.py
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── router.py              # Aggregate v1 router
│   │   │   │   ├── auth.py                # Auth + subscription endpoints
│   │   │   │   ├── medicines.py           # Medicine search + details
│   │   │   │   ├── pharmacies.py          # Pharmacy locator + stock
│   │   │   │   ├── prescriptions.py       # OCR prescription scanner
│   │   │   │   ├── safety.py              # Drug interactions + authenticity
│   │   │   │   ├── symptoms.py            # 💎 AI Symptom Checker (premium)
│   │   │   │   ├── hospitals.py           # 💎 Hospital finder (premium)
│   │   │   │   ├── reminders.py           # Medicine reminders
│   │   │   │   ├── emergency.py           # Emergency medicine finder
│   │   │   │   ├── pharmacy_portal.py     # B2B pharmacy dashboard
│   │   │   │   ├── analytics.py           # B2B demand prediction
│   │   │   │   ├── subscription.py        # Upgrade/manage subscription
│   │   │   │   └── feedback.py            # User feedback
│   │   │   └── health.py                 # Health check endpoint
│   │   │
│   │   ├── core/                          # Cross-cutting concerns
│   │   │   ├── __init__.py
│   │   │   ├── security.py                # JWT, hashing, auth helpers
│   │   │   ├── middleware.py              # CORS, logging, rate limit
│   │   │   ├── permissions.py             # Tier-based access (Free/Premium/Pharmacy)
│   │   │   ├── exceptions.py             # Custom exception handlers
│   │   │   └── constants.py              # App-wide constants
│   │   │
│   │   ├── models/                        # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── user.py                    # User + MedicalProfile
│   │   │   ├── subscription.py            # Subscription tiers
│   │   │   ├── medicine.py                # Medicine + GenericMapping
│   │   │   ├── pharmacy.py                # Pharmacy + Inventory + Network
│   │   │   ├── prescription.py            # Prescription OCR results
│   │   │   ├── interaction.py             # Drug interactions
│   │   │   ├── verification.py            # Medicine authenticity
│   │   │   ├── reminder.py                # Reminders + DoseLog
│   │   │   ├── reservation.py             # Medicine reservations
│   │   │   ├── symptom_session.py         # 💎 Symptom analysis sessions
│   │   │   ├── prediction.py              # 💎 Disease predictions
│   │   │   ├── hospital.py                # 💎 Hospital cache
│   │   │   ├── feedback.py                # Feedback
│   │   │   ├── demand_tracking.py         # Demand analytics
│   │   │   └── audit_log.py               # Audit trail
│   │   │
│   │   ├── schemas/                       # Pydantic request/response
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── medicine.py
│   │   │   ├── pharmacy.py
│   │   │   ├── prescription.py
│   │   │   ├── safety.py
│   │   │   ├── symptom.py
│   │   │   ├── hospital.py
│   │   │   ├── reminder.py
│   │   │   ├── subscription.py
│   │   │   ├── analytics.py
│   │   │   └── common.py                 # Shared schemas (pagination, errors)
│   │   │
│   │   ├── services/                      # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py            # Registration, login, JWT
│   │   │   ├── subscription_service.py    # Tier management, payments
│   │   │   ├── medicine_service.py        # Search, details, generics
│   │   │   ├── pharmacy_service.py        # Locator, stock, reservations
│   │   │   ├── prescription_service.py    # OCR orchestration
│   │   │   ├── interaction_service.py     # Drug interaction checks
│   │   │   ├── verification_service.py    # QR/barcode authenticity
│   │   │   ├── symptom_service.py         # 💎 Symptom analysis orchestrator
│   │   │   ├── prediction_service.py      # 💎 ML + LLM prediction
│   │   │   ├── hospital_service.py        # 💎 Google Maps hospital finder
│   │   │   ├── first_aid_service.py       # 💎 First aid KB
│   │   │   ├── voice_service.py           # 💎 Speech-to-text
│   │   │   ├── reminder_service.py        # Reminders + scheduling
│   │   │   ├── emergency_service.py       # Emergency medicine locator
│   │   │   ├── analytics_service.py       # Demand prediction
│   │   │   └── notification_service.py    # Push/email/SMS dispatch
│   │   │
│   │   ├── ml/                            # ML model integration
│   │   │   ├── __init__.py
│   │   │   ├── model_loader.py            # Load & cache ML models
│   │   │   ├── symptom_predictor.py       # Disease prediction logic
│   │   │   ├── nlp_processor.py           # Symptom NLP extraction
│   │   │   ├── risk_classifier.py         # Risk level rules
│   │   │   ├── hybrid_router.py           # ML ↔ LLM routing
│   │   │   ├── llm_client.py              # OpenAI/Gemini API wrapper
│   │   │   ├── ocr_engine.py              # Tesseract + Vision API
│   │   │   ├── medicine_matcher.py        # Fuzzy medicine name matching
│   │   │   └── demand_predictor.py        # Time series demand model
│   │   │
│   │   └── db/                            # Database layer
│   │       ├── __init__.py
│   │       ├── session.py                 # Async DB session management
│   │       ├── base.py                    # Declarative base
│   │       ├── seed_medicines.py          # Seed medicine data
│   │       ├── seed_interactions.py       # Seed drug interactions
│   │       └── seed_first_aid.py          # Seed first aid KB
│   │
│   ├── alembic/                           # Database migrations
│   │   ├── versions/
│   │   ├── env.py
│   │   └── alembic.ini
│   │
│   ├── tests/                             # Backend tests
│   │   ├── __init__.py
│   │   ├── conftest.py                    # Fixtures, test DB
│   │   ├── test_auth.py
│   │   ├── test_medicines.py
│   │   ├── test_pharmacies.py
│   │   ├── test_prescriptions.py
│   │   ├── test_interactions.py
│   │   ├── test_symptoms.py               # Premium gate tests
│   │   ├── test_reminders.py
│   │   ├── test_subscription.py           # Tier enforcement tests
│   │   └── test_ml_predictor.py
│   │
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── Dockerfile
│   └── pyproject.toml
│
├── ml/                                    # ML training pipeline
│   ├── data/
│   │   ├── raw/                           # Original datasets
│   │   ├── processed/                     # Cleaned
│   │   └── augmented/
│   ├── models/                            # Trained model artifacts
│   │   └── .gitkeep
│   ├── notebooks/
│   │   ├── 01_data_exploration.ipynb
│   │   ├── 02_preprocessing.ipynb
│   │   ├── 03_symptom_model_training.ipynb
│   │   ├── 04_evaluation.ipynb
│   │   └── 05_demand_prediction.ipynb
│   ├── src/
│   │   ├── data_pipeline.py
│   │   ├── feature_engineering.py
│   │   ├── train_symptom_model.py
│   │   ├── train_demand_model.py
│   │   ├── evaluate.py
│   │   └── export_onnx.py
│   └── requirements.txt
│
├── frontend/                              # Next.js frontend
│   ├── public/
│   │   ├── icons/
│   │   └── manifest.json                  # PWA manifest
│   ├── src/
│   │   ├── app/                           # Next.js App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                   # Landing page
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── dashboard/page.tsx         # User dashboard
│   │   │   ├── medicines/
│   │   │   │   ├── page.tsx               # Medicine search
│   │   │   │   └── [id]/page.tsx          # Medicine details
│   │   │   ├── pharmacies/
│   │   │   │   ├── page.tsx               # Pharmacy map
│   │   │   │   └── [id]/page.tsx          # Pharmacy details
│   │   │   ├── prescriptions/
│   │   │   │   ├── page.tsx               # Upload & history
│   │   │   │   └── [id]/page.tsx          # Scan result
│   │   │   ├── safety/
│   │   │   │   ├── interactions/page.tsx  # Drug interaction checker
│   │   │   │   └── verify/page.tsx        # QR/barcode scanner
│   │   │   ├── reminders/page.tsx         # Medicine reminders
│   │   │   ├── emergency/page.tsx         # Emergency finder
│   │   │   ├── symptom-checker/           # 💎 PREMIUM
│   │   │   │   ├── page.tsx               # Symptom input
│   │   │   │   └── results/page.tsx       # AI results + hospital map
│   │   │   ├── subscription/
│   │   │   │   ├── page.tsx               # Plans & pricing
│   │   │   │   └── manage/page.tsx        # Manage subscription
│   │   │   └── pharmacy-portal/           # B2B dashboard
│   │   │       ├── page.tsx               # Overview
│   │   │       ├── inventory/page.tsx     # Stock management
│   │   │       ├── network/page.tsx       # Pharmacy network
│   │   │       └── analytics/page.tsx     # Demand insights
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                        # Reusable (Button, Card, Badge, Modal...)
│   │   │   ├── layout/                    # Header, Sidebar, Footer, NavBar
│   │   │   ├── medicines/                 # MedicineCard, SearchBar, GenericBadge
│   │   │   ├── pharmacy/                  # PharmacyCard, PharmacyMap, StockBadge
│   │   │   ├── prescription/              # PrescriptionUploader, OCRResult
│   │   │   ├── safety/                    # InteractionChecker, QRScanner, VerifyBadge
│   │   │   ├── symptoms/                  # SymptomInput, VoiceRecorder (💎)
│   │   │   ├── results/                   # DiseaseCard, RiskBadge, FirstAid (💎)
│   │   │   ├── hospital/                  # HospitalMap, HospitalCard (💎)
│   │   │   ├── reminders/                 # ReminderCard, DoseTracker
│   │   │   ├── subscription/              # PricingTable, UpgradeModal, PremiumBadge
│   │   │   └── common/                    # DisclaimerBanner, EmptyState, LoadingSpinner
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useSubscription.ts         # Check tier, show upgrade prompts
│   │   │   ├── useMedicineSearch.ts
│   │   │   ├── usePharmacies.ts
│   │   │   ├── usePrescriptionScan.ts
│   │   │   ├── useInteractionCheck.ts
│   │   │   ├── useSymptomAnalysis.ts
│   │   │   ├── useVoiceInput.ts
│   │   │   ├── useHospitals.ts
│   │   │   ├── useReminders.ts
│   │   │   ├── useGeolocation.ts
│   │   │   └── useQRScanner.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts                     # API client (axios)
│   │   │   ├── auth.ts                    # Token management
│   │   │   ├── constants.ts
│   │   │   └── utils.ts
│   │   │
│   │   ├── store/                         # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   ├── subscriptionStore.ts
│   │   │   └── cartStore.ts               # Medicine selection "cart"
│   │   │
│   │   └── types/
│   │       ├── medicine.ts
│   │       ├── pharmacy.ts
│   │       ├── prescription.ts
│   │       ├── symptom.ts
│   │       ├── hospital.ts
│   │       ├── reminder.ts
│   │       ├── subscription.ts
│   │       └── user.ts
│   │
│   ├── tailwind.config.ts
│   ├── next.config.js
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── infra/                                 # Infrastructure & DevOps
│   ├── docker/
│   │   ├── docker-compose.yml             # Development
│   │   ├── docker-compose.prod.yml        # Production
│   │   └── nginx/
│   │       └── nginx.conf
│   ├── k8s/                               # Kubernetes (future)
│   │   ├── backend-deployment.yaml
│   │   ├── frontend-deployment.yaml
│   │   ├── ingress.yaml
│   │   └── secrets.yaml
│   └── scripts/
│       ├── seed_db.sh                     # Database seeding
│       ├── backup_db.sh                   # DB backup
│       └── deploy.sh                      # Deployment script
│
├── .github/
│   └── workflows/
│       ├── ci.yml                         # Test + lint
│       ├── cd-staging.yml
│       └── cd-production.yml
│
├── .env.example
├── .gitignore
├── README.md
├── LICENSE
└── Makefile
```

---

## 2. Docker Compose (Development)

```yaml
version: '3.9'

services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    volumes:
      - ./backend:/app
      - ./ml/models:/app/ml_models
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/smartmedicine
      - REDIS_URL=redis://redis:6379/0
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
      - RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET}
      - ML_MODEL_PATH=/app/ml_models/symptom_classifier_v1.joblib
      - ENV=development
    depends_on: [db, redis, elasticsearch]
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  celery_worker:
    build: ./backend
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/smartmedicine
      - REDIS_URL=redis://redis:6379/0
    depends_on: [db, redis]
    command: celery -A app.tasks worker --loglevel=info

  celery_beat:
    build: ./backend
    volumes:
      - ./backend:/app
    depends_on: [redis]
    command: celery -A app.tasks beat --loglevel=info

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
      - NEXT_PUBLIC_GOOGLE_MAPS_KEY=${GOOGLE_MAPS_API_KEY}
      - NEXT_PUBLIC_RAZORPAY_KEY=${RAZORPAY_KEY_ID}
    command: npm run dev

  db:
    image: postgis/postgis:15-3.4-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: smartmedicine
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes:
      - redis_data:/data

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    ports: ["9200:9200"]
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - es_data:/usr/share/elasticsearch/data

  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes:
      - ./infra/docker/nginx/nginx.conf:/etc/nginx/nginx.conf
    depends_on: [backend, frontend]

volumes:
  postgres_data:
  redis_data:
  es_data:
```

---

## 3. Environment Variables

```bash
# .env.example

# === Application ===
ENV=development
APP_NAME=SmartMedicine
SECRET_KEY=your-super-secret-key
DEBUG=true

# === Database ===
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/smartmedicine
DB_POOL_SIZE=20

# === Redis ===
REDIS_URL=redis://localhost:6379/0

# === Elasticsearch ===
ELASTICSEARCH_URL=http://localhost:9200

# === AI / ML ===
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
ML_MODEL_PATH=./ml/models/symptom_classifier_v1.joblib
ML_CONFIDENCE_THRESHOLD=0.70

# === Google APIs ===
GOOGLE_MAPS_API_KEY=AIza...
GOOGLE_VISION_API_KEY=AIza...

# === Payments (Subscription) ===
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
PREMIUM_MONTHLY_PRICE_INR=99
PHARMACY_MONTHLY_PRICE_INR=499

# === OCR ===
OCR_PROVIDER=tesseract          # tesseract | google_vision
TESSERACT_PATH=/usr/bin/tesseract

# === Auth ===
JWT_SECRET_KEY=jwt-secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# === Notifications ===
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
SENDGRID_API_KEY=SG...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...

# === Rate Limiting ===
RATE_LIMIT_DEFAULT=30/minute
RATE_LIMIT_PREDICT=5/minute

# === Monitoring ===
SENTRY_DSN=https://...
LOG_LEVEL=INFO
```

---

## 4. CI/CD Pipeline

### CI (on every PR)
```yaml
name: CI
on: [pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres: { image: "postgis/postgis:15-3.4-alpine", env: { POSTGRES_PASSWORD: test }}
      redis: { image: "redis:7-alpine" }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r backend/requirements-dev.txt
      - run: cd backend && pytest --cov=app --cov-report=xml
      - run: cd backend && ruff check . && mypy app/

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci && npm run lint && npm test && npm run build
```

### CD (on tag push)
Docker build → push to registry → deploy to VPS/cloud.

---

## 5. Production Architecture

### MVP (Single VPS — DigitalOcean/Hetzner)

```
┌─────────────────────────────────────────────────────┐
│          VPS (4 vCPU, 8GB RAM, 160GB SSD)           │
│                                                      │
│  ┌────────┐  ┌──────┐                               │
│  │ Nginx  │  │Certbot│  (SSL termination)            │
│  │ :80/443│  │      │                                │
│  └───┬────┘  └──────┘                                │
│      │                                               │
│  ┌───┴────┐ ┌────────┐ ┌──────┐ ┌─────┐ ┌────────┐ │
│  │Backend │ │Frontend│ │ PG + │ │Redis│ │ Elastic│ │
│  │ :8000  │ │ :3000  │ │PostGIS│ │:6379│ │ :9200  │ │
│  └────────┘ └────────┘ └──────┘ └─────┘ └────────┘ │
│                                                      │
│  ┌────────────┐  ┌──────────────┐                    │
│  │ Celery     │  │ Celery Beat  │                    │
│  │ Worker     │  │ (scheduler)  │                    │
│  └────────────┘  └──────────────┘                    │
└──────────────────────────────────────────────────────┘
```

**Estimated cost**: $24–48/month (DigitalOcean/Hetzner)

---

## 6. Monitoring & Observability

```
App ──▶ Prometheus ──▶ Grafana Dashboards
 │                         │
 ├── Logs ──▶ Loki ────────┘
 ├── Errors ──▶ Sentry
 └── ML Metrics ──▶ Custom dashboard
```

### Key Dashboards
- **API Health**: Request rate, latency p50/p95/p99, error rate by endpoint
- **Business**: DAU, searches/day, prescriptions scanned, premium conversions
- **ML**: Prediction confidence distribution, LLM fallback %, inference latency
- **Pharmacy**: Stock updates/day, reservations, network connections
- **Subscriptions**: Active premium users, churn rate, MRR

---

## 7. Backend Dependencies (requirements.txt)

```
# Web Framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Database
sqlalchemy[asyncio]==2.0.25
alembic==1.13.1
asyncpg==0.29.0
GeoAlchemy2==0.14.3

# Search
elasticsearch[async]==8.12.0

# Cache & Queue
redis==5.0.1
celery[redis]==5.3.6

# Auth
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# Validation
pydantic==2.5.3
pydantic-settings==2.1.0
email-validator==2.1.0

# ML & NLP
scikit-learn==1.4.0
xgboost==2.0.3
pandas==2.2.0
numpy==1.26.3
spacy==3.7.2

# LLM
openai==1.12.0

# OCR
pytesseract==0.3.10
Pillow==10.2.0
opencv-python-headless==4.9.0.80

# Maps & Location
googlemaps==4.10.0

# Payments
razorpay==1.4.1

# QR/Barcode
pyzbar==0.1.9

# Notifications
firebase-admin==6.4.0

# Monitoring
prometheus-fastapi-instrumentator==6.1.0
sentry-sdk[fastapi]==1.40.0
structlog==24.1.0

# Utils
httpx==0.26.0
python-dotenv==1.0.0
```

### Frontend Dependencies (key)
```
next, react, typescript, tailwindcss, axios,
zustand, @googlemaps/react-wrapper, lucide-react,
framer-motion, react-hot-toast, @zxing/library,
react-webcam
```
