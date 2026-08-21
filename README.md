# Smart-Medicine-Hub

AI-powered medicine search, drug safety checks, symptom analysis, pharmacy locator, and medicine reminders — built for the Indian healthcare ecosystem.

## Features

| Feature | Tier | Description |
|---------|------|-------------|
| **Medicine Search** | Free | Search 100k+ medicines with generic alternatives & price comparison |
| **Drug Interaction Check** | Free | Check interactions between multiple medications |
| **Pharmacy Locator** | Free | Find nearby pharmacies with real-time stock & reservations |
| **Medicine Reminders** | Free (3) / Premium (∞) | Smart dose reminders with adherence tracking |
| **Prescription OCR** | Free | Scan prescriptions and extract medicine info |
| **Medicine Verification** | Free | Verify authenticity via barcode/QR |
| **AI Symptom Analysis** | Premium | ML-powered symptom → disease prediction with risk assessment |
| **Hospital Finder** | Premium | Find nearby hospitals with specialist routing |
| **Demand Analytics** | Pharmacy B2B | Demand forecasting & stock optimization |

## Tech Stack

### Backend
- **FastAPI** (Python 3.12) — async REST API
- **SQLAlchemy 2.0** + asyncpg — async PostgreSQL ORM
- **Alembic** — database migrations
- **Redis** — caching, rate limiting, task queue
- **Elasticsearch** — medicine full-text search
- **Celery** — background tasks (reminders, notifications)

### Frontend
- **Next.js 14** (App Router) — React framework
- **TypeScript** — type safety
- **Tailwind CSS** — utility-first styling
- **Zustand** — lightweight state management

### ML/AI
- **XGBoost** — symptom classification
- **spaCy** — prescription NER
- **Tesseract OCR** — prescription scanning
- **OpenAI GPT** — LLM-assisted analysis

### Infrastructure
- **Docker Compose** — local development
- **PostgreSQL 15** + PostGIS — spatial queries
- **Nginx** — reverse proxy + rate limiting
- **GitHub Actions** — CI/CD

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for frontend dev)
- Python 3.12+ (for backend dev)

### 1. Clone & Configure

```bash
git clone <repo-url>
cd openHackathon
cp .env.example .env
# Edit .env with your API keys
```

### 2. Start with Docker Compose

```bash
docker compose up -d
```

This starts:
- **API** at http://localhost:8000 (Swagger docs at /docs)
- **Frontend** at http://localhost:3000
- **PostgreSQL** at localhost:5432
- **Redis** at localhost:6379
- **Elasticsearch** at localhost:9200
- **Nginx** at http://localhost:80

### 3. Run Migrations & Seed Data

```bash
make migrate
make seed
```

### 4. Access the Application

- **Web App**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Project Structure

```
openHackathon/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/v1/         # API route handlers
│   │   ├── core/           # Security, permissions, middleware
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── services/       # Business logic layer
│   │   ├── seeds/          # Database seed scripts
│   │   ├── config.py       # Application configuration
│   │   ├── dependencies.py # FastAPI dependencies
│   │   └── main.py         # Application entry point
│   ├── alembic/            # Database migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # Next.js application
│   ├── src/
│   │   ├── app/            # App Router pages
│   │   ├── components/     # React components
│   │   ├── lib/            # Utilities & API client
│   │   ├── store/          # Zustand state stores
│   │   └── types/          # TypeScript type definitions
│   ├── Dockerfile
│   └── package.json
├── ml/                      # ML training pipelines
│   ├── training/           # Training scripts
│   ├── evaluation/         # Model evaluation
│   ├── config/             # Training configs
│   └── models/             # Saved model artifacts
├── infra/                   # Infrastructure configs
│   └── nginx/              # Nginx reverse proxy
├── docs/                    # Architecture documentation
├── docker-compose.yml
├── Makefile
└── .env.example
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Register new user | - |
| POST | `/api/v1/auth/login` | Login | - |
| GET | `/api/v1/medicines/search` | Search medicines | - |
| GET | `/api/v1/medicines/:id` | Medicine detail | - |
| GET | `/api/v1/medicines/:id/generics` | Generic alternatives | - |
| POST | `/api/v1/safety/interactions` | Check drug interactions | - |
| POST | `/api/v1/safety/verify` | Verify medicine authenticity | JWT |
| GET | `/api/v1/pharmacies/nearby` | Find nearby pharmacies | - |
| POST | `/api/v1/pharmacies/:id/reserve` | Reserve medicine | JWT |
| POST | `/api/v1/prescriptions/scan` | Scan prescription (OCR) | JWT |
| POST | `/api/v1/symptoms/analyze` | AI symptom analysis | Premium |
| GET | `/api/v1/hospitals/nearby` | Find nearby hospitals | Premium |
| CRUD | `/api/v1/reminders` | Manage reminders | JWT |
| GET | `/api/v1/subscriptions/status` | Subscription status | JWT |
| POST | `/api/v1/subscriptions/upgrade` | Upgrade to premium | JWT |
| GET | `/api/v1/analytics/demand/:id` | Demand analytics | Pharmacy |

## Subscription Tiers

| Tier | Price | Key Features |
|------|-------|-------------|
| **Free** | ₹0 | Medicine search, interactions, 3 reminders, pharmacy locator |
| **Premium** | ₹99/mo | AI symptoms, hospital finder, unlimited reminders, priority support |
| **Pharmacy B2B** | ₹499/mo | Demand analytics, network transfers, inventory management |

## Development

```bash
# Backend development (hot-reload)
make up
make logs-api

# Frontend development
make fe-install
make fe-dev

# Run tests
make test

# Lint code
make lint
```

## License

MIT
