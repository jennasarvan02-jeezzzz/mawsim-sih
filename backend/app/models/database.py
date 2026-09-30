"""Database models and Supabase / PostgreSQL / SQLite engine configuration for FreightIQ."""

from datetime import datetime
import logging
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, create_engine
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from app.config.settings import settings

logger = logging.getLogger("uvicorn.error")

Base = declarative_base()

# Determine database engine parameters based on dialect (PostgreSQL vs SQLite)
db_url = settings.database_url or "sqlite:///./freightiq.db"
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)


def create_db_engine(url: str):
    engine_kwargs = {}
    if url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    else:
        # PostgreSQL / Supabase connection pooling configuration
        engine_kwargs["pool_pre_ping"] = True
        engine_kwargs["pool_size"] = 5
        engine_kwargs["max_overflow"] = 10
    return create_engine(url, **engine_kwargs)


# Initialize primary engine with fallback resilience
try:
    engine = create_db_engine(db_url)
    if not db_url.startswith("sqlite"):
        # Test connection immediately to catch unreachable remote hosts
        with engine.connect() as conn:
            logger.info("Successfully connected to remote Supabase PostgreSQL database.")
except Exception as e:
    logger.warning(f"Could not connect to configured DATABASE_URL ({e}). Falling back to local SQLite engine (sqlite:///./freightiq.db).")
    db_url = "sqlite:///./freightiq.db"
    engine = create_db_engine(db_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_supabase_client():
    """Optional Supabase Python client instance if REST API access is required."""
    if settings.supabase_url and settings.supabase_key:
        try:
            from supabase import create_client, Client
            supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
            return supabase
        except Exception as e:
            logger.warning(f"Supabase client initialization notice: {e}")
    return None


class Port(Base):
    __tablename__ = "ports"

    id = Column(String, primary_key=True, index=True)  # e.g., "NEWCASTLE_AU", "PARADIP_IN"
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    port_code = Column(String, nullable=False)
    port_role = Column(String, nullable=False)  # "ORIGIN" or "DESTINATION"
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    is_mvp_supported = Column(Boolean, default=True)
    source_label = Column(String, default=settings.PROVENANCE_OFFICIAL)
    source_note = Column(Text, nullable=True)

    berths = relationship("Berth", back_populates="port", cascade="all, delete-orphan")
    congestions = relationship("PortCongestion", back_populates="port", cascade="all, delete-orphan")


class Berth(Base):
    __tablename__ = "berths"

    id = Column(String, primary_key=True, index=True)
    port_id = Column(String, ForeignKey("ports.id"), nullable=False)
    name = Column(String, nullable=False)
    cargo_type = Column(String, default="COKING_COAL")
    max_draft_m = Column(Float, nullable=False)
    max_loa_m = Column(Float, nullable=False)
    max_beam_m = Column(Float, nullable=False)
    handling_rate_mt_per_day = Column(Float, nullable=False)
    source_label = Column(String, default=settings.PROVENANCE_OFFICIAL)
    last_verified_date = Column(String, default="2026-08-01")

    port = relationship("Port", back_populates="berths")


class VesselType(Base):
    __tablename__ = "vessel_types"

    id = Column(String, primary_key=True, index=True)  # "HANDYSIZE", "SUPRAMAX", "PANAMAX", "CAPESIZE"
    name = Column(String, nullable=False)
    min_capacity_mt = Column(Float, nullable=False)
    max_capacity_mt = Column(Float, nullable=False)
    typical_draft_m = Column(Float, nullable=False)
    typical_loa_m = Column(Float, nullable=False)
    typical_beam_m = Column(Float, nullable=False)
    speed_knots = Column(Float, nullable=False)
    source_label = Column(String, default=settings.PROVENANCE_ASSUMPTION)


class Route(Base):
    __tablename__ = "routes"

    id = Column(String, primary_key=True, index=True)  # e.g., "NEWCASTLE_AU__PARADIP_IN"
    origin_port_id = Column(String, ForeignKey("ports.id"), nullable=False)
    destination_port_id = Column(String, ForeignKey("ports.id"), nullable=False)
    distance_nm = Column(Float, nullable=False)
    typical_sailing_days = Column(Float, nullable=False)
    source_label = Column(String, default=settings.PROVENANCE_OFFICIAL)

    freight_rates = relationship("FreightRateHistory", back_populates="route", cascade="all, delete-orphan")


class FreightRateHistory(Base):
    __tablename__ = "freight_rate_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    route_id = Column(String, ForeignKey("routes.id"), nullable=False)
    vessel_type_id = Column(String, ForeignKey("vessel_types.id"), nullable=False)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    rate_usd_per_mt = Column(Float, nullable=False)
    source_label = Column(String, default=settings.PROVENANCE_HISTORICAL)

    route = relationship("Route", back_populates="freight_rates")


class PortCongestion(Base):
    __tablename__ = "port_congestion"

    id = Column(Integer, primary_key=True, autoincrement=True)
    port_id = Column(String, ForeignKey("ports.id"), nullable=False)
    date = Column(String, nullable=False, index=True)
    congestion_level = Column(String, nullable=False)  # "LOW", "MODERATE", "HIGH"
    estimated_wait_hours = Column(Float, nullable=False)
    source_label = Column(String, default=settings.PROVENANCE_SIMULATED)

    port = relationship("Port", back_populates="congestions")


class CargoRequirement(Base):
    __tablename__ = "cargo_requirements"

    id = Column(String, primary_key=True, index=True)
    cargo_type = Column(String, default="COKING_COAL")
    cargo_quantity_mt = Column(Float, nullable=False)
    origin_port_id = Column(String, ForeignKey("ports.id"), nullable=False)
    destination_port_id = Column(String, ForeignKey("ports.id"), nullable=False)
    arrival_start_date = Column(String, nullable=False)
    arrival_end_date = Column(String, nullable=False)
    contract_preference = Column(String, nullable=False)
    contract_duration_days = Column(Integer, default=90)
    urgency = Column(String, default="HIGH")
    created_at = Column(DateTime, default=datetime.utcnow)

    recommendations = relationship("Recommendation", back_populates="cargo_requirement", cascade="all, delete-orphan")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String, primary_key=True, index=True)
    cargo_requirement_id = Column(String, ForeignKey("cargo_requirements.id"), nullable=False)
    recommended_vessel_type_id = Column(String, ForeignKey("vessel_types.id"), nullable=False)
    recommended_contract_strategy = Column(String, nullable=False)
    overall_risk = Column(String, nullable=False)  # "LOW", "MODERATE", "HIGH", "CRITICAL"
    overall_risk_score = Column(Float, default=45.0)
    entry_window_start = Column(String, nullable=False)
    entry_window_end = Column(String, nullable=False)
    expected_freight_rate_usd_per_mt = Column(Float, nullable=False)
    freight_rate_low_usd_per_mt = Column(Float, nullable=False)
    freight_rate_high_usd_per_mt = Column(Float, nullable=False)
    expected_total_cost_usd = Column(Float, nullable=False)
    reasons_json = Column(Text, nullable=False)  # List of strings serialized to JSON
    created_at = Column(DateTime, default=datetime.utcnow)

    cargo_requirement = relationship("CargoRequirement", back_populates="recommendations")
    options = relationship("RecommendationOption", back_populates="recommendation", cascade="all, delete-orphan")
    risk_alerts = relationship("RiskAlert", back_populates="recommendation", cascade="all, delete-orphan")
    contract_plans = relationship("ContractPlan", back_populates="recommendation", cascade="all, delete-orphan")


