"""Database repository layer for FreightIQ with Supabase REST synchronization."""

import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.database import (
    Port, Berth, VesselType, Route, FreightRateHistory, PortCongestion,
    CargoRequirement, Recommendation, RecommendationOption, RiskAlert,
    ContractPlan, ContractVoyage, get_supabase_client
)

logger = logging.getLogger("uvicorn.error")


class PortRepository:
    @staticmethod
    def get_all(db: Session) -> List[Port]:
        return db.query(Port).all()

    @staticmethod
    def get_by_id(db: Session, port_id: str) -> Optional[Port]:
        return db.query(Port).filter(Port.id == port_id).first()


class VesselTypeRepository:
    @staticmethod
    def get_all(db: Session) -> List[VesselType]:
        return db.query(VesselType).all()

    @staticmethod
    def get_by_id(db: Session, vessel_type_id: str) -> Optional[VesselType]:
        return db.query(VesselType).filter(VesselType.id == vessel_type_id).first()


class RouteRepository:
    @staticmethod
    def get_route(db: Session, origin_id: str, destination_id: str) -> Optional[Route]:
        return db.query(Route).filter(
            Route.origin_port_id == origin_id,
            Route.destination_port_id == destination_id
        ).first()

    @staticmethod
    def get_all(db: Session) -> List[Route]:
        return db.query(Route).all()


class FreightRateRepository:
    @staticmethod
    def get_history_for_route_and_vessel(
        db: Session, route_id: str, vessel_type_id: str, limit: int = 90
    ) -> List[FreightRateHistory]:
        return db.query(FreightRateHistory).filter(
            FreightRateHistory.route_id == route_id,
            FreightRateHistory.vessel_type_id == vessel_type_id
        ).order_by(FreightRateHistory.date.asc()).limit(limit).all()


class PortCongestionRepository:
    @staticmethod
    def get_recent_for_port(db: Session, port_id: str, limit: int = 30) -> List[PortCongestion]:
        return db.query(PortCongestion).filter(
            PortCongestion.port_id == port_id
        ).order_by(PortCongestion.date.desc()).limit(limit).all()

    @staticmethod
    def get_latest_for_port(db: Session, port_id: str) -> Optional[PortCongestion]:
        return db.query(PortCongestion).filter(
            PortCongestion.port_id == port_id
        ).order_by(PortCongestion.date.desc()).first()


class RecommendationRepository:
    @staticmethod
    def save(
        db: Session,
        requirement: CargoRequirement,
        recommendation: Recommendation,
        options: List[RecommendationOption],
        alerts: List[RiskAlert]
    ) -> Recommendation:
        db.add(requirement)
        db.add(recommendation)
        for opt in options:
            db.add(opt)
        for alert in alerts:
            db.add(alert)
        db.commit()
        db.refresh(recommendation)

        # Optional Supabase REST Cloud Synchronization
        sb = get_supabase_client()
        if sb:
            try:
                sb.table("cargo_requirements").upsert({
                    "id": requirement.id,
                    "cargo_type": requirement.cargo_type,
                    "cargo_quantity_mt": requirement.cargo_quantity_mt,
                    "origin_port_id": requirement.origin_port_id,
                    "destination_port_id": requirement.destination_port_id,
                    "arrival_start_date": requirement.arrival_start_date,
                    "arrival_end_date": requirement.arrival_end_date,
                    "contract_preference": requirement.contract_preference,
                    "contract_duration_days": requirement.contract_duration_days,
                    "urgency": requirement.urgency,
                }).execute()

                sb.table("recommendations").upsert({
                    "id": recommendation.id,
                    "cargo_requirement_id": requirement.id,
                    "recommended_vessel_type_id": recommendation.recommended_vessel_type_id,
                    "recommended_contract_strategy": recommendation.recommended_contract_strategy,
                    "overall_risk": recommendation.overall_risk,
                    "overall_risk_score": recommendation.overall_risk_score,
                    "entry_window_start": recommendation.entry_window_start,
                    "entry_window_end": recommendation.entry_window_end,
                    "expected_freight_rate_usd_per_mt": recommendation.expected_freight_rate_usd_per_mt,
                    "freight_rate_low_usd_per_mt": recommendation.freight_rate_low_usd_per_mt,
                    "freight_rate_high_usd_per_mt": recommendation.freight_rate_high_usd_per_mt,
                    "expected_total_cost_usd": recommendation.expected_total_cost_usd,
                    "reasons_json": recommendation.reasons_json,
                }).execute()
            except Exception as e:
                logger.debug(f"Supabase Cloud sync notice: {e}")

        return recommendation

    @staticmethod
    def get_by_id(db: Session, recommendation_id: str) -> Optional[Recommendation]:
        return db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()


class ContractPlanRepository:
    @staticmethod
    def save(db: Session, plan: ContractPlan, voyages: List[ContractVoyage]) -> ContractPlan:
        db.add(plan)
        for v in voyages:
            db.add(v)
        db.commit()
        db.refresh(plan)

        # Optional Supabase REST Cloud Synchronization
        sb = get_supabase_client()
        if sb:
            try:
                sb.table("contract_plans").upsert({
                    "id": plan.id,
                    "recommendation_id": plan.recommendation_id,
                    "duration_days": plan.duration_days,
                    "voyage_count": plan.voyage_count,
                    "total_cargo_quantity_mt": plan.total_cargo_quantity_mt,
                    "vessel_type_id": plan.vessel_type_id,
                    "spot_total_cost_usd": plan.spot_total_cost_usd,
                    "contract_total_cost_usd": plan.contract_total_cost_usd,
                    "estimated_savings_usd": plan.estimated_savings_usd,
                    "estimated_savings_percent": plan.estimated_savings_percent,
                    "spot_reliability_pct": plan.spot_reliability_pct,
                    "contract_reliability_pct": plan.contract_reliability_pct,
                    "reasons_json": plan.reasons_json,
                    "assumptions_json": plan.assumptions_json,
                    "disclaimer": plan.disclaimer,
                }).execute()
            except Exception as e:
                logger.debug(f"Supabase Cloud contract sync notice: {e}")

        return plan

    @staticmethod
    def get_by_id(db: Session, plan_id: str) -> Optional[ContractPlan]:
        return db.query(ContractPlan).filter(ContractPlan.id == plan_id).first()
