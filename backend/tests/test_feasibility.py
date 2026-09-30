"""Unit tests for Vessel and Port Feasibility Rules."""

import pytest
from app.models.database import Port, Berth, VesselType, Route
from app.services.feasibility_service import FeasibilityService


@pytest.fixture
def mock_ports_and_vessels():
    origin_port = Port(id="NEWCASTLE_AU", name="Newcastle", country="Australia", port_code="AUNCW", port_role="ORIGIN", latitude=-32.9, longitude=151.7)
    origin_berth = Berth(id="B1", port_id="NEWCASTLE_AU", name="B1", max_draft_m=19.0, max_loa_m=300.0, max_beam_m=50.0, handling_rate_mt_per_day=60000.0)

    dest_port = Port(id="PARADIP_IN", name="Paradip", country="India", port_code="INPRP", port_role="DESTINATION", latitude=20.2, longitude=86.6)
    dest_berth = Berth(id="B2", port_id="PARADIP_IN", name="B2", max_draft_m=14.5, max_loa_m=300.0, max_beam_m=46.0, handling_rate_mt_per_day=45000.0)

    panamax = VesselType(
        id="PANAMAX", name="Panamax", min_capacity_mt=65000.0, max_capacity_mt=85000.0,
        typical_draft_m=13.5, typical_loa_m=230.0, typical_beam_m=32.2, speed_knots=13.0
    )

    capesize = VesselType(
        id="CAPESIZE", name="Capesize", min_capacity_mt=120000.0, max_capacity_mt=180000.0,
        typical_draft_m=17.5, typical_loa_m=290.0, typical_beam_m=45.0, speed_knots=13.0
    )

    return origin_port, origin_berth, dest_port, dest_berth, panamax, capesize


def test_panamax_feasibility_at_paradip(mock_ports_and_vessels):
    origin_p, origin_b, dest_p, dest_b, panamax, _ = mock_ports_and_vessels
    result = FeasibilityService.evaluate_vessel_feasibility(
        vessel=panamax,
        origin_port=origin_p,
        origin_berth=origin_b,
        dest_port=dest_p,
        dest_berth=dest_b,
        cargo_quantity_mt=75000.0
    )

    assert result["feasible"] is True
    assert result["feasibility_status"] == "FEASIBLE"
    assert result["capacity_fit_label"] == "OPTIMAL"
    assert result["typical_draft_m"] <= dest_b.max_draft_m


def test_capesize_rejection_at_paradip_due_to_draft(mock_ports_and_vessels):
    origin_p, origin_b, dest_p, dest_b, _, capesize = mock_ports_and_vessels
    result = FeasibilityService.evaluate_vessel_feasibility(
        vessel=capesize,
        origin_port=origin_p,
        origin_berth=origin_b,
        dest_port=dest_p,
        dest_berth=dest_b,
        cargo_quantity_mt=75000.0
    )

    assert result["feasible"] is False
    assert result["feasibility_status"] == "REJECTED"
    assert any("draft" in r.lower() and "exceeds" in r.lower() for r in result["reasons"])
