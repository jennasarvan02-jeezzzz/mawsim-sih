"""Application settings and configuration parameters for FreightIQ decision support platform."""

import os
from typing import Optional
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Load .env file if present
load_dotenv()


class RiskWeights(BaseModel):
    market_volatility: float = 0.35
    port_congestion: float = 0.25
    deadline_pressure: float = 0.25
    idle_time_exposure: float = 0.15


class CongestionBufferRates(BaseModel):
    low: float = 0.02       # 2% buffer for low congestion
    moderate: float = 0.05  # 5% buffer for moderate congestion
    high: float = 0.09      # 9% buffer for high congestion


class OperationalRiskBufferRates(BaseModel):
    low: float = 0.02
    moderate: float = 0.04
    high: float = 0.07


class ContractScenarioConfig(BaseModel):
    spot_volatility_penalty_pct: float = 0.06     # Spot contracts exposed to volatility/idle risk (+6%)
    multi_voyage_discount_pct: float = 0.04       # Multi-voyage commitments yield volume discount (-4%)
    spot_reliability_pct: int = 65                # Spot operational reliability score
    multi_voyage_reliability_pct: int = 88        # Multi-voyage operational reliability score


class Settings(BaseModel):
    app_name: str = "FreightIQ"
    version: str = "1.0.0"

    # Supabase & Database Configuration
    supabase_url: Optional[str] = Field(default_factory=lambda: os.getenv("SUPABASE_URL"))
    supabase_key: Optional[str] = Field(default_factory=lambda: os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    supabase_db_url: Optional[str] = Field(default_factory=lambda: os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL"))
    
    # Defaults to local SQLite if neither DATABASE_URL nor SUPABASE_DB_URL is provided
    database_url: str = Field(
        default_factory=lambda: os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL") or "sqlite:///./freightiq.db"
    )

    risk_weights: RiskWeights = RiskWeights()
    congestion_buffers: CongestionBufferRates = CongestionBufferRates()
    operational_buffers: OperationalRiskBufferRates = OperationalRiskBufferRates()
    contract_config: ContractScenarioConfig = ContractScenarioConfig()

    # Provenance labels
    PROVENANCE_USER_INPUT: str = "User Input"
    PROVENANCE_OFFICIAL: str = "Official-source Prototype Configuration"
    PROVENANCE_HISTORICAL: str = "Sample Historical Prototype Data"
    PROVENANCE_SIMULATED: str = "Simulated Scenario Data"
    PROVENANCE_ASSUMPTION: str = "Prototype Assumption"


settings = Settings()
