"""Integration tests for Recommendation Generation API."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.database import SessionLocal
from app.seed.seed_data import seed_database

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    db = SessionLocal()
    seed_database(db)
    db.close()


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "FreightIQ API"


def test_get_ports_and_vessels():
    p_res = client.get("/v1/ports")
    assert p_res.status_code == 200
    assert len(p_res.json()) >= 4

    v_res = client.get("/v1/vessel-types")
    assert v_res.status_code == 200
    assert len(v_res.json()) == 4


def test_default_demo_recommendation():
    payload = {
        "cargo_type": "COKING_COAL",
        "cargo_quantity_mt": 75000,
        "origin_port_id": "NEWCASTLE_AU",
        "destination_port_id": "PARADIP_IN",
        "arrival_start_date": "2026-10-10",
        "arrival_end_date": "2026-10-20",
        "contract_preference": "SHORT_TERM_MULTIPLE_VOYAGE",
        "contract_duration_days": 90,
        "urgency": "HIGH"
    }

    res = client.post("/v1/recommendations", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["recommended_vessel_type_id"] == "PANAMAX"
    assert data["recommended_contract_strategy"] == "SHORT_TERM_MULTIPLE_VOYAGE"
    assert len(data["reasons"]) >= 3
    assert len(data["vessel_options"]) == 4

    # Verify Capesize is rejected
    capesize_opt = next(v for v in data["vessel_options"] if v["vessel_type_id"] == "CAPESIZE")
    assert capesize_opt["feasible"] is False
    assert capesize_opt["feasibility_status"] == "REJECTED"


def test_unsupported_corridor_validation():
    payload = {
        "cargo_type": "COKING_COAL",
        "cargo_quantity_mt": 75000,
        "origin_port_id": "MAPUTO_MZ",
        "destination_port_id": "HALDIA_IN",
        "arrival_start_date": "2026-10-10",
        "arrival_end_date": "2026-10-20",
        "contract_preference": "SPOT_CONTRACT",
        "contract_duration_days": 90,
        "urgency": "HIGH"
    }

    res = client.post("/v1/recommendations", json=payload)
    assert res.status_code == 422
    assert "not included in the current prototype dataset" in res.json()["detail"]
