"""Application configuration from environment variables."""

from pydantic_settings import BaseSettings
from pydantic import Field, computed_field
from functools import lru_cache


class Settings(BaseSettings):
    # === Application ===
    APP_NAME: str = "SmartMedicine"
    ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production"

    # === Database ===
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/smartmedicine"
    DB_POOL_SIZE: int = 20
    DB_ECHO: bool = False

    # === Redis ===
    REDIS_URL: str = "redis://redis:6379/0"

    # === Elasticsearch ===
    ELASTICSEARCH_URL: str = "http://elasticsearch:9200"

    # === Auth / JWT ===
    JWT_SECRET_KEY: str = "jwt-super-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # === AI / ML ===
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4"
    ML_MODEL_PATH: str = "./ml/models/symptom_classifier_v1.joblib"
    ML_CONFIDENCE_THRESHOLD: float = 0.70

    # === Google APIs ===
    GOOGLE_MAPS_API_KEY: str = ""
    GOOGLE_VISION_API_KEY: str = ""

    # === Payments ===
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    PREMIUM_MONTHLY_PRICE_INR: int = 99
    PHARMACY_MONTHLY_PRICE_INR: int = 499

    # === OCR ===
    OCR_PROVIDER: str = "tesseract"
    TESSERACT_PATH: str = "/usr/bin/tesseract"

    # === Notifications ===
    FIREBASE_CREDENTIALS_PATH: str = ""
    SENDGRID_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""

    # === Rate Limiting ===
    RATE_LIMIT_DEFAULT: str = "30/minute"
    RATE_LIMIT_PREDICT: str = "5/minute"

    # === Monitoring ===
    SENTRY_DSN: str = ""
    LOG_LEVEL: str = "INFO"

    # === CORS ===
    CORS_ORIGINS: str = ""

    @computed_field  # type: ignore[misc]
    @property
    def ENVIRONMENT(self) -> str:
        return self.ENV

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
