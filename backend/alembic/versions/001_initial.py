"""Initial migration — all tables.

Revision ID: 001_initial
Revises:
Create Date: 2024-10-01 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---- users ----
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, index=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20)),
        sa.Column("role", sa.String(20), server_default="patient"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("is_verified", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ---- medical_profiles ----
    op.create_table(
        "medical_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True),
        sa.Column("date_of_birth", sa.Date),
        sa.Column("gender", sa.String(20)),
        sa.Column("blood_group", sa.String(10)),
        sa.Column("known_conditions", postgresql.JSONB, server_default="[]"),
        sa.Column("current_medications", postgresql.JSONB, server_default="[]"),
        sa.Column("allergies", postgresql.JSONB, server_default="[]"),
        sa.Column("location_lat", sa.Numeric(10, 8)),
        sa.Column("location_lng", sa.Numeric(11, 8)),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ---- subscriptions ----
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), index=True),
        sa.Column("tier", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("payment_provider", sa.String(50)),
        sa.Column("payment_id", sa.String(255)),
        sa.Column("plan_duration", sa.String(20)),
        sa.Column("amount", sa.Numeric(10, 2)),
        sa.Column("currency", sa.String(3), server_default="INR"),
        sa.Column("started_at", sa.DateTime),
        sa.Column("expires_at", sa.DateTime),
        sa.Column("cancelled_at", sa.DateTime),
        sa.Column("auto_renew", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ---- medicines ----
    op.create_table(
        "medicines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("generic_name", sa.String(255), index=True),
        sa.Column("brand", sa.String(255), index=True),
        sa.Column("manufacturer", sa.String(255)),
        sa.Column("composition", postgresql.JSONB, nullable=False),
        sa.Column("dosage_form", sa.String(50)),
        sa.Column("dosage_instructions", postgresql.JSONB),
        sa.Column("side_effects", postgresql.JSONB, server_default="{}"),
        sa.Column("contraindications", postgresql.JSONB, server_default="[]"),
        sa.Column("storage_info", sa.Text),
        sa.Column("price_mrp", sa.Numeric(10, 2)),
        sa.Column("pack_size", sa.String(50)),
        sa.Column("currency", sa.String(3), server_default="INR"),
        sa.Column("prescription_required", sa.Boolean, server_default="false"),
        sa.Column("category", sa.String(100), index=True),
        sa.Column("atc_code", sa.String(20)),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ---- generic_mappings ----
    op.create_table(
        "generic_mappings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("brand_medicine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("medicines.id", ondelete="CASCADE"), index=True),
        sa.Column("generic_medicine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("medicines.id", ondelete="CASCADE"), index=True),
        sa.Column("composition_match_percent", sa.Numeric(5, 2), server_default="100.00"),
        sa.Column("price_savings_percent", sa.Numeric(5, 2)),
        sa.UniqueConstraint("brand_medicine_id", "generic_medicine_id"),
    )

    # ---- drug_interactions ----
    op.create_table(
        "drug_interactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("medicine_a_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("medicines.id", ondelete="CASCADE"), index=True),
        sa.Column("medicine_b_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("medicines.id", ondelete="CASCADE"), index=True),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("mechanism", sa.Text),
        sa.Column("recommendation", sa.Text, nullable=False),
        sa.Column("source", sa.String(100)),
        sa.Column("evidence_level", sa.String(20)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("medicine_a_id", "medicine_b_id"),
    )

    # ---- pharmacies ----
    op.create_table(
        "pharmacies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("license_number", sa.String(100), unique=True),
        sa.Column("address", sa.Text),
        sa.Column("city", sa.String(100), index=True),
        sa.Column("state", sa.String(100)),
        sa.Column("pincode", sa.String(10)),
        sa.Column("phone", sa.String(20)),
        sa.Column("email", sa.String(255)),
        sa.Column("website", sa.String(255)),
        sa.Column("latitude", sa.Numeric(10, 8)),
        sa.Column("longitude", sa.Numeric(11, 8)),
        sa.Column("rating", sa.Numeric(2, 1)),
        sa.Column("total_reviews", sa.Integer, server_default="0"),
        sa.Column("is_open_24hrs", sa.Boolean, server_default="false"),
        sa.Column("operating_hours", postgresql.JSONB),
        sa.Column("is_verified", sa.Boolean, server_default="false"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("google_place_id", sa.String(255)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ---- pharmacy_inventory ----
    op.create_table(
        "pharmacy_inventory",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("pharmacy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pharmacies.id", ondelete="CASCADE"), index=True),
        sa.Column("medicine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("medicines.id", ondelete="CASCADE"), index=True),
        sa.Column("quantity", sa.Integer, server_default="0"),
        sa.Column("price", sa.Numeric(10, 2)),
        sa.Column("expiry_date", sa.Date),
        sa.Column("batch_number", sa.String(100)),
        sa.Column("status", sa.String(20), server_default="available"),
        sa.Column("last_updated", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("pharmacy_id", "medicine_id", "batch_number"),
    )

    # ---- pharmacy_network ----
    op.create_table(
        "pharmacy_network",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("pharmacy_a_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pharmacies.id", ondelete="CASCADE")),
        sa.Column("pharmacy_b_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pharmacies.id", ondelete="CASCADE")),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("connected_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("pharmacy_a_id", "pharmacy_b_id"),
    )

    # ---- medicine_transfers ----
    op.create_table(
        "medicine_transfers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("from_pharmacy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pharmacies.id", ondelete="SET NULL")),
        sa.Column("to_pharmacy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pharmacies.id", ondelete="SET NULL")),
        sa.Column("medicine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("medicines.id", ondelete="SET NULL")),
        sa.Column("quantity", sa.Integer, nullable=False),
        sa.Column("status", sa.String(20), server_default="requested"),
        sa.Column("reason", sa.Text),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime),
    )

    # ---- prescriptions ----
    op.create_table(
        "prescriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), index=True),
        sa.Column("image_url", sa.Text),
        sa.Column("raw_text", sa.Text),
        sa.Column("ocr_confidence", sa.Numeric(3, 2)),
        sa.Column("detected_medicines", postgresql.JSONB),
        sa.Column("ocr_provider", sa.String(50)),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ---- medicine_verifications ----
    op.create_table(
        "medicine_verifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), index=True),
        sa.Column("code", sa.String(255), nullable=False, index=True),
        sa.Column("code_type", sa.String(20)),
        sa.Column("is_authentic", sa.Boolean, nullable=False),
        sa.Column("medicine_name", sa.String(255)),
        sa.Column("manufacturer", sa.String(255)),
        sa.Column("batch_number", sa.String(100)),
        sa.Column("manufacturing_date", sa.Date),
        sa.Column("expiry_date", sa.Date),
        sa.Column("verification_source", sa.String(100)),
        sa.Column("scan_image_url", sa.Text),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ---- reservations ----
    op.create_table(
        "reservations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), index=True),
        sa.Column("pharmacy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pharmacies.id", ondelete="CASCADE"), index=True),
        sa.Column("medicine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("medicines.id", ondelete="CASCADE")),
        sa.Column("quantity", sa.Integer, nullable=False),
        sa.Column("total_price", sa.Numeric(10, 2)),
        sa.Column("confirmation_code", sa.String(50)),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("pickup_by", sa.DateTime),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ---- reminders ----
    op.create_table(
        "reminders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), index=True),
        sa.Column("medicine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("medicines.id", ondelete="SET NULL")),
        sa.Column("medicine_name", sa.String(255)),
        sa.Column("dosage", sa.String(100)),
        sa.Column("frequency", sa.String(30)),
        sa.Column("times", postgresql.JSONB),
        sa.Column("instructions", sa.Text),
        sa.Column("start_date", sa.Date),
        sa.Column("end_date", sa.Date),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("notification_channels", postgresql.JSONB, server_default='["push"]'),
        sa.Column("prescription_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("prescriptions.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ---- reminder_doses ----
    op.create_table(
        "reminder_doses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("reminder_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("reminders.id", ondelete="CASCADE"), index=True),
        sa.Column("scheduled_at", sa.DateTime, index=True),
        sa.Column("taken_at", sa.DateTime),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ---- symptom_sessions ----
    op.create_table(
        "symptom_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), index=True),
        sa.Column("request_id", sa.String(100), unique=True, index=True),
        sa.Column("input_text", sa.Text),
        sa.Column("input_type", sa.String(20)),
        sa.Column("voice_file_url", sa.Text),
        sa.Column("transcription", sa.Text),
        sa.Column("transcription_confidence", sa.Numeric(3, 2)),
        sa.Column("parsed_symptoms", postgresql.JSONB),
        sa.Column("risk_level", sa.String(20)),
        sa.Column("risk_recommendation", sa.Text),
        sa.Column("model_version", sa.String(50)),
        sa.Column("llm_used", sa.String(50)),
        sa.Column("processing_time_ms", sa.Integer),
        sa.Column("user_age", sa.Integer),
        sa.Column("user_gender", sa.String(20)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ---- predictions ----
    op.create_table(
        "predictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("symptom_sessions.id", ondelete="CASCADE"), index=True),
        sa.Column("disease_name", sa.String(255), nullable=False),
        sa.Column("icd_code", sa.String(20)),
        sa.Column("confidence", sa.Numeric(4, 3)),
        sa.Column("rank", sa.Integer),
        sa.Column("description", sa.Text),
        sa.Column("specialist_type", sa.String(100)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ---- hospitals_cache ----
    op.create_table(
        "hospitals_cache",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("google_place_id", sa.String(255), unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(50)),
        sa.Column("address", sa.Text),
        sa.Column("phone", sa.String(20)),
        sa.Column("latitude", sa.Numeric(10, 8)),
        sa.Column("longitude", sa.Numeric(11, 8)),
        sa.Column("rating", sa.Numeric(2, 1)),
        sa.Column("has_emergency", sa.Boolean, server_default="false"),
        sa.Column("specialties", postgresql.JSONB, server_default="[]"),
        sa.Column("operating_hours", postgresql.JSONB),
        sa.Column("cached_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime),
    )

    # ---- first_aid_kb ----
    op.create_table(
        "first_aid_kb",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("condition_name", sa.String(255), nullable=False, index=True),
        sa.Column("icd_code", sa.String(20)),
        sa.Column("immediate_actions", postgresql.JSONB, nullable=False),
        sa.Column("things_to_avoid", postgresql.JSONB, nullable=False),
        sa.Column("emergency_signs", postgresql.JSONB, nullable=False),
        sa.Column("source", sa.Text),
        sa.Column("verified_by", sa.String(255)),
        sa.Column("last_reviewed", sa.Date),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ---- feedback ----
    op.create_table(
        "feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("feature", sa.String(50)),
        sa.Column("reference_id", postgresql.UUID(as_uuid=True)),
        sa.Column("rating", sa.Integer),
        sa.Column("was_helpful", sa.Boolean),
        sa.Column("comments", sa.Text),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ---- demand_tracking ----
    op.create_table(
        "demand_tracking",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("pharmacy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pharmacies.id", ondelete="CASCADE"), index=True),
        sa.Column("medicine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("medicines.id", ondelete="CASCADE"), index=True),
        sa.Column("date", sa.Date, index=True),
        sa.Column("units_sold", sa.Integer, server_default="0"),
        sa.Column("units_searched", sa.Integer, server_default="0"),
        sa.Column("units_reserved", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("pharmacy_id", "medicine_id", "date"),
    )

    # ---- audit_logs ----
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), index=True),
        sa.Column("action", sa.String(100), index=True),
        sa.Column("endpoint", sa.String(255)),
        sa.Column("method", sa.String(10)),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.Text),
        sa.Column("request_body", postgresql.JSONB),
        sa.Column("response_code", sa.Integer),
        sa.Column("processing_ms", sa.Integer),
        sa.Column("subscription_tier", sa.String(20)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), index=True),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("demand_tracking")
    op.drop_table("feedback")
    op.drop_table("first_aid_kb")
    op.drop_table("hospitals_cache")
    op.drop_table("predictions")
    op.drop_table("symptom_sessions")
    op.drop_table("reminder_doses")
    op.drop_table("reminders")
    op.drop_table("reservations")
    op.drop_table("medicine_verifications")
    op.drop_table("prescriptions")
    op.drop_table("medicine_transfers")
    op.drop_table("pharmacy_network")
    op.drop_table("pharmacy_inventory")
    op.drop_table("pharmacies")
    op.drop_table("drug_interactions")
    op.drop_table("generic_mappings")
    op.drop_table("medicines")
    op.drop_table("subscriptions")
    op.drop_table("medical_profiles")
    op.drop_table("users")
