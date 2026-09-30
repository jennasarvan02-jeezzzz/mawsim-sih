"""Contract Planning API router."""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.database import get_db, ContractPlan, ContractVoyage, Recommendation
from app.repositories.repository import ContractPlanRepository, RecommendationRepository, VesselTypeRepository
from app.schemas.schemas import ContractPlanRequest, ContractPlanResponse
from app.services.contract_service import ContractService

router = APIRouter(prefix="/v1/contract-plans", tags=["Contract Plans"])


@router.post("", response_model=ContractPlanResponse)
def create_contract_plan(
    payload: ContractPlanRequest,
    db: Session = Depends(get_db)
):
    """Generate a multi-voyage contract plan comparing repeated spot vs structured contract."""
    rec = RecommendationRepository.get_by_id(db, payload.recommendation_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Referenced recommendation not found.")

    vessel = VesselTypeRepository.get_by_id(db, payload.preferred_vessel_type)
    vessel_name = vessel.name if vessel else payload.preferred_vessel_type

    req = rec.cargo_requirement
    plan_dict = ContractService.generate_contract_plan(
        recommendation_id=payload.recommendation_id,
        contract_duration_days=payload.contract_duration_days,
        voyage_count=payload.voyage_count,
        total_cargo_quantity_mt=payload.total_cargo_quantity_mt,
        vessel_type_id=payload.preferred_vessel_type,
        vessel_name=vessel_name,
        base_rate_usd_per_mt=rec.expected_freight_rate_usd_per_mt,
        origin_port_id=req.origin_port_id,
        destination_port_id=req.destination_port_id,
        start_date_str="2026-09-01"
    )

    # Persist in SQLite
    db_plan = ContractPlan(
        id=plan_dict["contract_plan_id"],
        recommendation_id=payload.recommendation_id,
        duration_days=payload.contract_duration_days,
        voyage_count=payload.voyage_count,
        total_cargo_quantity_mt=payload.total_cargo_quantity_mt,
        vessel_type_id=payload.preferred_vessel_type,
        spot_total_cost_usd=plan_dict["spot_scenario"].total_cost_usd,
        contract_total_cost_usd=plan_dict["contract_scenario"].total_cost_usd,
        estimated_savings_usd=plan_dict["estimated_savings_usd"],
        estimated_savings_percent=plan_dict["estimated_savings_percent"],
        spot_reliability_pct=plan_dict["spot_scenario"].operational_reliability_pct,
        contract_reliability_pct=plan_dict["contract_scenario"].operational_reliability_pct,
        reasons_json=json.dumps(plan_dict["reasons"]),
        assumptions_json=json.dumps(plan_dict["assumptions"]),
        disclaimer=plan_dict["disclaimer"]
    )

    db_voyages = []
    for v in plan_dict["voyages_schedule"]:
        db_voyages.append(
            ContractVoyage(
                contract_plan_id=db_plan.id,
                voyage_number=v.voyage_number,
                departure_window_start=v.departure_window_start,
                departure_window_end=v.departure_window_end,
                origin_port_id=v.origin_port_id,
                destination_port_id=v.destination_port_id,
                cargo_quantity_mt=v.cargo_quantity_mt,
                estimated_cost_usd=v.estimated_cost_usd,
                risk_level=v.risk_level
            )
        )

    ContractPlanRepository.save(db, db_plan, db_voyages)

    return plan_dict


@router.get("/{contract_plan_id}", response_model=ContractPlanResponse)
def get_contract_plan(
    contract_plan_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve saved contract plan by ID."""
    plan = ContractPlanRepository.get_by_id(db, contract_plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Contract plan not found.")

    vessel = VesselTypeRepository.get_by_id(db, plan.vessel_type_id)
    vessel_name = vessel.name if vessel else plan.vessel_type_id

    # Reconstruct response
    from app.schemas.schemas import ContractScenarioComparison, ContractVoyageSchema

    voyages: list[ContractVoyageSchema] = []
    for v in plan.voyages:
        voyages.append(
            ContractVoyageSchema(
                voyage_number=v.voyage_number,
                departure_window_start=v.departure_window_start,
                departure_window_end=v.departure_window_end,
                origin_port_id=v.origin_port_id,
                destination_port_id=v.destination_port_id,
                cargo_quantity_mt=v.cargo_quantity_mt,
                estimated_cost_usd=v.estimated_cost_usd,
                risk_level=v.risk_level
            )
        )

    return ContractPlanResponse(
        contract_plan_id=plan.id,
        recommendation_id=plan.recommendation_id,
        duration_days=plan.duration_days,
        voyage_count=plan.voyage_count,
        total_cargo_quantity_mt=plan.total_cargo_quantity_mt,
        cargo_quantity_per_voyage_mt=round(plan.total_cargo_quantity_mt / max(1, plan.voyage_count), 0),
        vessel_type_id=plan.vessel_type_id,
        vessel_name=vessel_name,
        voyages_schedule=voyages,
        spot_scenario=ContractScenarioComparison(
            scenario_name="Repeated Spot Booking",
            total_cost_usd=plan.spot_total_cost_usd,
            average_rate_usd_per_mt=round(plan.spot_total_cost_usd / plan.total_cargo_quantity_mt, 2),
            volatility_risk_level="HIGH",
            operational_reliability_pct=plan.spot_reliability_pct,
            freight_buffer_applied_pct=6.0,
            berth_priority_guarantee=False
        ),
        contract_scenario=ContractScenarioComparison(
            scenario_name="Structured Multi-Voyage Contract (COA)",
            total_cost_usd=plan.contract_total_cost_usd,
            average_rate_usd_per_mt=round(plan.contract_total_cost_usd / plan.total_cargo_quantity_mt, 2),
            volatility_risk_level="LOW",
            operational_reliability_pct=plan.contract_reliability_pct,
            freight_buffer_applied_pct=-4.0,
            berth_priority_guarantee=True
        ),
        estimated_savings_usd=plan.estimated_savings_usd,
        estimated_savings_percent=plan.estimated_savings_percent,
        reasons=json.loads(plan.reasons_json) if plan.reasons_json else [],
        assumptions=json.loads(plan.assumptions_json) if plan.assumptions_json else [],
        disclaimer=plan.disclaimer,
        created_at=plan.created_at.isoformat() if plan.created_at else ""
    )
