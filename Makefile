.PHONY: help up down build logs migrate seed test lint

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ----- Docker -----
up: ## Start all services
	docker compose up -d

down: ## Stop all services
	docker compose down

build: ## Rebuild all images
	docker compose build --no-cache

logs: ## Tail logs from all services
	docker compose logs -f

logs-api: ## Tail FastAPI logs
	docker compose logs -f api

logs-node: ## Tail Node.js Express API logs
	docker compose logs -f node-api

logs-worker: ## Tail Celery worker logs
	docker compose logs -f worker

# ----- Database -----
migrate: ## Run Alembic migrations (FastAPI)
	docker compose exec api alembic upgrade head

migrate-create: ## Create new migration (usage: make migrate-create MSG="add users table")
	docker compose exec api alembic revision --autogenerate -m "$(MSG)"

seed: ## Seed the database
	docker compose exec api python -m app.seeds.seed_data

db-push: ## Push Drizzle schema to DB (Node.js backend)
	cd backend && npx drizzle-kit push

# ----- Development -----
shell: ## Open Python shell in API container
	docker compose exec api python

psql: ## Open psql shell
	docker compose exec db psql -U postgres -d smartmedicine

redis-cli: ## Open redis-cli
	docker compose exec redis redis-cli

# ----- Testing -----
test: ## Run backend tests
	docker compose exec api pytest -v --cov=app

lint: ## Lint backend code
	docker compose exec api ruff check app/

format: ## Format backend code
	docker compose exec api ruff format app/

# ----- Frontend (Vite React) -----
fe-dev: ## Start frontend dev server locally
	cd frontend && npm run dev

fe-install: ## Install frontend dependencies
	cd frontend && npm install

fe-build: ## Build frontend for production
	cd frontend && npm run build

# ----- Backend (Node.js Express) -----
be-dev: ## Start Node.js backend dev server locally
	cd backend && npm run dev

be-install: ## Install Node.js backend dependencies
	cd backend && npm install

be-build: ## Build Node.js backend for production
	cd backend && npm run build

# ----- Full Stack Dev -----
dev: ## Start both frontend and backend in development
	@echo "Start backend: cd backend && npm run dev"
	@echo "Start frontend: cd frontend && npm run dev"
	@echo "Run these in separate terminals"
