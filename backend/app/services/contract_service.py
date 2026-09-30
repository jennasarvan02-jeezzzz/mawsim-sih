"""Multi-Voyage Contract Planning and Scenario Comparison Service."""

from typing import Dict, Any, List
from datetime import datetime, timedelta
import uuid
from app.config.settings import settings
from app.models.database import ContractPlan, ContractVoyage
from app.schemas.schemas import ContractPlanResponse, ContractScenarioComparison, ContractVoyageSchema


class ContractService:
    @staticmethod
    def generate_contract_plan(
        recommendation_id: str,
        contract_duration_days: int,
        voyage_count: int,
        total_cargo_quantity_mt: float,
        vessel_type_id: str,
        vessel_name: str,
        base_rate_usd_per_mt: float,
        origin_port_id: str = "NEWCASTLE_AU",
        destination_port_id: str = "PARADIP_IN",
        start_date_str: str = "2026-09-01"
    ) -> Dict[str, Any]:
        """
        Generates a 90-day multi-voyage plan and compares repeated spot booking vs contracted multi-voyage COA.
        """
        plan_id = f"plan_{uuid.uuid4().hex[:8]}"
        cargo_per_voyage = round(total_cargo_quantity_mt / max(1, voyage_count), 0)

        # Rate calculations
        spot_penalty_pct = settings.contract_config.spot_volatility_penalty_pct  # +6%
        contract_discount_pct = settings.contract_config.multi_voyage_discount_pct  # -4%

        spot_rate = round(base_rate_usd_per_mt * (1.0 + spot_penalty_pct), 2)
        contract_rate = round(base_rate_usd_per_mt * (1.0 - contract_discount_pct), 2)

        spot_total_cost = round(spot_rate * total_cargo_quantity_mt, 2)
        contract_total_cost = round(contract_rate * total_cargo_quantity_mt, 2)

        estimated_savings_usd = round(spot_total_cost - contract_total_cost, 2)
        estimated_savings_percent = round((estimated_savings_usd / spot_total_cost) * 100.0, 2)

        # Scenarios
        spot_scenario = ContractScenarioComparison(
            scenario_name="Repeated Spot Booking",
            total_cost_usd=spot_total_cost,
            average_rate_usd_per_mt=spot_rate,
            volatility_risk_level="HIGH",
            operational_reliability_pct=settings.contract_config.spot_reliability_pct,
            freight_buffer_applied_pct=round(spot_penalty_pct * 100, 1),
            berth_priority_guarantee=False
        )

        contract_scenario = ContractScenarioComparison(
            scenario_name="Structured Multi-Voyage Contract (COA)",
            total_cost_usd=contract_total_cost,
            average_rate_usd_per_mt=contract_rate,
            volatility_risk_level="LOW",
            operational_reliability_pct=settings.contract_config.multi_voyage_reliability_pct,
            freight_buffer_applied_pct=round(-contract_discount_pct * 100, 1),
            berth_priority_guarantee=True
        )

        # Voyage Schedule Generation
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        voyage_interval_days = max(15, int(contract_duration_days / voyage_count))

        voyages: List[ContractVoyageSchema] = []
        for v_num in range(1, voyage_count + 1):
            v_start = start_date + timedelta(days=(v_num - 1) * voyage_interval_days)
            v_end = v_start + timedelta(days=5)

            voyage_cost = round(contract_rate * cargo_per_voyage, 2)
            voyages.append(
                ContractVoyageSchema(
                    voyage_number=v_num,
                    departure_window_start=v_start.strftime("%Y-%m-%d"),
                    departure_window_end=v_end.strftime("%Y-%m-%d"),
                    origin_port_id=origin_port_id,
                    destination_port_id=destination_port_id,
                    cargo_quantity_mt=cargo_per_voyage,
                    estimated_cost_usd=voyage_cost,
                    risk_level="LOW" if v_num <= 2 else "MODERATE"
                )
            )

        # Reasons
        reasons = [
            f"Multi-voyage commitment for {total_cargo_quantity_mt:,.0f} MT secures an estimated {estimated_savings_percent:.1f}% freight discount over volatile spot fixtures.",
            f"Pre-scheduled {voyage_count} voyage rotations over {contract_duration_days} days insulate plant coking coal inventory from short-term spot positioning spikes.",
            f"Contract of Affreightment (COA) guarantees tonnage allocation, raising operational reliability from {settings.contract_config.spot_reliability_pct}% (spot) to {settings.contract_config.multi_voyage_reliability_pct}% (contract)."
        ]

        # Assumptions
        assumptions = [
            f"Spot scenario incorporates a +{spot_penalty_pct*100:.1f}% volatility/positioning risk premium.",
            f"Multi-voyage contract includes a -{contract_discount_pct*100:.1f}% volume commitment rate reduction.",
            f"Even distribution of {cargo_per_voyage:,.0f} MT per voyage across {voyage_count} planned cycles.",
            "Demurrage and bunker adjustment factor (BAF) terms assumed indexed to standard Baltic exchange guidelines."
        ]

        disclaimer = (
            "All values are prototype scenario estimates, not commercial quotations or guaranteed savings. "
            "Actual charter party terms require bilateral commercial negotiations and formal fixture recap confirmation."
        )

        return {
            "contract_plan_id": plan_id,
            "recommendation_id": recommendation_id,
            "duration_days": contract_duration_days,
            "voyage_count": voyage_count,
            "total_cargo_quantity_mt": total_cargo_quantity_mt,
            "cargo_quantity_per_voyage_mt": cargo_per_voyage,
            "vessel_type_id": vessel_type_id,
            "vessel_name": vessel_name,
            "voyages_schedule": voyages,
            "spot_scenario": spot_scenario,
            "contract_scenario": contract_scenario,
            "estimated_savings_usd": estimated_savings_usd,
            "estimated_savings_percent": estimated_savings_percent,
            "reasons": reasons,
            "assumptions": assumptions,
            "disclaimer": disclaimer,
            "created_at": datetime.utcnow().isoformat()
        }
