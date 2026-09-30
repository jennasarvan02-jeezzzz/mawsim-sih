"""Total Freight Cost and Risk Buffer Calculation Service."""

from typing import Dict, Any
from app.config.settings import settings


class CostService:
    @staticmethod
    def calculate_cost_breakdown(
        expected_rate_usd_per_mt: float,
        low_rate_usd_per_mt: float,
        high_rate_usd_per_mt: float,
        cargo_quantity_mt: float,
        congestion_level: str = "MODERATE",
        risk_level: str = "MODERATE"
    ) -> Dict[str, Any]:
        """
        Calculates base freight cost, waiting buffer, operational buffer, and uncertainty bounds.
        """
        # Base freight cost
        base_freight_cost = round(expected_rate_usd_per_mt * cargo_quantity_mt, 2)
        base_freight_cost_low = round(low_rate_usd_per_mt * cargo_quantity_mt, 2)
        base_freight_cost_high = round(high_rate_usd_per_mt * cargo_quantity_mt, 2)

        # Buffer rates
        if congestion_level == "HIGH":
            congestion_rate = settings.congestion_buffers.high
        elif congestion_level == "MODERATE":
            congestion_rate = settings.congestion_buffers.moderate
        else:
            congestion_rate = settings.congestion_buffers.low

        if risk_level in ["HIGH", "CRITICAL"]:
            operational_rate = settings.operational_buffers.high
        elif risk_level == "MODERATE":
            operational_rate = settings.operational_buffers.moderate
        else:
            operational_rate = settings.operational_buffers.low

        congestion_buffer_usd = round(base_freight_cost * congestion_rate, 2)
        operational_buffer_usd = round(base_freight_cost * operational_rate, 2)

        total_cost_usd = round(base_freight_cost + congestion_buffer_usd + operational_buffer_usd, 2)
        total_cost_low_usd = round(
            base_freight_cost_low + (base_freight_cost_low * congestion_rate) + (base_freight_cost_low * operational_rate), 2
        )
        total_cost_high_usd = round(
            base_freight_cost_high + (base_freight_cost_high * congestion_rate) + (base_freight_cost_high * operational_rate), 2
        )

        return {
            "expected_rate_usd_per_mt": expected_rate_usd_per_mt,
            "low_rate_usd_per_mt": low_rate_usd_per_mt,
            "high_rate_usd_per_mt": high_rate_usd_per_mt,
            "cargo_quantity_mt": cargo_quantity_mt,
            "freight_cost_usd": base_freight_cost,
            "congestion_buffer_usd": congestion_buffer_usd,
            "congestion_buffer_pct": round(congestion_rate * 100, 1),
            "operational_buffer_usd": operational_buffer_usd,
            "operational_buffer_pct": round(operational_rate * 100, 1),
            "total_cost_usd": total_cost_usd,
            "total_cost_low_usd": total_cost_low_usd,
            "total_cost_high_usd": total_cost_high_usd
        }
