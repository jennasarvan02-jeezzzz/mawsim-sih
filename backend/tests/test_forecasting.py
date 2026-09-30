"""Unit tests for Freight Forecasting Engine."""

import pytest
from app.models.database import FreightRateHistory
from app.services.forecasting_service import ForecastingService


def test_forecast_generation_and_confidence_interval():
    # Sample 30 daily data points
    history = [
        FreightRateHistory(
            id=i,
            route_id="NEWCASTLE_AU__PARADIP_IN",
            vessel_type_id="PANAMAX",
            date=f"2026-08-{i:02d}",
            rate_usd_per_mt=28.0 + (i * 0.05),
            source_label="Sample Historical Prototype Data"
        )
        for i in range(1, 29)
    ]

    forecast = ForecastingService.generate_forecast(
        history=history,
        forecast_days=30,
        target_arrival_date_str="2026-09-15"
    )

    assert "expected_rate" in forecast
    assert "low_rate" in forecast
    assert "high_rate" in forecast
    assert forecast["low_rate"] <= forecast["expected_rate"] <= forecast["high_rate"]
    assert forecast["trend_label"] in ["RISING", "STABLE", "FALLING"]
    assert len(forecast["chart_data"]) == 28 + 30
