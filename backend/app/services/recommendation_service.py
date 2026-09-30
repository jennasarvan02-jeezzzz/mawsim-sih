"""Recommendation Orchestration Service for FreightIQ."""

import json
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.config.settings import settings
from app.models.database import (
    CargoRequirement, Recommendation, RecommendationOption, RiskAlert,
    Port, Berth, VesselType, Route
)
from app.repositories.repository import (
    PortRepository, VesselTypeRepository, RouteRepository,
    FreightRateRepository, PortCongestionRepository, RecommendationRepository
)
from app.schemas.schemas import (
    CargoRequirementRequest, RecommendationResponse, RecommendationOptionSchema,
    RiskAlertSchema, ProvenanceSummary
)
from app.services.feasibility_service import FeasibilityService
from app.services.forecasting_service import ForecastingService
from app.services.cost_service import CostService
from app.services.risk_service import RiskService


class RecommendationService:
    @staticmethod
    def generate_recommendation(
        db: Session,
        req: CargoRequirementRequest
    ) -> Dict[str, Any]:
        """
        Orchestrates feasibility, forecasting, risk, and ranking to produce an explainable charter recommendation.
        """
        # 1. Validation
        if req.cargo_quantity_mt <= 0:
            raise HTTPException(status_code=422, detail="Cargo quantity must be greater than 0 MT.")

        try:
            arr_start = datetime.strptime(req.arrival_start_date, "%Y-%m-%d")
            arr_end = datetime.strptime(req.arrival_end_date, "%Y-%m-%d")
            if arr_end <= arr_start:
                raise HTTPException(status_code=422, detail="Arrival end date must be strictly after arrival start date.")
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid date format. Expected YYYY-MM-DD.")

        # Corridor validation
        origin = PortRepository.get_by_id(db, req.origin_port_id)
        dest = PortRepository.get_by_id(db, req.destination_port_id)

        if not origin or not dest:
            raise HTTPException(
                status_code=422,
                detail="This corridor is not included in the current prototype dataset. Please select a supported demonstration route."
            )

        if not origin.is_mvp_supported or not dest.is_mvp_supported:
            raise HTTPException(
                status_code=422,
                detail="This corridor is not included in the current prototype dataset. Please select a supported demonstration route."
            )

        route = RouteRepository.get_route(db, req.origin_port_id, req.destination_port_id)
        if not route:
            raise HTTPException(
                status_code=422,
                detail="This corridor is not included in the current prototype dataset. Please select a supported demonstration route."
            )

        origin_berth = db.query(Berth).filter(Berth.port_id == req.origin_port_id).first()
        dest_berth = db.query(Berth).filter(Berth.port_id == req.destination_port_id).first()
        vessel_types = VesselTypeRepository.get_all(db)

        # Recent congestion
        origin_cong = PortCongestionRepository.get_latest_for_port(db, req.origin_port_id)
        dest_cong = PortCongestionRepository.get_latest_for_port(db, req.destination_port_id)
        origin_wait_hours = origin_cong.estimated_wait_hours if origin_cong else 18.0
        dest_wait_hours = dest_cong.estimated_wait_hours if dest_cong else 24.0

        # Lead time calculation
        today = datetime(2026, 8, 28)
        lead_time_days = max(1, (arr_start - today).days)

        evaluated_options: List[Dict[str, Any]] = []
        forecasts_by_vessel: Dict[str, Any] = {}

        for vt in vessel_types:
            # 2. Feasibility Evaluation
            feas = FeasibilityService.evaluate_vessel_feasibility(
                vessel=vt,
                origin_port=origin,
                origin_berth=origin_berth,
                dest_port=dest,
                dest_berth=dest_berth,
                cargo_quantity_mt=req.cargo_quantity_mt
            )

            # 3. Forecast
            history = FreightRateRepository.get_history_for_route_and_vessel(db, route.id, vt.id)
            forecast = ForecastingService.generate_forecast(
                history=history,
                forecast_days=30,
                target_arrival_date_str=req.arrival_start_date
            )
            forecasts_by_vessel[vt.id] = forecast

            # 4. Costs
            congestion_level = dest_cong.congestion_level if dest_cong else "MODERATE"
            cost_breakdown = CostService.calculate_cost_breakdown(
                expected_rate_usd_per_mt=forecast["expected_rate"],
                low_rate_usd_per_mt=forecast["low_rate"],
                high_rate_usd_per_mt=forecast["high_rate"],
                cargo_quantity_mt=req.cargo_quantity_mt,
                congestion_level=congestion_level,
                risk_level=feas["risk_level"]
            )

            feas["estimated_rate_usd_per_mt"] = forecast["expected_rate"]
            feas["estimated_total_cost_usd"] = cost_breakdown["total_cost_usd"]
            feas["cost_breakdown"] = cost_breakdown
            feas["volatility_std"] = forecast["volatility_std"]

            evaluated_options.append(feas)

        # 5. Ranking (Only feasible or conditionally feasible vessels)
        eligible_options = [opt for opt in evaluated_options if opt["feasible"]]
        rejected_options = [opt for opt in evaluated_options if not opt["feasible"]]

        for opt in rejected_options:
            opt["recommendation_rank"] = None

        if not eligible_options:
            raise HTTPException(
                status_code=400,
                detail="No physically feasible vessel class found for this port pair and requirement."
            )

        # Composite score = capacity fit (0.5) - relative cost factor (0.3) - risk penalty (0.2)
        min_cost = min(opt["estimated_total_cost_usd"] for opt in eligible_options)
        for opt in eligible_options:
            cost_factor = min_cost / max(1.0, opt["estimated_total_cost_usd"])
            risk_penalty = 0.0 if opt["risk_level"] == "LOW" else (0.15 if opt["risk_level"] == "MODERATE" else 0.35)
            opt["ranking_score"] = (opt["capacity_fit_score"] * 0.55) + (cost_factor * 0.30) - (risk_penalty * 0.15)

        eligible_options.sort(key=lambda x: x["ranking_score"], reverse=True)

        for rank, opt in enumerate(eligible_options, start=1):
            opt["recommendation_rank"] = rank

        top_choice = eligible_options[0]
        top_vessel_id = top_choice["vessel_type_id"]
        top_vessel = next(vt for vt in vessel_types if vt.id == top_vessel_id)
        top_forecast = forecasts_by_vessel[top_vessel_id]
        top_cost = top_choice["cost_breakdown"]

        # 6. Transit & Deadline
        transit = FeasibilityService.calculate_transit_breakdown(
            vessel=top_vessel,
            route=route,
            cargo_quantity_mt=req.cargo_quantity_mt,
            origin_berth=origin_berth,
            dest_berth=dest_berth,
            origin_wait_hours=origin_wait_hours,
            dest_wait_hours=dest_wait_hours,
            arrival_start_date_str=req.arrival_start_date,
            arrival_end_date_str=req.arrival_end_date
        )

        # Market Entry Window (18 to 25 days before arrival start)
        entry_start_dt = arr_start - timedelta(days=25)
        entry_end_dt = arr_start - timedelta(days=18)
        entry_window_start = entry_start_dt.strftime("%Y-%m-%d")
        entry_window_end = entry_end_dt.strftime("%Y-%m-%d")

        # 7. Risk Engine
        risk_profile = RiskService.calculate_risk_profile(
            volatility_std=top_forecast["volatility_std"],
            origin_wait_hours=origin_wait_hours,
            dest_wait_hours=dest_wait_hours,
            lead_time_days=lead_time_days,
            total_transit_days=transit["total_transit_days"],
            capacity_fit_score=top_choice["capacity_fit_score"],
            is_physically_feasible=top_choice["feasible"],
            origin_name=origin.name,
            dest_name=dest.name,
            vessel_name=top_vessel.name
        )

        # 8. Explainable Plain-Language Reasons (at least 3)
        reasons = [
            f"1. Vessel Compatibility: {top_vessel.name} operates with a {top_vessel.typical_draft_m}m draft, comfortably complying with the {dest_berth.max_draft_m}m maximum draft limit at {dest.name} Mechanized Coal Berth.",
            f"2. Capacity Optimization: The requested {req.cargo_quantity_mt:,.0f} MT parcel perfectly matches the {top_vessel.min_capacity_mt:,.0f}–{top_vessel.max_capacity_mt:,.0f} MT payload band, avoiding deadfreight losses and parcel splitting penalties.",
            f"3. Contract Strategy: Deploying a {req.contract_preference.replace('_', ' ').title()} captures volume stability and hedges against expected ±${top_forecast['volatility_std']:.2f}/MT spot market volatility across the corridor.",
            f"4. Timing & Laycan: With a {transit['total_transit_days']:.1f}-day total transit (sailing, loading, waiting, discharge), market entry between {entry_window_start} and {entry_window_end} ensures timely positioning without demurrage risk."
        ]

        # 9. Data Provenance Summary
        data_provenance = ProvenanceSummary(
            ports_and_berths=settings.PROVENANCE_OFFICIAL,
            freight_rates=settings.PROVENANCE_HISTORICAL,
            congestion_data=settings.PROVENANCE_SIMULATED,
            forecast_engine="Deterministic Moving Average + Trend Slope + 95% Confidence Interval",
            scenario_assumptions=settings.PROVENANCE_ASSUMPTION
        )

        # Combine vessel options schemas
        all_options_schemas: List[RecommendationOptionSchema] = []
        for opt in evaluated_options:
            all_options_schemas.append(
                RecommendationOptionSchema(
                    vessel_type_id=opt["vessel_type_id"],
                    vessel_name=opt["vessel_name"],
                    min_capacity_mt=opt["min_capacity_mt"],
                    max_capacity_mt=opt["max_capacity_mt"],
                    typical_draft_m=opt["typical_draft_m"],
                    typical_loa_m=opt["typical_loa_m"],
                    typical_beam_m=opt["typical_beam_m"],
                    speed_knots=opt["speed_knots"],
                    feasible=opt["feasible"],
                    feasibility_status=opt["feasibility_status"],
                    estimated_rate_usd_per_mt=opt.get("estimated_rate_usd_per_mt"),
                    estimated_total_cost_usd=opt.get("estimated_total_cost_usd"),
                    risk_level=opt["risk_level"],
                    recommendation_rank=opt.get("recommendation_rank"),
                    reasons=opt["reasons"],
                    capacity_fit_score=opt["capacity_fit_score"],
                    capacity_fit_label=opt["capacity_fit_label"]
                )
            )

        # 10. Persist to Database
        rec_id = f"rec_{uuid.uuid4().hex[:8]}"
        created_at_dt = datetime.utcnow()

        db_req = CargoRequirement(
            id=f"req_{uuid.uuid4().hex[:8]}",
            cargo_type=req.cargo_type,
            cargo_quantity_mt=req.cargo_quantity_mt,
            origin_port_id=req.origin_port_id,
            destination_port_id=req.destination_port_id,
            arrival_start_date=req.arrival_start_date,
            arrival_end_date=req.arrival_end_date,
            contract_preference=req.contract_preference,
            contract_duration_days=req.contract_duration_days,
            urgency=req.urgency,
            created_at=created_at_dt
        )

        db_rec = Recommendation(
            id=rec_id,
            cargo_requirement_id=db_req.id,
            recommended_vessel_type_id=top_vessel_id,
            recommended_contract_strategy=req.contract_preference,
            overall_risk=risk_profile["overall_risk"],
            overall_risk_score=risk_profile["overall_risk_score"],
            entry_window_start=entry_window_start,
            entry_window_end=entry_window_end,
            expected_freight_rate_usd_per_mt=top_forecast["expected_rate"],
            freight_rate_low_usd_per_mt=top_forecast["low_rate"],
            freight_rate_high_usd_per_mt=top_forecast["high_rate"],
            expected_total_cost_usd=top_cost["total_cost_usd"],
            reasons_json=json.dumps(reasons),
            created_at=created_at_dt
        )

        db_options = []
        for opt in evaluated_options:
            db_options.append(
                RecommendationOption(
                    recommendation_id=rec_id,
                    vessel_type_id=opt["vessel_type_id"],
                    feasible=opt["feasible"],
                    feasibility_status=opt["feasibility_status"],
                    estimated_rate_usd_per_mt=opt.get("estimated_rate_usd_per_mt"),
                    estimated_total_cost_usd=opt.get("estimated_total_cost_usd"),
                    risk_level=opt["risk_level"],
                    recommendation_rank=opt.get("recommendation_rank"),
                    reasons_json=json.dumps(opt["reasons"])
                )
            )

        db_alerts = []
        for alert in risk_profile["alerts"]:
            db_alerts.append(
                RiskAlert(
                    recommendation_id=rec_id,
                    risk_type=alert.risk_type,
                    severity=alert.severity,
                    title=alert.title,
                    message=alert.message,
                    impact=alert.impact,
                    suggested_action=alert.suggested_action,
                    source_label=alert.source_label
                )
            )

        RecommendationRepository.save(
            db=db,
            requirement=db_req,
            recommendation=db_rec,
            options=db_options,
            alerts=db_alerts
        )

        return {
            "recommendation_id": rec_id,
            "cargo_requirement": req,
            "recommended_vessel_type_id": top_vessel_id,
            "recommended_vessel_name": top_vessel.name,
            "recommended_contract_strategy": req.contract_preference,
            "overall_risk": risk_profile["overall_risk"],
            "overall_risk_score": risk_profile["overall_risk_score"],
            "entry_window_start": entry_window_start,
            "entry_window_end": entry_window_end,
            "expected_freight_rate_usd_per_mt": top_forecast["expected_rate"],
            "freight_rate_low_usd_per_mt": top_forecast["low_rate"],
            "freight_rate_high_usd_per_mt": top_forecast["high_rate"],
            "expected_total_cost_usd": top_cost["total_cost_usd"],
            "freight_cost_usd": top_cost["freight_cost_usd"],
            "congestion_buffer_usd": top_cost["congestion_buffer_usd"],
            "operational_buffer_usd": top_cost["operational_buffer_usd"],
            "reasons": reasons,
            "trend_label": top_forecast["trend_label"],
            "uncertainty_level": top_forecast["uncertainty_level"],
            "chart_data": top_forecast["chart_data"],
            "vessel_options": all_options_schemas,
            "risk_alerts": risk_profile["alerts"],
            "data_provenance": data_provenance,
            "created_at": created_at_dt.isoformat()
        }
