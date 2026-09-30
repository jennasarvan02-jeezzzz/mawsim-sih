"""Risk Assessment and Alert Generation Engine."""

from typing import List, Dict, Any, Tuple
from app.config.settings import settings
from app.schemas.schemas import RiskAlertSchema


class RiskService:
    @staticmethod
    def calculate_risk_profile(
        volatility_std: float,
        origin_wait_hours: float,
        dest_wait_hours: float,
        lead_time_days: int,
        total_transit_days: float,
        capacity_fit_score: float,
        is_physically_feasible: bool,
        origin_name: str,
        dest_name: str,
        vessel_name: str
    ) -> Dict[str, Any]:
        """
        Calculates 0-100 composite risk score and generates structured risk alerts.
        """
        # 1. Component scores (0 - 100)
        # Volatility: std 0.5 -> 20, std 1.5 -> 50, std 3.0 -> 100
        volatility_score = min(100.0, max(10.0, (volatility_std / 2.5) * 100.0))

        # Congestion: combined wait hours (e.g., 18 + 26 = 44 hrs -> ~65/100)
        total_wait_hours = origin_wait_hours + dest_wait_hours
        congestion_score = min(100.0, max(15.0, (total_wait_hours / 60.0) * 100.0))

        # Deadline pressure:
        slack_days = lead_time_days - total_transit_days
        if slack_days < 0:
            deadline_score = 95.0
        elif slack_days < 5:
            deadline_score = 75.0
        elif slack_days < 12:
            deadline_score = 50.0
        else:
            deadline_score = 20.0

        # Idle time & Compatibility exposure
        if not is_physically_feasible:
            idle_compat_score = 100.0
        elif capacity_fit_score >= 0.85:
            idle_compat_score = 20.0
        elif capacity_fit_score >= 0.50:
            idle_compat_score = 55.0
        else:
            idle_compat_score = 85.0

        # 2. Weighted composite score
        w = settings.risk_weights
        composite_score = round(
            (w.market_volatility * volatility_score) +
            (w.port_congestion * congestion_score) +
            (w.deadline_pressure * deadline_score) +
            (w.idle_time_exposure * idle_compat_score),
            1
        )

        # 3. Overall Category
        if composite_score <= 30.0:
            overall_category = "LOW"
        elif composite_score <= 60.0:
            overall_category = "MODERATE"
        elif composite_score <= 80.0:
            overall_category = "HIGH"
        else:
            overall_category = "CRITICAL"

        # 4. Generate Structured Alert Cards
        alerts: List[RiskAlertSchema] = []

        # Market Volatility Alert
        vol_sev = "LOW" if volatility_score <= 35 else ("MODERATE" if volatility_score <= 65 else "HIGH")
        alerts.append(
            RiskAlertSchema(
                risk_type="MARKET_VOLATILITY",
                severity=vol_sev,
                title="Freight Market Spot Volatility",
                message=f"Spot rates exhibit dynamic fluctuations with a standard deviation of ±${volatility_std:.2f}/MT over recent sample series.",
                impact=f"Unhedged spot bookings carry a potential ±${volatility_std * 75000:,.0f} budget variance for a 75,000 MT shipment.",
                suggested_action="Consider securing fixed-rate multiple-voyage contracts (COA) or locking a 15–20 day forward entry window.",
                source_label=settings.PROVENANCE_HISTORICAL
            )
        )

        # Port Congestion Alert
        cong_sev = "LOW" if congestion_score <= 35 else ("MODERATE" if congestion_score <= 65 else "HIGH")
        alerts.append(
            RiskAlertSchema(
                risk_type="PORT_CONGESTION",
                severity=cong_sev,
                title=f"Port Turnaround & Congestion at {dest_name}",
                message=f"Simulated queue data indicates estimated waiting time of ~{dest_wait_hours:.0f}h at {dest_name} and ~{origin_wait_hours:.0f}h at {origin_name}.",
                impact="Potential demurrage exposure and berth queuing delays affecting planned arrival laydays.",
                suggested_action="Coordinate ETA closely with terminal mechanized coal berth scheduling to request prioritized berthing window.",
                source_label=settings.PROVENANCE_SIMULATED
            )
        )

        # Arrival Deadline Pressure Alert
        dead_sev = "LOW" if deadline_score <= 30 else ("MODERATE" if deadline_score <= 65 else "HIGH")
        alerts.append(
            RiskAlertSchema(
                risk_type="DEADLINE_PRESSURE",
                severity=dead_sev,
                title="Laycan & Arrival Window Tightness",
                message=f"Total transit duration is {total_transit_days:.1f} days against an available preparation lead time of {lead_time_days} days.",
                impact="Late vessel arrival risks stockout at plant stockyards or contractual buyer penalties under purchase terms.",
                suggested_action="Initiate chartering fixture at least 18–22 days prior to laycan commencement to avoid spot positioning premiums.",
                source_label=settings.PROVENANCE_USER_INPUT
            )
        )

        # Vessel Idle Time Alert
        alerts.append(
            RiskAlertSchema(
                risk_type="VESSEL_IDLE_TIME",
                severity="MODERATE" if total_wait_hours > 30 else "LOW",
                title="Vessel Idle Time & Laytime Exposure",
                message=f"Anticipated cumulative port waiting and turnaround idle time is ~{total_wait_hours / 24:.1f} days across the voyage cycle.",
                impact="Additional idle days increase daily charter hire costs if contracted on time-charter terms.",
                suggested_action="Ensure clear demurrage/despatch clauses ($/day cap) are negotiated into the charter party fixture.",
                source_label=settings.PROVENANCE_ASSUMPTION
            )
        )

        # Vessel Port Compatibility Alert
        compat_sev = "CRITICAL" if not is_physically_feasible else ("MODERATE" if capacity_fit_score < 0.8 else "LOW")
        compat_msg = (
            f"{vessel_name} meets draft ({settings.PROVENANCE_OFFICIAL}) and berth envelope requirements at {origin_name} and {dest_name}."
            if is_physically_feasible
            else f"{vessel_name} violates physical berth restrictions at destination port ({dest_name})."
        )
        alerts.append(
            RiskAlertSchema(
                risk_type="VESSEL_PORT_COMPATIBILITY",
                severity=compat_sev,
                title=f"Berth Compatibility ({vessel_name})",
                message=compat_msg,
                impact="Physical incompatibility leads to immediate vessel rejection, redirection costs, or lighterage requirements.",
                suggested_action="Verify latest port marine department notices and official tide tables prior to fixing fixture terms.",
                source_label=settings.PROVENANCE_OFFICIAL
            )
        )

        # Data Freshness Alert
        alerts.append(
            RiskAlertSchema(
                risk_type="DATA_FRESHNESS",
                severity="LOW",
                title="Prototype Data Provenance Notice",
                message="Decision calculations are synthesized using official port configurations, historical sample series, and scenario simulation models.",
                impact="Values serve as an explainable decision-support baseline and do not represent binding commercial quotations.",
                suggested_action="Validate live operational notices and commercial broker fixtures before executing live procurement.",
                source_label=settings.PROVENANCE_ASSUMPTION
            )
        )

        return {
            "overall_risk": overall_category,
            "overall_risk_score": composite_score,
            "risk_weights": {
                "market_volatility": w.market_volatility,
                "port_congestion": w.port_congestion,
                "deadline_pressure": w.deadline_pressure,
                "idle_time_exposure": w.idle_time_exposure
            },
            "risk_breakdown_scores": {
                "volatility_score": round(volatility_score, 1),
                "congestion_score": round(congestion_score, 1),
                "deadline_score": round(deadline_score, 1),
                "idle_compat_score": round(idle_compat_score, 1)
            },
            "alerts": alerts
        }
