"""Vessel and Port Feasibility Evaluation Engine."""

from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta
from app.models.database import Port, Berth, VesselType, Route


class FeasibilityService:
    @staticmethod
    def evaluate_vessel_feasibility(
        vessel: VesselType,
        origin_port: Port,
        origin_berth: Berth,
        dest_port: Port,
        dest_berth: Berth,
        cargo_quantity_mt: float
    ) -> Dict[str, Any]:
        """
        Evaluates physical port compatibility and capacity fit for a single vessel class.
        Returns feasibility status, score, and plain-language explanation reasons.
        """
        reasons = []
        is_physically_feasible = True

        # 1. Draft checks
        if vessel.typical_draft_m > origin_berth.max_draft_m:
            is_physically_feasible = False
            reasons.append(
                f"Typical draft ({vessel.typical_draft_m}m) exceeds origin berth limit "
                f"({origin_berth.max_draft_m}m) at {origin_port.name}."
            )
        if vessel.typical_draft_m > dest_berth.max_draft_m:
            is_physically_feasible = False
            reasons.append(
                f"Typical draft ({vessel.typical_draft_m}m) exceeds destination berth limit "
                f"({dest_berth.max_draft_m}m) at {dest_port.name} — vessel cannot berth fully laden."
            )

        # 2. LOA checks
        if vessel.typical_loa_m > origin_berth.max_loa_m:
            is_physically_feasible = False
            reasons.append(
                f"Typical LOA ({vessel.typical_loa_m}m) exceeds origin maximum LOA "
                f"({origin_berth.max_loa_m}m) at {origin_port.name}."
            )
        if vessel.typical_loa_m > dest_berth.max_loa_m:
            is_physically_feasible = False
            reasons.append(
                f"Typical LOA ({vessel.typical_loa_m}m) exceeds destination maximum LOA "
                f"({dest_berth.max_loa_m}m) at {dest_port.name}."
            )

        # 3. Beam checks
        if vessel.typical_beam_m > origin_berth.max_beam_m:
            is_physically_feasible = False
            reasons.append(
                f"Typical beam ({vessel.typical_beam_m}m) exceeds origin berth beam limit "
                f"({origin_berth.max_beam_m}m) at {origin_port.name}."
            )
        if vessel.typical_beam_m > dest_berth.max_beam_m:
            is_physically_feasible = False
            reasons.append(
                f"Typical beam ({vessel.typical_beam_m}m) exceeds destination berth beam limit "
                f"({dest_berth.max_beam_m}m) at {dest_port.name}."
            )

        # 4. Capacity Fit Analysis
        capacity_fit_score = 0.0
        capacity_fit_label = "POOR"

        if vessel.min_capacity_mt <= cargo_quantity_mt <= vessel.max_capacity_mt:
            capacity_fit_score = 0.95
            capacity_fit_label = "OPTIMAL"
            reasons.append(
                f"Cargo parcel ({cargo_quantity_mt:,.0f} MT) perfectly aligns with "
                f"{vessel.name} capacity range ({vessel.min_capacity_mt:,.0f}–{vessel.max_capacity_mt:,.0f} MT)."
            )
        elif cargo_quantity_mt > vessel.max_capacity_mt:
            # Cargo is larger than vessel
            ratio = cargo_quantity_mt / vessel.max_capacity_mt
            if ratio <= 1.4:
                capacity_fit_score = 0.65
                capacity_fit_label = "PARTIAL_SPLIT"
                reasons.append(
                    f"Cargo parcel ({cargo_quantity_mt:,.0f} MT) moderately exceeds {vessel.name} "
                    f"max capacity ({vessel.max_capacity_mt:,.0f} MT); requires split shipment."
                )
            else:
                capacity_fit_score = 0.30
                capacity_fit_label = "SPLIT_REQUIRED"
                reasons.append(
                    f"Cargo parcel ({cargo_quantity_mt:,.0f} MT) significantly exceeds {vessel.name} "
                    f"max capacity ({vessel.max_capacity_mt:,.0f} MT); requires multiple split voyages."
                )
        else:
            # Cargo is smaller than vessel capacity (Under-utilization)
            utilization = cargo_quantity_mt / vessel.min_capacity_mt
            if utilization >= 0.75:
                capacity_fit_score = 0.70
                capacity_fit_label = "ACCEPTABLE"
                reasons.append(
                    f"Cargo parcel ({cargo_quantity_mt:,.0f} MT) is slightly below {vessel.name} "
                    f"minimum capacity ({vessel.min_capacity_mt:,.0f} MT) — minor deadfreight risk."
                )
            else:
                capacity_fit_score = 0.20
                capacity_fit_label = "SEVERE_UNDERUTILIZATION"
                reasons.append(
                    f"Cargo parcel ({cargo_quantity_mt:,.0f} MT) is far below {vessel.name} "
                    f"capacity ({vessel.min_capacity_mt:,.0f}–{vessel.max_capacity_mt:,.0f} MT); severe deadfreight penalty."
                )

        # 5. Determine Overall Feasibility Status
        if not is_physically_feasible:
            feasibility_status = "REJECTED"
            risk_level = "CRITICAL"
        elif capacity_fit_score >= 0.85:
            feasibility_status = "FEASIBLE"
            risk_level = "LOW"
            reasons.append(
                f"Full physical compatibility confirmed at both {origin_port.name} and {dest_port.name}."
            )
        elif capacity_fit_score >= 0.50:
            feasibility_status = "CONDITIONALLY_FEASIBLE"
            risk_level = "MODERATE"
        else:
            feasibility_status = "CONDITIONALLY_FEASIBLE" if is_physically_feasible else "REJECTED"
            risk_level = "HIGH"

        return {
            "vessel_type_id": vessel.id,
            "vessel_name": vessel.name,
            "min_capacity_mt": vessel.min_capacity_mt,
            "max_capacity_mt": vessel.max_capacity_mt,
            "typical_draft_m": vessel.typical_draft_m,
            "typical_loa_m": vessel.typical_loa_m,
            "typical_beam_m": vessel.typical_beam_m,
            "speed_knots": vessel.speed_knots,
            "feasible": (feasibility_status in ["FEASIBLE", "CONDITIONALLY_FEASIBLE"]),
            "feasibility_status": feasibility_status,
            "risk_level": risk_level,
            "capacity_fit_score": capacity_fit_score,
            "capacity_fit_label": capacity_fit_label,
            "reasons": reasons
        }

    @staticmethod
    def calculate_transit_breakdown(
        vessel: VesselType,
        route: Route,
        cargo_quantity_mt: float,
        origin_berth: Berth,
        dest_berth: Berth,
        origin_wait_hours: float,
        dest_wait_hours: float,
        arrival_start_date_str: str,
        arrival_end_date_str: str
    ) -> Dict[str, Any]:
        """Calculates transit time components and evaluates deadline fit."""
        speed = vessel.speed_knots
        sailing_days = round(route.distance_nm / (speed * 24.0), 1)
        loading_days = round(cargo_quantity_mt / max(1000.0, origin_berth.handling_rate_mt_per_day), 1)
        discharge_days = round(cargo_quantity_mt / max(1000.0, dest_berth.handling_rate_mt_per_day), 1)
        congestion_waiting_days = round((origin_wait_hours + dest_wait_hours) / 24.0, 1)

        total_transit_days = round(sailing_days + loading_days + discharge_days + congestion_waiting_days, 1)

        # Estimate required departure and arrival
        arrival_start = datetime.strptime(arrival_start_date_str, "%Y-%m-%d")
        arrival_end = datetime.strptime(arrival_end_date_str, "%Y-%m-%d")
        
        # Latest target arrival is arrival_start
        required_departure = arrival_start - timedelta(days=total_transit_days)
        estimated_arrival = required_departure + timedelta(days=total_transit_days)

        # Deadline Fit Status
        today = datetime(2026, 8, 28)
        lead_time_days = (required_departure - today).days

        if lead_time_days < 7:
            deadline_fit_status = "TIGHT"
        elif lead_time_days < 0:
            deadline_fit_status = "RISK_OF_DELAY"
        else:
            deadline_fit_status = "ON_TIME"

        return {
            "vessel_type_id": vessel.id,
            "vessel_name": vessel.name,
            "distance_nm": route.distance_nm,
            "speed_knots": speed,
            "sailing_days": sailing_days,
            "origin_loading_days": loading_days,
            "destination_discharge_days": discharge_days,
            "congestion_waiting_days": congestion_waiting_days,
            "total_transit_days": total_transit_days,
            "estimated_departure_date": required_departure.strftime("%Y-%m-%d"),
            "estimated_arrival_date": estimated_arrival.strftime("%Y-%m-%d"),
            "deadline_fit_status": deadline_fit_status
        }
