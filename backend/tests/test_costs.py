"""Unit tests for Freight Cost and Risk Buffer Calculations."""

import pytest
from app.services.cost_service import CostService


def test_cost_breakdown_calculation():
    breakdown = CostService.calculate_cost_breakdown(
        expected_rate_usd_per_mt=28.00,
        low_rate_usd_per_mt=25.00,
        high_rate_usd_per_mt=31.00,
        cargo_quantity_mt=75000.0,
        congestion_level="MODERATE",
        risk_level="MODERATE"
    )

    base_freight = 28.00 * 75000.0  # 2,100,000
    assert breakdown["freight_cost_usd"] == base_freight
    assert breakdown["congestion_buffer_usd"] > 0
    assert breakdown["operational_buffer_usd"] > 0
    assert breakdown["total_cost_usd"] > base_freight
    assert breakdown["total_cost_low_usd"] < breakdown["total_cost_usd"] < breakdown["total_cost_high_usd"]
