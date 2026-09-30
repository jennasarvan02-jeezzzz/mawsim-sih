"""Pydantic schemas for FreightIQ API."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


# --- Health ---
class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "FreightIQ API"


# --- Reference Data ---
class BerthSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    port_id: str
    name: str
    cargo_type: str
    max_draft_m: float
    max_loa_m: float
    max_beam_m: float
    handling_rate_mt_per_day: float
    source_label: str
    last_verified_date: str


class PortSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    country: str
    port_code: str
    port_role: str
    latitude: float
    longitude: float
    is_mvp_supported: bool = True
    source_label: str
    source_note: Optional[str] = None
    berths: List[BerthSchema] = []


class VesselTypeSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    min_capacity_mt: float
    max_capacity_mt: float
    typical_draft_m: float
    typical_loa_m: float
    typical_beam_m: float
    speed_knots: float
    source_label: str


# --- Recommendation Request & Response ---
class CargoRequirementRequest(BaseModel):
    cargo_type: str = Field(default="COKING_COAL", description="Bulk cargo type")
    cargo_quantity_mt: float = Field(..., gt=0, description="Quantity in metric tonnes")
    origin_port_id: str = Field(..., description="Origin port ID e.g. NEWCASTLE_AU")
    destination_port_id: str = Field(..., description="Destination port ID e.g. PARADIP_IN")
    arrival_start_date: str = Field(..., description="YYYY-MM-DD")
    arrival_end_date: str = Field(..., description="YYYY-MM-DD")
    contract_preference: str = Field(
        default="SHORT_TERM_MULTIPLE_VOYAGE",
        description="SPOT_CONTRACT | SHORT_TERM_MULTIPLE_VOYAGE | MEDIUM_TERM_MULTIPLE_VOYAGE"
    )
    contract_duration_days: int = Field(default=90, gt=0)
    urgency: str = Field(default="HIGH", description="LOW | MEDIUM | HIGH")


class ChartDataPoint(BaseModel):
    date: str
    historical_rate: Optional[float] = None
    forecast_rate: Optional[float] = None
    forecast_low: Optional[float] = None
    forecast_high: Optional[float] = None
    is_forecast: bool = False
    source_label: str


class RecommendationOptionSchema(BaseModel):
    vessel_type_id: str
    vessel_name: str
    min_capacity_mt: float
    max_capacity_mt: float
    typical_draft_m: float
    typical_loa_m: float
    typical_beam_m: float
    speed_knots: float
    feasible: bool
    feasibility_status: str  # "FEASIBLE" | "CONDITIONALLY_FEASIBLE" | "REJECTED"
    estimated_rate_usd_per_mt: Optional[float] = None
    estimated_total_cost_usd: Optional[float] = None
    risk_level: str
    recommendation_rank: Optional[int] = None
    reasons: List[str]
    capacity_fit_score: float
    capacity_fit_label: str


class RiskAlertSchema(BaseModel):
    risk_type: str
    severity: str  # "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
    title: str
    message: str
    impact: str
    suggested_action: str
    source_label: str


class ProvenanceSummary(BaseModel):
    ports_and_berths: str
    freight_rates: str
    congestion_data: str
    forecast_engine: str
    scenario_assumptions: str


class RecommendationResponse(BaseModel):
    recommendation_id: str
    cargo_requirement: CargoRequirementRequest
    recommended_vessel_type_id: str
    recommended_vessel_name: str
    recommended_contract_strategy: str
    overall_risk: str
    overall_risk_score: float
    entry_window_start: str
    entry_window_end: str
    expected_freight_rate_usd_per_mt: float
    freight_rate_low_usd_per_mt: float
    freight_rate_high_usd_per_mt: float
    expected_total_cost_usd: float
    freight_cost_usd: float
    congestion_buffer_usd: float
    operational_buffer_usd: float
    reasons: List[str]
    trend_label: str  # "RISING" | "STABLE" | "FALLING"
    uncertainty_level: str  # "LOW" | "MODERATE" | "HIGH"
    chart_data: List[ChartDataPoint]
    vessel_options: List[RecommendationOptionSchema]
    risk_alerts: List[RiskAlertSchema]
    data_provenance: ProvenanceSummary
    created_at: str


# --- Feasibility Details ---
class PortConstraintDetail(BaseModel):
    port_id: str
    port_name: str
    country: str
    port_role: str
    max_draft_m: float
    max_loa_m: float
    max_beam_m: float
    handling_rate_mt_per_day: float
    source_label: str


class TransitTimeBreakdown(BaseModel):
    vessel_type_id: str
    vessel_name: str
    distance_nm: float
    speed_knots: float
    sailing_days: float
    origin_loading_days: float
    destination_discharge_days: float
    congestion_waiting_days: float
    total_transit_days: float
    estimated_departure_date: str
    estimated_arrival_date: str
    deadline_fit_status: str  # "ON_TIME" | "TIGHT" | "RISK_OF_DELAY"


class FeasibilityDetailsResponse(BaseModel):
    recommendation_id: str
    route_id: str
    distance_nm: float
    origin_port: PortConstraintDetail
    destination_port: PortConstraintDetail
    vessel_feasibility: List[RecommendationOptionSchema]
    transit_breakdowns: List[TransitTimeBreakdown]
    arrival_window_start: str
    arrival_window_end: str
    data_provenance: ProvenanceSummary
    disclaimer: str


# --- Risk Details ---
class RiskDetailsResponse(BaseModel):
    recommendation_id: str
    overall_risk: str
    overall_risk_score: float
    risk_weights: Dict[str, float]
    risk_breakdown_scores: Dict[str, float]
    alerts: List[RiskAlertSchema]
    data_provenance: ProvenanceSummary


# --- Contract Plan Request & Response ---
class ContractPlanRequest(BaseModel):
    recommendation_id: str
    contract_duration_days: int = Field(default=90, gt=0)
    voyage_count: int = Field(default=4, gt=0)
    total_cargo_quantity_mt: float = Field(default=300000, gt=0)
    preferred_vessel_type: str = Field(default="PANAMAX")


class ContractVoyageSchema(BaseModel):
    voyage_number: int
    departure_window_start: str
    departure_window_end: str
    origin_port_id: str
    destination_port_id: str
    cargo_quantity_mt: float
    estimated_cost_usd: float
    risk_level: str


class ContractScenarioComparison(BaseModel):
    scenario_name: str
    total_cost_usd: float
    average_rate_usd_per_mt: float
    volatility_risk_level: str
    operational_reliability_pct: int
    freight_buffer_applied_pct: float
    berth_priority_guarantee: bool


class ContractPlanResponse(BaseModel):
    contract_plan_id: str
    recommendation_id: str
    duration_days: int
    voyage_count: int
    total_cargo_quantity_mt: float
    cargo_quantity_per_voyage_mt: float
    vessel_type_id: str
    vessel_name: str
    voyages_schedule: List[ContractVoyageSchema]
    spot_scenario: ContractScenarioComparison
    contract_scenario: ContractScenarioComparison
    estimated_savings_usd: float
    estimated_savings_percent: float
    reasons: List[str]
    assumptions: List[str]
    disclaimer: str
    created_at: str
