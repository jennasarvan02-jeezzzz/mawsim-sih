"""Unit tests for Risk Scoring and Alert Generator."""

import pytest
from app.services.risk_service import RiskService


def test_composite_risk_score_and_alert_structure():
    risk_profile = RiskService.calculate_risk_profile(
        volatility_std=1.2,
        origin_wait_hours=18.0,
        dest_wait_hours=24.0,
        lead_time_days=45,
        total_transit_days=21.5,
        capacity_fit_score=0.95,
        is_physically_feasible=True,
        origin_name="Newcastle Port",
        dest_name="Paradip Port",
        vessel_name="Panamax"
    )

    assert 0 <= risk_profile["overall_risk_score"] <= 100
    assert risk_profile["overall_risk"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert len(risk_profile["alerts"]) >= 5
    assert any(a.risk_type == "MARKET_VOLATILITY" for a in risk_profile["alerts"])
    assert any(a.risk_type == "VESSEL_PORT_COMPATIBILITY" for a in risk_profile["alerts"])
