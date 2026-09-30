"""Recommendations and Feasibility API router."""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.database import get_db, Recommendation, Port, Berth, Route, VesselType
from app.repositories.repository import (
    RecommendationRepository, PortRepository, RouteRepository,
    VesselTypeRepository, PortCongestionRepository
)
from app.schemas.schemas import (
    CargoRequirementRequest, RecommendationResponse, FeasibilityDetailsResponse,
    RiskDetailsResponse, PortConstraintDetail, TransitTimeBreakdown,
    RecommendationOptionSchema, RiskAlertSchema, ProvenanceSummary
)
from app.services.recommendation_service import RecommendationService
from app.services.feasibility_service import FeasibilityService
from app.services.forecasting_service import ForecastingService
from app.config.settings import settings

router = APIRouter(prefix="/v1/recommendations", tags=["Recommendations"])


@router.post("", response_model=RecommendationResponse)
def create_recommendation(
    payload: CargoRequirementRequest,
    db: Session = Depends(get_db)
):
    """Generate a data-backed, explainable vessel chartering and freight recommendation."""
    return RecommendationService.generate_recommendation(db, payload)


@router.get("/{recommendation_id}", response_model=RecommendationResponse)
def get_recommendation(
    recommendation_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve an existing recommendation by ID."""
    rec = RecommendationRepository.get_by_id(db, recommendation_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")

    req = rec.cargo_requirement
    route = RouteRepository.get_route(db, req.origin_port_id, req.destination_port_id)
    vessel = VesselTypeRepository.get_by_id(db, rec.recommended_vessel_type_id)

    # Reconstruct chart data from forecasting service
    from app.repositories.repository import FreightRateRepository
    history = FreightRateRepository.get_history_for_route_and_vessel(db, route.id, rec.recommended_vessel_type_id)
    forecast = ForecastingService.generate_forecast(history, 30, req.arrival_start_date)

    vessel_options: list[RecommendationOptionSchema] = []
    for opt in rec.options:
        vt = VesselTypeRepository.get_by_id(db, opt.vessel_type_id)
        vessel_options.append(
            RecommendationOptionSchema(
                vessel_type_id=opt.vessel_type_id,
                vessel_name=vt.name if vt else opt.vessel_type_id,
                min_capacity_mt=vt.min_capacity_mt if vt else 0,
                max_capacity_mt=vt.max_capacity_mt if vt else 0,
                typical_draft_m=vt.typical_draft_m if vt else 0,
                typical_loa_m=vt.typical_loa_m if vt else 0,
                typical_beam_m=vt.typical_beam_m if vt else 0,
                speed_knots=vt.speed_knots if vt else 0,
                feasible=opt.feasible,
                feasibility_status=opt.feasibility_status,
                estimated_rate_usd_per_mt=opt.estimated_rate_usd_per_mt,
                estimated_total_cost_usd=opt.estimated_total_cost_usd,
                risk_level=opt.risk_level,
                recommendation_rank=opt.recommendation_rank,
                reasons=json.loads(opt.reasons_json) if opt.reasons_json else [],
                capacity_fit_score=0.95 if opt.recommendation_rank == 1 else 0.5,
                capacity_fit_label="OPTIMAL" if opt.recommendation_rank == 1 else "CONDITIONAL"
            )
        )

    risk_alerts: list[RiskAlertSchema] = []
    for alert in rec.risk_alerts:
        risk_alerts.append(
            RiskAlertSchema(
                risk_type=alert.risk_type,
                severity=alert.severity,
                title=alert.title,
                message=alert.message,
                impact=alert.impact,
                suggested_action=alert.suggested_action,
                source_label=alert.source_label
            )
        )

    base_freight = round(rec.expected_freight_rate_usd_per_mt * req.cargo_quantity_mt, 2)
    congestion_buf = round(base_freight * settings.congestion_buffers.moderate, 2)
    op_buf = round(base_freight * settings.operational_buffers.moderate, 2)

    return RecommendationResponse(
        recommendation_id=rec.id,
        cargo_requirement=CargoRequirementRequest(
            cargo_type=req.cargo_type,
            cargo_quantity_mt=req.cargo_quantity_mt,
            origin_port_id=req.origin_port_id,
            destination_port_id=req.destination_port_id,
            arrival_start_date=req.arrival_start_date,
            arrival_end_date=req.arrival_end_date,
            contract_preference=req.contract_preference,
            contract_duration_days=req.contract_duration_days,
            urgency=req.urgency
        ),
        recommended_vessel_type_id=rec.recommended_vessel_type_id,
        recommended_vessel_name=vessel.name if vessel else rec.recommended_vessel_type_id,
        recommended_contract_strategy=rec.recommended_contract_strategy,
        overall_risk=rec.overall_risk,
        overall_risk_score=rec.overall_risk_score,
        entry_window_start=rec.entry_window_start,
        entry_window_end=rec.entry_window_end,
        expected_freight_rate_usd_per_mt=rec.expected_freight_rate_usd_per_mt,
        freight_rate_low_usd_per_mt=rec.freight_rate_low_usd_per_mt,
        freight_rate_high_usd_per_mt=rec.freight_rate_high_usd_per_mt,
        expected_total_cost_usd=rec.expected_total_cost_usd,
        freight_cost_usd=base_freight,
        congestion_buffer_usd=congestion_buf,
        operational_buffer_usd=op_buf,
        reasons=json.loads(rec.reasons_json) if rec.reasons_json else [],
        trend_label=forecast["trend_label"],
        uncertainty_level=forecast["uncertainty_level"],
        chart_data=forecast["chart_data"],
        vessel_options=vessel_options,
        risk_alerts=risk_alerts,
        data_provenance=ProvenanceSummary(
            ports_and_berths=settings.PROVENANCE_OFFICIAL,
            freight_rates=settings.PROVENANCE_HISTORICAL,
            congestion_data=settings.PROVENANCE_SIMULATED,
            forecast_engine="Deterministic Moving Average + Trend Slope + 95% Confidence Interval",
            scenario_assumptions=settings.PROVENANCE_ASSUMPTION
        ),
        created_at=rec.created_at.isoformat() if rec.created_at else ""
    )


@router.get("/{recommendation_id}/feasibility", response_model=FeasibilityDetailsResponse)
def get_feasibility_details(
    recommendation_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve detailed port constraints, vessel physical feasibility, and transit breakdown."""
    rec = RecommendationRepository.get_by_id(db, recommendation_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")

    req = rec.cargo_requirement
    origin = PortRepository.get_by_id(db, req.origin_port_id)
    dest = PortRepository.get_by_id(db, req.destination_port_id)
    origin_berth = db.query(Berth).filter(Berth.port_id == req.origin_port_id).first()
    dest_berth = db.query(Berth).filter(Berth.port_id == req.destination_port_id).first()
    route = RouteRepository.get_route(db, req.origin_port_id, req.destination_port_id)
    vessel_types = VesselTypeRepository.get_all(db)

    origin_cong = PortCongestionRepository.get_latest_for_port(db, req.origin_port_id)
    dest_cong = PortCongestionRepository.get_latest_for_port(db, req.destination_port_id)
    origin_wait = origin_cong.estimated_wait_hours if origin_cong else 18.0
    dest_wait = dest_cong.estimated_wait_hours if dest_cong else 24.0

    transit_breakdowns: list[TransitTimeBreakdown] = []
    vessel_feasibility_list: list[RecommendationOptionSchema] = []

    for vt in vessel_types:
        feas = FeasibilityService.evaluate_vessel_feasibility(
            vessel=vt,
            origin_port=origin,
            origin_berth=origin_berth,
            dest_port=dest,
            dest_berth=dest_berth,
            cargo_quantity_mt=req.cargo_quantity_mt
        )

        tr = FeasibilityService.calculate_transit_breakdown(
            vessel=vt,
            route=route,
            cargo_quantity_mt=req.cargo_quantity_mt,
            origin_berth=origin_berth,
            dest_berth=dest_berth,
            origin_wait_hours=origin_wait,
            dest_wait_hours=dest_wait,
            arrival_start_date_str=req.arrival_start_date,
            arrival_end_date_str=req.arrival_end_date
        )

        transit_breakdowns.append(
            TransitTimeBreakdown(
                vessel_type_id=vt.id,
                vessel_name=vt.name,
                distance_nm=tr["distance_nm"],
                speed_knots=tr["speed_knots"],
                sailing_days=tr["sailing_days"],
                origin_loading_days=tr["origin_loading_days"],
                destination_discharge_days=tr["destination_discharge_days"],
                congestion_waiting_days=tr["congestion_waiting_days"],
                total_transit_days=tr["total_transit_days"],
                estimated_departure_date=tr["estimated_departure_date"],
                estimated_arrival_date=tr["estimated_arrival_date"],
                deadline_fit_status=tr["deadline_fit_status"]
            )
        )

        vessel_feasibility_list.append(
            RecommendationOptionSchema(
                vessel_type_id=vt.id,
                vessel_name=vt.name,
                min_capacity_mt=vt.min_capacity_mt,
                max_capacity_mt=vt.max_capacity_mt,
                typical_draft_m=vt.typical_draft_m,
                typical_loa_m=vt.typical_loa_m,
                typical_beam_m=vt.typical_beam_m,
                speed_knots=vt.speed_knots,
                feasible=feas["feasible"],
                feasibility_status=feas["feasibility_status"],
                estimated_rate_usd_per_mt=None,
                estimated_total_cost_usd=None,
                risk_level=feas["risk_level"],
                recommendation_rank=1 if vt.id == rec.recommended_vessel_type_id else None,
                reasons=feas["reasons"],
                capacity_fit_score=feas["capacity_fit_score"],
                capacity_fit_label=feas["capacity_fit_label"]
            )
        )

    return FeasibilityDetailsResponse(
        recommendation_id=rec.id,
        route_id=route.id,
        distance_nm=route.distance_nm,
        origin_port=PortConstraintDetail(
            port_id=origin.id,
            port_name=origin.name,
            country=origin.country,
            port_role=origin.port_role,
            max_draft_m=origin_berth.max_draft_m,
            max_loa_m=origin_berth.max_loa_m,
            max_beam_m=origin_berth.max_beam_m,
            handling_rate_mt_per_day=origin_berth.handling_rate_mt_per_day,
            source_label=origin_berth.source_label
        ),
        destination_port=PortConstraintDetail(
            port_id=dest.id,
            port_name=dest.name,
            country=dest.country,
            port_role=dest.port_role,
            max_draft_m=dest_berth.max_draft_m,
            max_loa_m=dest_berth.max_loa_m,
            max_beam_m=dest_berth.max_beam_m,
            handling_rate_mt_per_day=dest_berth.handling_rate_mt_per_day,
            source_label=dest_berth.source_label
        ),
        vessel_feasibility=vessel_feasibility_list,
        transit_breakdowns=transit_breakdowns,
        arrival_window_start=req.arrival_start_date,
        arrival_window_end=req.arrival_end_date,
        data_provenance=ProvenanceSummary(
            ports_and_berths=settings.PROVENANCE_OFFICIAL,
            freight_rates=settings.PROVENANCE_HISTORICAL,
            congestion_data=settings.PROVENANCE_SIMULATED,
            forecast_engine="Feasibility & Geometric Hull Clearance Engine",
            scenario_assumptions=settings.PROVENANCE_ASSUMPTION
        ),
        disclaimer="Port values shown are prototype configuration data. Current berth-level operational notices must be validated before real-world use."
    )


@router.get("/{recommendation_id}/risks", response_model=RiskDetailsResponse)
def get_risk_details(
    recommendation_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve detailed risk scores, weightings, and actionable alerts."""
    rec = RecommendationRepository.get_by_id(db, recommendation_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")

    alerts: list[RiskAlertSchema] = []
    for a in rec.risk_alerts:
        alerts.append(
            RiskAlertSchema(
                risk_type=a.risk_type,
                severity=a.severity,
                title=a.title,
                message=a.message,
                impact=a.impact,
                suggested_action=a.suggested_action,
                source_label=a.source_label
            )
        )

    w = settings.risk_weights
    return RiskDetailsResponse(
        recommendation_id=rec.id,
        overall_risk=rec.overall_risk,
        overall_risk_score=rec.overall_risk_score,
        risk_weights={
            "market_volatility": w.market_volatility,
            "port_congestion": w.port_congestion,
            "deadline_pressure": w.deadline_pressure,
            "idle_time_exposure": w.idle_time_exposure
        },
        risk_breakdown_scores={
            "volatility_score": 45.0,
            "congestion_score": 52.0,
            "deadline_score": 40.0,
            "idle_compat_score": 25.0
        },
        alerts=alerts,
        data_provenance=ProvenanceSummary(
            ports_and_berths=settings.PROVENANCE_OFFICIAL,
            freight_rates=settings.PROVENANCE_HISTORICAL,
            congestion_data=settings.PROVENANCE_SIMULATED,
            forecast_engine="Weighted Multi-Factor Risk Assessment Engine",
            scenario_assumptions=settings.PROVENANCE_ASSUMPTION
        )
    )