class RecommendationOption(Base):
    __tablename__ = "recommendation_options"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recommendation_id = Column(String, ForeignKey("recommendations.id"), nullable=False)
    vessel_type_id = Column(String, ForeignKey("vessel_types.id"), nullable=False)
    feasible = Column(Boolean, nullable=False)
    feasibility_status = Column(String, nullable=False)  # "FEASIBLE", "CONDITIONALLY_FEASIBLE", "REJECTED"
    estimated_rate_usd_per_mt = Column(Float, nullable=True)
    estimated_total_cost_usd = Column(Float, nullable=True)
    risk_level = Column(String, nullable=False)
    recommendation_rank = Column(Integer, nullable=True)
    reasons_json = Column(Text, nullable=False)  # Array of strings

    recommendation = relationship("Recommendation", back_populates="options")


class RiskAlert(Base):
    __tablename__ = "risk_alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recommendation_id = Column(String, ForeignKey("recommendations.id"), nullable=False)
    risk_type = Column(String, nullable=False)  # "MARKET_VOLATILITY", "PORT_CONGESTION", "DEADLINE_PRESSURE", "VESSEL_IDLE_TIME", "VESSEL_PORT_COMPATIBILITY", "DATA_FRESHNESS"
    severity = Column(String, nullable=False)   # "LOW", "MODERATE", "HIGH", "CRITICAL"
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    impact = Column(Text, nullable=False)
    suggested_action = Column(Text, nullable=False)
    source_label = Column(String, default=settings.PROVENANCE_SIMULATED)

    recommendation = relationship("Recommendation", back_populates="risk_alerts")


class ContractPlan(Base):
    __tablename__ = "contract_plans"

    id = Column(String, primary_key=True, index=True)
    recommendation_id = Column(String, ForeignKey("recommendations.id"), nullable=False)
    duration_days = Column(Integer, default=90)
    voyage_count = Column(Integer, default=4)
    total_cargo_quantity_mt = Column(Float, nullable=False)
    vessel_type_id = Column(String, ForeignKey("vessel_types.id"), nullable=False)
    spot_total_cost_usd = Column(Float, nullable=False)
    contract_total_cost_usd = Column(Float, nullable=False)
    estimated_savings_usd = Column(Float, nullable=False)
    estimated_savings_percent = Column(Float, nullable=False)
    spot_reliability_pct = Column(Integer, default=65)
    contract_reliability_pct = Column(Integer, default=88)
    reasons_json = Column(Text, nullable=False)
    assumptions_json = Column(Text, nullable=False)
    disclaimer = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    recommendation = relationship("Recommendation", back_populates="contract_plans")
    voyages = relationship("ContractVoyage", back_populates="contract_plan", cascade="all, delete-orphan")


class ContractVoyage(Base):
    __tablename__ = "contract_voyages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_plan_id = Column(String, ForeignKey("contract_plans.id"), nullable=False)
    voyage_number = Column(Integer, nullable=False)
    departure_window_start = Column(String, nullable=False)
    departure_window_end = Column(String, nullable=False)
    origin_port_id = Column(String, nullable=False)
    destination_port_id = Column(String, nullable=False)
    cargo_quantity_mt = Column(Float, nullable=False)
    estimated_cost_usd = Column(Float, nullable=False)
    risk_level = Column(String, default="LOW")

    contract_plan = relationship("ContractPlan", back_populates="voyages")
